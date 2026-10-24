-- Configuración de la tienda (fila única)
create table if not exists public.store_settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null default 'SneakAR',
  legal_name text,
  tax_id text,
  legal_address text,
  contact_email text,
  contact_whatsapp text,
  shipping_enabled boolean not null default true,
  shipping_flat_cents bigint not null default 799900 check (shipping_flat_cents >= 0),
  free_shipping_threshold_cents bigint check (free_shipping_threshold_cents is null or free_shipping_threshold_cents >= 0),
  shipping_eta text not null default '3 a 7 días hábiles',
  pickup_enabled boolean not null default true,
  pickup_address text default 'A coordinar',
  pickup_hours text default 'Lunes a viernes de 10 a 18 h',
  updated_at timestamptz not null default now(),
  check (shipping_enabled or pickup_enabled)
);
insert into public.store_settings (id) values (1) on conflict do nothing;
alter table public.store_settings enable row level security;
drop policy if exists store_settings_public_read on public.store_settings;
create policy store_settings_public_read on public.store_settings for select using (true);
drop policy if exists store_settings_admin_update on public.store_settings;
create policy store_settings_admin_update on public.store_settings for update
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop trigger if exists store_settings_updated_at on public.store_settings;
create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

-- Pedidos: cliente, envío y pago
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists customer_dni text,
  add column if not exists shipping_method text,
  add column if not exists shipping_address jsonb,
  add column if not exists shipping_cents bigint not null default 0 check (shipping_cents >= 0),
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_provider text,
  add column if not exists mp_preference_id text,
  add column if not exists mp_payment_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists stock_released boolean not null default false,
  add column if not exists tracking_carrier text,
  add column if not exists tracking_code text,
  add column if not exists admin_notes text,
  add column if not exists access_token uuid not null default gen_random_uuid();
alter table public.orders alter column is_demo set default false;
alter table public.orders add constraint orders_status_check check (status in
  ('pending','paid','preparing','shipped','ready_for_pickup','fulfilled','cancelled'));
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (payment_status in
  ('pending','in_process','approved','rejected','cancelled','refunded','charged_back'));
alter table public.orders drop constraint if exists orders_shipping_method_check;
alter table public.orders add constraint orders_shipping_method_check check (shipping_method is null or shipping_method in ('delivery','pickup'));
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);
create index if not exists orders_pending_expiry_idx on public.orders (expires_at) where status = 'pending' and not stock_released;
create unique index if not exists orders_mp_payment_idx on public.orders (mp_payment_id) where mp_payment_id is not null;

