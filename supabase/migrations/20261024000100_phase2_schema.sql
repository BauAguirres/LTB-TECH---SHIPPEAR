-- SneakAR · Fase 2 · Esquema principal, autorización de administradores y RLS.
-- Precios en centavos (bigint) para evitar errores de punto flotante.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Administradores autorizados
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_select_own" on public.admin_users;
create policy "admin_users_select_own" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));
-- Sin políticas de escritura: los administradores se otorgan solo por SQL.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Productos
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  brand text not null check (char_length(trim(brand)) between 1 and 60),
  description text not null default '' check (char_length(description) <= 4000),
  price_cents bigint not null check (price_cents > 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_status_idx on public.products (status);
create index if not exists products_brand_idx on public.products (brand);
create index if not exists products_price_idx on public.products (price_cents);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Variantes (talle + color) con stock
-- ---------------------------------------------------------------------------
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null check (char_length(trim(size)) between 1 and 10),
  color text not null check (char_length(trim(color)) between 1 and 40),
  sku text unique check (sku is null or char_length(sku) between 1 and 64),
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_unique_combo unique (product_id, size, color)
);

create index if not exists product_variants_product_idx on public.product_variants (product_id);

drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Imágenes de producto
-- storage_path: ruta dentro del bucket "product-images" o, para los datos
-- de demostración, una ruta estática que empieza con "/".
-- ---------------------------------------------------------------------------
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null check (char_length(storage_path) between 1 and 512),
  alt_text text not null default '' check (char_length(alt_text) <= 200),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  constraint product_images_unique_path unique (product_id, storage_path)
);

create index if not exists product_images_product_idx on public.product_images (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- Modelos 3D. Un modelo solo puede estar "completed" con un GLB válido.
-- ---------------------------------------------------------------------------
create table if not exists public.product_models (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  glb_url text check (glb_url is null or glb_url ~* '^(https://|/).+\.glb(\?.*)?$'),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  provider text,
  provider_task_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_models_completed_needs_glb check (status <> 'completed' or glb_url is not null)
);

create index if not exists product_models_product_idx on public.product_models (product_id, status);

drop trigger if exists product_models_set_updated_at on public.product_models;
create trigger product_models_set_updated_at before update on public.product_models
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Pedidos (se usarán desde la Fase 6; por ahora solo lectura admin)
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'fulfilled')),
  customer_email text check (customer_email is null or customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  subtotal_cents bigint not null check (subtotal_cents >= 0),
  total_cents bigint not null check (total_cents >= 0),
  is_demo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  size text not null,
  color text not null,
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity between 1 and 20),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);
create index if not exists order_items_variant_idx on public.order_items (variant_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.product_models enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Productos: el público ve solo publicados; los admins ven y editan todo.
drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));

drop policy if exists "products_admin_insert" on public.products;
create policy "products_admin_insert" on public.products
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "products_admin_update" on public.products;
create policy "products_admin_update" on public.products
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "products_admin_delete" on public.products;
create policy "products_admin_delete" on public.products
  for delete to authenticated using ((select public.is_admin()));

-- Tablas hijas: visibles si el producto padre está publicado.
drop policy if exists "variants_select" on public.product_variants;
create policy "variants_select" on public.product_variants
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
  );

drop policy if exists "variants_admin_write" on public.product_variants;
create policy "variants_admin_write" on public.product_variants
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "images_select" on public.product_images;
create policy "images_select" on public.product_images
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
  );

drop policy if exists "images_admin_write" on public.product_images;
create policy "images_admin_write" on public.product_images
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "models_select" on public.product_models;
create policy "models_select" on public.product_models
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or (
      status = 'completed'
      and exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
    )
  );

drop policy if exists "models_admin_write" on public.product_models;
create policy "models_admin_write" on public.product_models
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Pedidos: solo administradores. La creación pública llegará vía RPC en la Fase 6.
drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all" on public.orders
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all" on public.order_items
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
