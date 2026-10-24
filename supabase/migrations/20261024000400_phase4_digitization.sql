-- SneakAR · Fase 4 · Digitalización 3D a partir de fotos.
-- digitization_jobs: un trabajo de generación (estado, proveedor, resultado).
-- digitization_photos: fotos originales del trabajo (bucket privado product-captures).
-- digitization-results: GLB generado, privado hasta que el vendedor lo confirma.
-- product-models: GLB confirmado, público para el visor del catálogo.

create table if not exists public.digitization_jobs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  color text check (color is null or char_length(trim(color)) between 1 and 40),
  status text not null default 'uploading'
    check (status in ('pending', 'uploading', 'processing', 'completed', 'failed', 'confirmed', 'discarded')),
  mode text not null default 'meshy' check (mode in ('meshy', 'test')),
  provider_task_id text check (provider_task_id is null or char_length(provider_task_id) <= 128),
  progress integer not null default 0 check (progress between 0 and 100),
  error_message text check (error_message is null or char_length(error_message) <= 500),
  error_retryable boolean not null default true,
  result_path text check (result_path is null or char_length(result_path) <= 512),
  model_id uuid references public.product_models(id) on delete set null,
  attempts integer not null default 0 check (attempts between 0 and 50),
  simulate_failure boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint digitization_jobs_completed_needs_result
    check (status not in ('completed', 'confirmed') or mode = 'test' or result_path is not null)
);
create index if not exists digitization_jobs_created_idx on public.digitization_jobs (created_at desc);
create index if not exists digitization_jobs_status_idx on public.digitization_jobs (status);
create index if not exists digitization_jobs_product_idx on public.digitization_jobs (product_id);
drop trigger if exists digitization_jobs_set_updated_at on public.digitization_jobs;
create trigger digitization_jobs_set_updated_at before update on public.digitization_jobs
  for each row execute function public.set_updated_at();

create table if not exists public.digitization_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.digitization_jobs(id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) between 1 and 512),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  sort_order integer not null check (sort_order between 0 and 11),
  created_at timestamptz not null default now(),
  constraint digitization_photos_unique_order unique (job_id, sort_order)
);
create index if not exists digitization_photos_job_idx on public.digitization_photos (job_id, sort_order);

alter table public.digitization_jobs enable row level security;
alter table public.digitization_photos enable row level security;

drop policy if exists "digitization_jobs_admin_all" on public.digitization_jobs;
create policy "digitization_jobs_admin_all" on public.digitization_jobs for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "digitization_photos_admin_all" on public.digitization_photos;
create policy "digitization_photos_admin_all" on public.digitization_photos for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('digitization-results', 'digitization-results', false, 52428800, array['model/gltf-binary', 'application/octet-stream']),
  ('product-models', 'product-models', true, 52428800, array['model/gltf-binary', 'application/octet-stream'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "digitization_results_admin_all" on storage.objects;
create policy "digitization_results_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'digitization-results' and (select public.is_admin()))
  with check (bucket_id = 'digitization-results' and (select public.is_admin()));

drop policy if exists "product_models_admin_write" on storage.objects;
create policy "product_models_admin_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'product-models' and (select public.is_admin()))
  with check (bucket_id = 'product-models' and (select public.is_admin()));