-- Botón de arrepentimiento (Res. 424/2020)
create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  order_reference text not null check (length(order_reference) between 4 and 64),
  full_name text not null check (length(full_name) between 2 and 120),
  email text not null check (length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or length(phone) <= 40),
  reason text check (reason is null or length(reason) <= 1000),
  status text not null default 'received' check (status in ('received','in_review','resolved','rejected')),
  created_at timestamptz not null default now()
);
alter table public.withdrawal_requests enable row level security;
drop policy if exists withdrawal_admin_all on public.withdrawal_requests;
create policy withdrawal_admin_all on public.withdrawal_requests for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Devuelve el stock de un pedido una sola vez
create or replace function public.release_order_stock(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.product_variants v set stock = v.stock + oi.quantity
    from public.order_items oi, public.orders o
   where o.id = p_order_id and oi.order_id = o.id and v.id = oi.variant_id and not o.stock_released;
  update public.orders set stock_released = true where id = p_order_id;
end; $$;

create or replace function public.expire_stale_orders()
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0;
begin
  for r in select id from public.orders
    where status = 'pending' and not stock_released and expires_at is not null and expires_at < now()
    for update skip locked
  loop
    perform public.release_order_stock(r.id);
    update public.orders set status = 'cancelled',
      payment_status = case when payment_status in ('pending','in_process') then 'cancelled' else payment_status end
     where id = r.id;
    n := n + 1;
  end loop;
  return n;
end; $$;

-- Pedido real: precios y envío calculados en la base, stock reservado
create or replace function public.place_order(
  p_items jsonb, p_idempotency_key uuid, p_customer jsonb, p_shipping_method text, p_address jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_existing uuid; v_order_id uuid; v_item jsonb; v_variant_id uuid; v_qty integer; v_row record;
  v_subtotal bigint := 0; v_count integer := 0; v_shipping bigint := 0; s public.store_settings;
  v_email text := lower(nullif(btrim(p_customer->>'email'), ''));
  v_name text := nullif(btrim(p_customer->>'name'), '');
  v_phone text := nullif(btrim(p_customer->>'phone'), '');
  v_dni text := nullif(regexp_replace(coalesce(p_customer->>'dni',''), '\D', '', 'g'), '');
begin
  perform public.expire_stale_orders();

  if p_idempotency_key is null then raise exception 'INVALID_REQUEST' using errcode = 'P0001'; end if;
  select id into v_existing from public.orders where idempotency_key = p_idempotency_key;
  if v_existing is not null then
    return (select jsonb_build_object('order_id', o.id, 'access_token', o.access_token, 'total_cents', o.total_cents,
      'status', o.status, 'duplicate', true) from public.orders o where o.id = v_existing);
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'INVALID_ITEMS' using errcode = 'P0001'; end if;
  if (select count(distinct e->>'variant_id') from jsonb_array_elements(p_items) e) <> jsonb_array_length(p_items) then
    raise exception 'DUPLICATE_VARIANT' using errcode = 'P0001'; end if;
  if v_email is null or length(v_email) > 254 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVALID_EMAIL' using errcode = 'P0001'; end if;
  if v_name is null or length(v_name) < 3 or length(v_name) > 120 then raise exception 'INVALID_NAME' using errcode = 'P0001'; end if;
  if v_phone is null or length(regexp_replace(v_phone, '\D', '', 'g')) < 8 or length(v_phone) > 40 then
    raise exception 'INVALID_PHONE' using errcode = 'P0001'; end if;
  if v_dni is null or length(v_dni) not between 7 and 11 then raise exception 'INVALID_DNI' using errcode = 'P0001'; end if;

  select * into s from public.store_settings where id = 1;
  if p_shipping_method = 'delivery' then
    if not s.shipping_enabled then raise exception 'SHIPPING_UNAVAILABLE' using errcode = 'P0001'; end if;
    if p_address is null
       or length(coalesce(btrim(p_address->>'street'),'')) not between 2 and 120
       or length(coalesce(btrim(p_address->>'number'),'')) not between 1 and 12
       or length(coalesce(btrim(p_address->>'city'),'')) not between 2 and 80
       or length(coalesce(btrim(p_address->>'province'),'')) not between 2 and 60
       or coalesce(p_address->>'postal_code','') !~ '^[A-Za-z]?\d{4}[A-Za-z]{0,3}$'
       or length(coalesce(p_address->>'apartment','')) > 40
       or length(coalesce(p_address->>'notes','')) > 300 then
      raise exception 'INVALID_ADDRESS' using errcode = 'P0001'; end if;
  elsif p_shipping_method = 'pickup' then
    if not s.pickup_enabled then raise exception 'PICKUP_UNAVAILABLE' using errcode = 'P0001'; end if;
    p_address := null;
  else
    raise exception 'INVALID_SHIPPING' using errcode = 'P0001';
  end if;

  insert into public.orders (status, customer_email, customer_name, customer_phone, customer_dni, shipping_method,
    shipping_address, subtotal_cents, total_cents, is_demo, idempotency_key, payment_provider, expires_at)
  values ('pending', v_email, v_name, v_phone, v_dni, p_shipping_method,
    case when p_address is null then null else jsonb_build_object(
      'street', btrim(p_address->>'street'), 'number', btrim(p_address->>'number'),
      'apartment', nullif(btrim(coalesce(p_address->>'apartment','')),''), 'city', btrim(p_address->>'city'),
      'province', btrim(p_address->>'province'), 'postal_code', upper(btrim(p_address->>'postal_code')),
      'notes', nullif(btrim(coalesce(p_address->>'notes','')),'')) end,
    0, 0, false, p_idempotency_key, 'mercadopago', now() + interval '60 minutes')
  returning id into v_order_id;

  for v_item in select e from jsonb_array_elements(p_items) e order by e->>'variant_id' loop
    begin
      v_variant_id := (v_item->>'variant_id')::uuid; v_qty := (v_item->>'quantity')::integer;
    exception when others then raise exception 'INVALID_ITEMS' using errcode = 'P0001'; end;
    if v_qty is null or v_qty < 1 or v_qty > 20 or (v_item->>'quantity')::numeric <> v_qty then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0001'; end if;
    select v.id, v.stock, v.size, v.color, p.id as product_id, p.name, p.brand, p.price_cents, p.status into v_row
      from public.product_variants v join public.products p on p.id = v.product_id
     where v.id = v_variant_id for update of v;
    if not found or v_row.status <> 'published' then
      raise exception 'VARIANT_UNAVAILABLE:%', v_variant_id using errcode = 'P0001'; end if;
    if v_row.stock < v_qty then
      raise exception 'INSUFFICIENT_STOCK:%:%', v_variant_id, v_row.stock using errcode = 'P0001'; end if;
    update public.product_variants set stock = stock - v_qty where id = v_variant_id;
    insert into public.order_items (order_id, product_id, variant_id, product_name, size, color, unit_price_cents, quantity)
    values (v_order_id, v_row.product_id, v_variant_id, v_row.brand || ' ' || v_row.name, v_row.size, v_row.color, v_row.price_cents, v_qty);
    v_subtotal := v_subtotal + v_row.price_cents * v_qty; v_count := v_count + v_qty;
  end loop;

  if p_shipping_method = 'delivery' and not (s.free_shipping_threshold_cents is not null and v_subtotal >= s.free_shipping_threshold_cents) then
    v_shipping := s.shipping_flat_cents;
  end if;

  update public.orders set subtotal_cents = v_subtotal, shipping_cents = v_shipping, total_cents = v_subtotal + v_shipping
   where id = v_order_id;

  return (select jsonb_build_object('order_id', o.id, 'access_token', o.access_token, 'total_cents', o.total_cents,
    'status', o.status, 'duplicate', false) from public.orders o where o.id = v_order_id);
exception when unique_violation then
  return (select jsonb_build_object('order_id', o.id, 'access_token', o.access_token, 'total_cents', o.total_cents,
    'status', o.status, 'duplicate', true) from public.orders o where o.idempotency_key = p_idempotency_key);
end; $$;

-- Aplica un pago ya verificado contra la API de Mercado Pago
create or replace function public.apply_payment(p_order_id uuid, p_payment_id text, p_mp_status text, p_amount_cents bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.orders; v_pay text; v_note text;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001'; end if;

  v_pay := case p_mp_status
    when 'approved' then 'approved' when 'authorized' then 'in_process' when 'in_process' then 'in_process'
    when 'in_mediation' then 'in_process' when 'pending' then 'pending' when 'rejected' then 'rejected'
    when 'cancelled' then 'cancelled' when 'refunded' then 'refunded' when 'charged_back' then 'charged_back'
    else 'pending' end;

  -- Un pago aprobado previo no se pisa con eventos de otros intentos rechazados.
  if o.payment_status = 'approved' and v_pay in ('pending','in_process','rejected','cancelled') and o.mp_payment_id is distinct from p_payment_id then
    return jsonb_build_object('status', o.status, 'payment_status', o.payment_status, 'ignored', true);
  end if;

  if v_pay = 'approved' then
    if p_amount_cents < o.total_cents then
      update public.orders set admin_notes = concat_ws(E'\n', admin_notes,
        'Pago ' || p_payment_id || ' aprobado por un monto menor al total. Revisar.') where id = o.id;
      return jsonb_build_object('status', o.status, 'payment_status', o.payment_status, 'amount_mismatch', true);
    end if;
    if o.stock_released then
      -- Pago tardío sobre un pedido vencido: se vuelve a reservar stock.
      update public.product_variants v set stock = greatest(v.stock - oi.quantity, 0)
        from public.order_items oi where oi.order_id = o.id and v.id = oi.variant_id;
      v_note := 'Pago aprobado después del vencimiento: verificar stock disponible.';
    end if;
    update public.orders set payment_status = 'approved', mp_payment_id = p_payment_id, paid_at = coalesce(paid_at, now()),
      status = case when status in ('pending','cancelled') then 'paid' else status end,
      stock_released = false, expires_at = null,
      admin_notes = case when v_note is null then admin_notes else concat_ws(E'\n', admin_notes, v_note) end
     where id = o.id;
  elsif v_pay in ('refunded','charged_back') then
    if o.status not in ('shipped','fulfilled') then perform public.release_order_stock(o.id); end if;
    update public.orders set payment_status = v_pay, mp_payment_id = p_payment_id,
      status = case when status in ('shipped','fulfilled') then status else 'cancelled' end where id = o.id;
  else
    update public.orders set payment_status = v_pay, mp_payment_id = coalesce(mp_payment_id, p_payment_id) where id = o.id;
  end if;

  select * into o from public.orders where id = p_order_id;
  return jsonb_build_object('status', o.status, 'payment_status', o.payment_status);
end; $$;

create or replace function public.cancel_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (select public.is_admin()) and current_user <> 'service_role' then
    raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  perform 1 from public.orders where id = p_order_id for update;
  perform public.release_order_stock(p_order_id);
  update public.orders set status = 'cancelled',
    payment_status = case when payment_status in ('pending','in_process') then 'cancelled' else payment_status end
   where id = p_order_id;
end; $$;

revoke all on function public.place_demo_order(jsonb, uuid, text) from public, anon, authenticated;
revoke all on function public.release_order_stock(uuid) from public, anon, authenticated;
revoke all on function public.expire_stale_orders() from public, anon, authenticated;
revoke all on function public.place_order(jsonb, uuid, jsonb, text, jsonb) from public, anon, authenticated;
revoke all on function public.apply_payment(uuid, text, text, bigint) from public, anon, authenticated;
revoke all on function public.cancel_order(uuid) from public, anon;
grant execute on function public.place_order(jsonb, uuid, jsonb, text, jsonb) to service_role;
grant execute on function public.apply_payment(uuid, text, text, bigint) to service_role;
grant execute on function public.expire_stale_orders() to service_role, authenticated;
grant execute on function public.cancel_order(uuid) to authenticated, service_role;
