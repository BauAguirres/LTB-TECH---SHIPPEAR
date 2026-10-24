// Capa de acceso a productos. En la Fase 2 estas funciones consultarán Supabase
// manteniendo las mismas firmas, por lo que los componentes no necesitan cambios.

import { temporaryCatalog } from '@/lib/data/temporary-catalog'
import type { CatalogFilters, ProductWithRelations } from '@/lib/types'

export async function getAllProducts(): Promise<ProductWithRelations[]> {
  return temporaryCatalog
}

export async function getPublishedProducts(): Promise<ProductWithRelations[]> {
  return temporaryCatalog.filter((product) => product.status === 'published')
}

export async function getProductBySlug(slug: string): Promise<ProductWithRelations | null> {
  return temporaryCatalog.find((p) => p.slug === slug && p.status === 'published') ?? null
}

export async function getProductById(id: string): Promise<ProductWithRelations | null> {
  return temporaryCatalog.find((p) => p.id === id) ?? null
}

export async function getFeaturedProducts(limit = 4): Promise<ProductWithRelations[]> {
  const published = await getPublishedProducts()
  return published.slice(0, limit)
}

export async function getRelatedProducts(
  product: ProductWithRelations,
  limit = 4,
): Promise<ProductWithRelations[]> {
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

export function filterProducts(
  products: ProductWithRelations[],
  filters: CatalogFilters,
): ProductWithRelations[] {
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
