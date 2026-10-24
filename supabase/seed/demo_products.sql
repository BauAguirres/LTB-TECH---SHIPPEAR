-- SneakAR · Datos de demostración (10 productos).
-- Idempotente: solo inserta lo que falta (ON CONFLICT DO NOTHING). Nunca borra ni
-- sobrescribe datos existentes. No crea modelos 3D: ningún producto queda como digitalizado.
-- Precios en centavos (ARS). Stock determinístico con algunas variantes en 0.

with seed (idx, name, slug, brand, description, price_cents, status, image, sizes, colors) as (
  values
    (0, 'Street Runner 90', 'street-runner-90', 'Nike',
     'Silueta retro de running con cámara de aire visible y capellada de cuero sintético. Amortiguación cómoda para todo el día.',
     18999900, 'published', '/images/products/street-runner.png',
     array['38','39','40','41','42','43'], array['Blanco','Rojo']),
    (1, 'Court Classic', 'court-classic', 'Adidas',
     'Clásico de tenis en cuero blanco con talón en contraste. Suela de goma plana y plantilla acolchada.',
     14999900, 'published', '/images/products/court-classic.png',
     array['37','38','39','40','41','42','44'], array['Blanco','Verde']),
    (2, 'Velocity Knit', 'velocity-knit', 'Puma',
     'Running de alto rendimiento con capellada tejida transpirable y mediasuela de espuma reactiva.',
     21499900, 'published', '/images/products/velocity-knit.png',
     array['39','40','41','42','43','44'], array['Azul','Negro']),
    (3, 'Heritage 574', 'heritage-574', 'New Balance',
     'Combinación de gamuza y malla con detalles en azul marino. Un ícono lifestyle con soporte estable.',
     19999900, 'published', '/images/products/heritage-suede.png',
     array['38','39','40','41','42','43','44'], array['Gris','Azul marino']),
    (4, 'Skate Low', 'skate-low', 'Vans',
     'Zapatilla de skate en lona resistente con suela vulcanizada de alto agarre y costuras reforzadas.',
     9999900, 'published', '/images/products/skate-low.png',
     array['36','37','38','39','40','41','42'], array['Negro']),
    (5, 'Canvas Hi', 'canvas-hi', 'Converse',
     'Bota de lona con puntera de goma y ojales metálicos. Un básico atemporal para cualquier look.',
     10999900, 'published', '/images/products/canvas-hi.png',
     array['35','36','37','38','39','40','41'], array['Crema','Negro']),
    (6, 'Trail Pro GTX', 'trail-pro-gtx', 'Salomon',
     'Trail running con suela de tacos agresivos y protección en puntera. Pensada para terrenos técnicos.',
     25999900, 'published', '/images/products/trail-pro.png',
     array['39','40','41','42','43','44','45'], array['Naranja','Verde oliva']),
    (7, 'Club Retro', 'club-retro', 'Reebok',
     'Estética vintage en cuero crema con suela de tono envejecido. Comodidad clásica de los 80.',
     13999900, 'published', '/images/products/club-retro.png',
     array['37','38','39','40','41','42'], array['Crema','Beige']),
    (8, 'Court Low 1', 'court-low-1', 'Nike',
     'Inspirada en el básquet, con cuero blanco y paneles azules. Cuello acolchado y suela de pivote.',
     22999900, 'published', '/images/products/court-low.png',
     array['39','40','41','42','43','44'], array['Blanco','Azul']),
    (9, 'Cloud Runner', 'cloud-runner', 'Adidas',
     'Total black con mediasuela de máxima amortiguación. Borrador pendiente de revisión antes de publicar.',
     17999900, 'draft', '/images/products/cloud-runner.png',
     array['39','40','41','42','43'], array['Negro'])
),
inserted_products as (
  insert into public.products (name, slug, brand, description, price_cents, status)
  select name, slug, brand, description, price_cents, status from seed
  on conflict (slug) do nothing
  returning id, slug
),
target as (
  select p.id as product_id, s.*
  from seed s
  join (
    select id, slug from inserted_products
    union
    select id, slug from public.products where slug in (select slug from seed)
  ) p on p.slug = s.slug
),
inserted_images as (
  insert into public.product_images (product_id, storage_path, alt_text, sort_order)
  select product_id, image, brand || ' ' || name || ', vista lateral', 0 from target
  on conflict do nothing
  returning id
)
insert into public.product_variants (product_id, size, color, sku, stock)
select
  t.product_id,
  sz.size,
  cl.color,
  upper(left(t.slug, 8)) || '-' || upper(left(cl.color, 3)) || '-' || sz.size,
  (t.idx * 5 + (cl.ci - 1) * 3 + (sz.si - 1) * 7) % 9
from target t
cross join lateral unnest(t.colors) with ordinality as cl(color, ci)
cross join lateral unnest(t.sizes) with ordinality as sz(size, si)
on conflict do nothing;
