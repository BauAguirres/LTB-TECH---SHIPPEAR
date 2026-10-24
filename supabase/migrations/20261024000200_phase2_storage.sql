-- SneakAR · Fase 2 · Supabase Storage.
-- product-images: fotos públicas del catálogo (lectura pública, escritura admin).
-- product-captures: fotos de captura para la digitalización 3D (privado, solo admin).
-- Tamaño y tipo MIME se validan en el propio bucket, además de en la app.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('product-captures', 'product-captures', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "product_captures_admin_all" on storage.objects;
create policy "product_captures_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'product-captures' and (select public.is_admin()))
  with check (bucket_id = 'product-captures' and (select public.is_admin()));
