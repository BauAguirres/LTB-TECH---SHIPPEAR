-- Fase 3: modelos 3D específicos por color.
-- color NULL = el modelo aplica a todos los colores del producto.
alter table public.product_models
  add column if not exists color text
  check (color is null or char_length(trim(color)) between 1 and 40);

create index if not exists product_models_product_color_idx
  on public.product_models (product_id, color, status);
