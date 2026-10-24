# SneakAR

Tienda de zapatillas con visor 3D, panel de administración y digitalización de productos a modelos `.glb`. Construida con Next.js 16 (App Router), Tailwind CSS y Supabase (Postgres, Auth y Storage).

## Funcionalidades

- **Tienda** (`/`, `/catalogo`, `/producto/[slug]`): catálogo con filtros, ficha de producto con talles, colores y stock, y visor 3D cuando el producto tiene un modelo publicado.
- **Demo 3D** (`/demo-3d`): visor de modelos de ejemplo.
- **Carrito y checkout demo** (`/carrito`, `/carrito/confirmacion`): el pedido se procesa en la función `place_demo_order`, que valida precio, cantidad y stock en el servidor, descuenta stock de forma atómica y usa una clave de idempotencia para evitar pedidos duplicados. No se cobra dinero real.
- **Panel de administración** (`/admin`): ABM de productos, variantes, imágenes y modelos 3D, gestión de pedidos y configuración.
- **Digitalización** (`/admin/digitalizacion`): carga de fotos, generación del modelo 3D (Meshy o modo de prueba), revisión y confirmación del resultado.

## Puesta en marcha

1. Copiá `.env.example` a `.env.local` y completá `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. En v0/Vercel las carga automáticamente la integración de Supabase.
2. Aplicá en orden las migraciones de `supabase/migrations/`. Son idempotentes.
3. Opcional: cargá el catálogo de ejemplo con `supabase/seed/demo_products.sql`.
4. Instalá las dependencias y levantá el proyecto:

   ```bash
   pnpm install
   pnpm dev
   ```

## Acceso de administrador

El **primer usuario que se registra** en `/registro` queda como administrador (trigger `bootstrap_first_admin`). Los registros siguientes son usuarios comunes. Para sumar otro administrador:

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'persona@dominio.com';
```

Supabase exige confirmar el email antes de iniciar sesión.

## Seguridad

- Todas las tablas tienen RLS. El público solo lee productos publicados y modelos completados. Las escrituras requieren `is_admin()`.
- Los buckets de capturas y resultados de digitalización son privados. Las imágenes y modelos publicados son públicos.
- La service role key no se usa en el cliente.

## Estructura

```
app/(store)      Tienda pública
app/admin        Panel de administración
app/api          Endpoints de digitalización
lib/supabase     Clientes de Supabase (browser, server, proxy)
supabase/        Migraciones y seed
```
