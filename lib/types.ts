// Tipos de dominio. Reflejan las tablas de Supabase (ver supabase/migrations).
// Los precios se guardan en centavos (bigint) y se exponen en pesos en la app.

export type ProductStatus = 'draft' | 'published'

export type ModelStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Product {
  id: string
  name: string
  slug: string
  brand: string
  description: string
  /** Precio en pesos (derivado de price_cents). */
  price: number
  status: ProductStatus
  created_at: string
  updated_at: string
}

export interface ProductVariant {
  id: string
  product_id: string
  size: string
  color: string
  sku: string | null
  stock: number
  created_at: string
  updated_at: string
}

export interface ProductImage {
  id: string
  product_id: string
  /** Ruta dentro del bucket product-images, o ruta local (/images/...) para datos de demo. */
  storage_path: string
  /** URL lista para usar en <img>. */
  url: string
  alt_text: string
  sort_order: number
  created_at: string
}

export interface ProductModel {
  id: string
  product_id: string
  glb_url: string | null
  status: ModelStatus
  provider: string | null
  provider_task_id: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface ProductWithRelations extends Product {
  variants: ProductVariant[]
  images: ProductImage[]
  model: ProductModel | null
}

export interface Order {
  id: string
  status: 'pending' | 'paid' | 'cancelled' | 'fulfilled'
  customer_email: string | null
  subtotal_cents: number
  total_cents: number
  is_demo: boolean
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  variant_id: string | null
  product_name: string
  size: string
  color: string
  unit_price_cents: number
  quantity: number
}

export interface CartItem {
  variantId: string
  productId: string
  slug: string
  name: string
  brand: string
  image: string
  size: string
  color: string
  unitPrice: number
  quantity: number
  maxStock: number
}

export type SortOption = 'relevance' | 'price-asc' | 'price-desc'

export interface CatalogFilters {
  query: string
  brands: string[]
  sizes: string[]
  colors: string[]
  minPrice: number | null
  maxPrice: number | null
  sort: SortOption
}
