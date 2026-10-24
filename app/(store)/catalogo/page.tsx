import type { Metadata } from 'next'
import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { CatalogToolbar } from '@/components/catalog/catalog-toolbar'
import { ProductFilters } from '@/components/catalog/product-filters'
import { ProductGrid } from '@/components/products/product-grid'
import { parseCatalogParams } from '@/lib/catalog-params'
import { filterProducts, getPublishedProducts, getUniqueValues } from '@/lib/products'

export const metadata: Metadata = {
  title: 'Catálogo',
  description: 'Todas las zapatillas disponibles en SneakAR.',
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const filters = parseCatalogParams(await searchParams)
  const products = await getPublishedProducts()
  const options = getUniqueValues(products)
  const results = filterProducts(products, filters)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-8 md:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-bold">
          {filters.query ? `Resultados para “${filters.query}”` : 'Catálogo'}
        </h1>
        {filters.query && (
          <Link href="/catalogo" className="w-fit text-sm font-medium text-primary hover:underline">
            Quitar búsqueda
          </Link>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside aria-label="Filtros" className="hidden lg:block">
          <div className="sticky top-24">
            <ProductFilters filters={filters} options={options} />
          </div>
        </aside>

        <div className="flex flex-col gap-5">
          <CatalogToolbar filters={filters} options={options} resultCount={results.length} />
          {results.length > 0 ? (
            <ProductGrid products={results} />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
              <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="font-display text-lg font-semibold">No encontramos zapatillas con esos filtros</p>
              <p className="text-sm text-muted-foreground">Probá quitar algún filtro o buscar otro modelo.</p>
              <Link href="/catalogo" className="text-sm font-semibold text-primary hover:underline">
                Ver todo el catálogo
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
