// Tipos alineados con el esquema de Supabase planificado para la Fase 2.

export type ProductStatus = 'draft' | 'published'

export type ModelStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Product {
  id: string
  name: string
  slug: string
  brand: string
  description: string
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
  storage_path: string
  alt_text: string
  sort_order: number
  created_at: string
}

export interface ProductModel {
  id: string
  product_id: string
  storage_path: string | null
  provider: string
  provider_task_id: string | null
  status: ModelStatus
  error_message: string | null
  is_demo: boolean
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
  status: string
  subtotal: number
  total: number
  is_demo: boolean
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  variant_id: string
  product_name: string
  size: string
  color: string
  unit_price: number
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
