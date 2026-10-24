// Capa de acceso a productos sobre Supabase. Las firmas se mantienen desde la Fase 1.
// Lecturas públicas: cliente anónimo (RLS solo devuelve productos publicados).
// Lecturas del panel: cliente con la sesión del admin (RLS devuelve también borradores).

import 'server-only'
import { createClient, createPublicClient } from '@/lib/supabase/server'
import { isValidGlbUrl } from '@/lib/models'
import { productImageUrl } from '@/lib/storage'
import type {
  CatalogFilters,
  ModelStatus,
  ProductModel,
  ProductStatus,
  ProductVariant,
  ProductWithRelations,
} from '@/lib/types'

const PRODUCT_SELECT = `
  id, name, slug, brand, description, price_cents, status, created_at, updated_at,
  variants:product_variants (id, product_id, size, color, sku, stock, created_at, updated_at),
  images:product_images (id, product_id, storage_path, alt_text, sort_order, created_at),
  models:product_models (id, product_id, glb_url, color, status, provider, provider_task_id, error_message, created_at, updated_at)
`

interface ProductRow {
  id: string
  name: string
  slug: string
  brand: string
  description: string
  price_cents: number | string
  status: ProductStatus
  created_at: string
  updated_at: string
  variants: ProductVariant[] | null
  images: { id: string; product_id: string; storage_path: string; alt_text: string; sort_order: number; created_at: string }[] | null
  models: (Omit<ProductModel, 'status'> & { status: ModelStatus })[] | null
}

/** Solo se considera "digitalizado" un modelo completado con un GLB real. */
function pickModel(models: ProductRow['models']): ProductModel | null {
  if (!models?.length) return null
  const sorted = [...models].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  return sorted.find((m) => m.status === 'completed' && m.glb_url) ?? sorted[0]
}

function usableModels(models: ProductRow['models']): ProductModel[] {
  return (models ?? [])
    .filter((m) => m.status === 'completed' && isValidGlbUrl(m.glb_url))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

function mapProduct(row: ProductRow): ProductWithRelations {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand: row.brand,
    description: row.description,
    price: Number(row.price_cents) / 100,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    variants: [...(row.variants ?? [])].sort(
      (a, b) => a.color.localeCompare(b.color) || Number(a.size) - Number(b.size) || a.size.localeCompare(b.size),
    ),
    images: [...(row.images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
      .map((img) => ({ ...img, url: productImageUrl(img.storage_path) })),
    model: pickModel(row.models),
    models: usableModels(row.models),
  }
}

function fail(context: string, error: { message: string }): never {
  console.error(`[products] ${context}:`, error.message)
  throw new Error('No se pudo cargar el catálogo. Intentá de nuevo en unos minutos.')
}

export async function getAllProducts(): Promise<ProductWithRelations[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).order('created_at', { ascending: true })
  if (error) fail('getAllProducts', error)
  return (data as unknown as ProductRow[]).map(mapProduct)
}

export async function getPublishedProducts(): Promise<ProductWithRelations[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('status', 'published')
    .order('created_at', { ascending: true })
  if (error) fail('getPublishedProducts', error)
  return (data as unknown as ProductRow[]).map(mapProduct)
}

export async function getProductBySlug(slug: string): Promise<ProductWithRelations | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  if (error) fail('getProductBySlug', error)
  return data ? mapProduct(data as unknown as ProductRow) : null
}

/** Para el panel admin: incluye borradores (RLS lo permite solo a administradores). */
export async function getProductById(id: string): Promise<ProductWithRelations | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const supabase = await createClient()
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('id', id).maybeSingle()
  if (error) fail('getProductById', error)
  return data ? mapProduct(data as unknown as ProductRow) : null
}

export async function getFeaturedProducts(limit = 4): Promise<ProductWithRelations[]> {
  const published = await getPublishedProducts()
  return published.slice(0, limit)
}

export async function getRelatedProducts(product: ProductWithRelations, limit = 4): Promise<ProductWithRelations[]> {
  const published = await getPublishedProducts()
  const others = published.filter((p) => p.id !== product.id)
  const sameBrand = others.filter((p) => p.brand === product.brand)
  const rest = others.filter((p) => p.brand !== product.brand)
  return [...sameBrand, ...rest].slice(0, limit)
}

export function getTotalStock(product: ProductWithRelations): number {
  return product.variants.reduce((sum, v) => sum + v.stock, 0)
}

export function getUniqueValues(products: ProductWithRelations[]) {
  const brands = new Set<string>()
  const sizes = new Set<string>()
  const colors = new Set<string>()
  let minPrice = Number.POSITIVE_INFINITY
  let maxPrice = 0

  for (const product of products) {
    brands.add(product.brand)
    minPrice = Math.min(minPrice, product.price)
    maxPrice = Math.max(maxPrice, product.price)
    for (const variant of product.variants) {
      sizes.add(variant.size)
      colors.add(variant.color)
    }
  }

  return {
    brands: [...brands].sort(),
    sizes: [...sizes].sort((a, b) => Number(a) - Number(b)),
    colors: [...colors].sort(),
    minPrice: Number.isFinite(minPrice) ? minPrice : 0,
    maxPrice,
  }
}

export function filterProducts(products: ProductWithRelations[], filters: CatalogFilters): ProductWithRelations[] {
  const query = filters.query.trim().toLowerCase()

  const result = products.filter((product) => {
    if (query) {
      const haystack = `${product.name} ${product.brand} ${product.description}`.toLowerCase()
      if (!haystack.includes(query)) return false
    }
    if (filters.brands.length && !filters.brands.includes(product.brand)) return false
    if (filters.minPrice !== null && product.price < filters.minPrice) return false
    if (filters.maxPrice !== null && product.price > filters.maxPrice) return false

    if (filters.sizes.length || filters.colors.length) {
      const hasMatchingVariant = product.variants.some(
        (v) =>
          v.stock > 0 &&
          (!filters.sizes.length || filters.sizes.includes(v.size)) &&
          (!filters.colors.length || filters.colors.includes(v.color)),
      )
      if (!hasMatchingVariant) return false
    }
    return true
  })

  if (filters.sort === 'price-asc') return [...result].sort((a, b) => a.price - b.price)
  if (filters.sort === 'price-desc') return [...result].sort((a, b) => b.price - a.price)
  return result
}
