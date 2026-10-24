import type { CatalogFilters, SortOption } from '@/lib/types'

type RawParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function list(value: string | string[] | undefined): string[] {
  return first(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

function toNumber(value: string | string[] | undefined): number | null {
  const n = Number(first(value))
  return first(value) && Number.isFinite(n) && n >= 0 ? n : null
}

const SORTS: SortOption[] = ['relevance', 'price-asc', 'price-desc']

export function parseCatalogParams(params: RawParams): CatalogFilters {
  const sort = first(params.orden) as SortOption
  return {
    query: first(params.q),
    brands: list(params.marca),
    sizes: list(params.talle),
    colors: list(params.color),
    minPrice: toNumber(params.min),
    maxPrice: toNumber(params.max),
    sort: SORTS.includes(sort) ? sort : 'relevance',
  }
}

export function buildCatalogQuery(filters: CatalogFilters): string {
  const params = new URLSearchParams()
  if (filters.query.trim()) params.set('q', filters.query.trim())
  if (filters.brands.length) params.set('marca', filters.brands.join(','))
  if (filters.sizes.length) params.set('talle', filters.sizes.join(','))
  if (filters.colors.length) params.set('color', filters.colors.join(','))
  if (filters.minPrice !== null) params.set('min', String(filters.minPrice))
  if (filters.maxPrice !== null) params.set('max', String(filters.maxPrice))
  if (filters.sort !== 'relevance') params.set('orden', filters.sort)
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function countActiveFilters(filters: CatalogFilters): number {
  return (
    filters.brands.length +
    filters.sizes.length +
    filters.colors.length +
    (filters.minPrice !== null ? 1 : 0) +
    (filters.maxPrice !== null ? 1 : 0)
  )
}
