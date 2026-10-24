-- Fase 5: pedidos de demostración persistidos de forma transaccional.
-- El navegador nunca escribe en orders/order_items/product_variants: llama a
-- place_demo_order(), que toma precios de la base, bloquea las variantes
-- (FOR UPDATE) para evitar carreras y descuenta stock en la misma transacción.

alter table public.orders add column if not exists idempotency_key uuid;
create unique index if not exists orders_idempotency_key_idx on public.orders (idempotency_key);

create or replace function public.place_demo_order(p_items jsonb, p_idempotency_key uuid, p_email text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing uuid;
  v_order_id uuid;
  v_item jsonb;
  v_variant_id uuid;
  v_qty integer;
  v_row record;
  v_subtotal bigint := 0;
  v_count integer := 0;
  v_email text := nullif(btrim(p_email), '');
begin
  if p_idempotency_key is null then
    raise exception 'INVALID_REQUEST' using errcode = 'P0001';
  end if;

  -- Reintento del mismo pedido: devolver el ya creado sin tocar stock.
  select id into v_existing from public.orders where idempotency_key = p_idempotency_key;
  if v_existing is not null then
    return (
      select jsonb_build_object('order_id', o.id, 'total_cents', o.total_cents, 'duplicate', true,
        'item_count', coalesce((select sum(quantity) from public.order_items where order_id = o.id), 0))
      from public.orders o where o.id = v_existing
    );
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'INVALID_ITEMS' using errcode = 'P0001';
  end if;

  if v_email is not null and (length(v_email) > 254 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'INVALID_EMAIL' using errcode = 'P0001';
  end if;

  -- Variantes repetidas en el payload se rechazan para no eludir el límite por línea.
  if (select count(distinct e->>'variant_id') from jsonb_array_elements(p_items) e) <> jsonb_array_length(p_items) then
    raise exception 'DUPLICATE_VARIANT' using errcode = 'P0001';
  end if;

  insert into public.orders (status, customer_email, subtotal_cents, total_cents, is_demo, idempotency_key)
  values ('pending', v_email, 0, 0, true, p_idempotency_key)
  returning id into v_order_id;

  -- Orden determinista de bloqueo para evitar deadlocks entre pedidos concurrentes.
  for v_item in
    select e from jsonb_array_elements(p_items) e order by e->>'variant_id'
  loop
    begin
      v_variant_id := (v_item->>'variant_id')::uuid;
      v_qty := (v_item->>'quantity')::integer;
    exception when others then
      raise exception 'INVALID_ITEMS' using errcode = 'P0001';
    end;

    if v_qty is null or v_qty < 1 or v_qty > 20 or (v_item->>'quantity')::numeric <> v_qty then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
    end if;

    select v.id, v.stock, v.size, v.color, p.id as product_id, p.name, p.brand, p.price_cents, p.status
      into v_row
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = v_variant_id
     for update of v;

    if not found or v_row.status <> 'published' then
      raise exception 'VARIANT_UNAVAILABLE:%', v_variant_id using errcode = 'P0001';
    end if;
    if v_row.stock < v_qty then
      raise exception 'INSUFFICIENT_STOCK:%:%', v_variant_id, v_row.stock using errcode = 'P0001';
    end if;

    update public.product_variants set stock = stock - v_qty where id = v_variant_id;

    insert into public.order_items (order_id, product_id, variant_id, product_name, size, color, unit_price_cents, quantity)
    values (v_order_id, v_row.product_id, v_variant_id, v_row.brand || ' ' || v_row.name, v_row.size, v_row.color, v_row.price_cents, v_qty);

    v_subtotal := v_subtotal + v_row.price_cents * v_qty;
    v_count := v_count + v_qty;
  end loop;

  update public.orders set subtotal_cents = v_subtotal, total_cents = v_subtotal where id = v_order_id;

  return jsonb_build_object('order_id', v_order_id, 'total_cents', v_subtotal, 'item_count', v_count, 'duplicate', false);
exception
  when unique_violation then
    -- Dos envíos simultáneos con la misma clave: el segundo devuelve el primero.
    return (
      select jsonb_build_object('order_id', o.id, 'total_cents', o.total_cents, 'duplicate', true,
        'item_count', coalesce((select sum(quantity) from public.order_items where order_id = o.id), 0))
      from public.orders o where o.idempotency_key = p_idempotency_key
    );
end;
$$;

revoke all on function public.place_demo_order(jsonb, uuid, text) from public;
grant execute on function public.place_demo_order(jsonb, uuid, text) to anon, authenticated;

-- Defensa en profundidad: TRUNCATE/TRIGGER/REFERENCES no están cubiertos por RLS
-- y ningún cliente los necesita.
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
