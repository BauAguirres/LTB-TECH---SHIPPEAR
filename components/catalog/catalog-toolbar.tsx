'use client'

import { SlidersHorizontal } from 'lucide-react'
import { ProductFilters, useCatalogNavigation, type FilterOptions } from '@/components/catalog/product-filters'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { countActiveFilters } from '@/lib/catalog-params'
import type { CatalogFilters, SortOption } from '@/lib/types'

const SORT_ITEMS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'price-asc', label: 'Precio: menor a mayor' },
  { value: 'price-desc', label: 'Precio: mayor a menor' },
]

export function CatalogToolbar({
  filters,
  options,
  resultCount,
}: {
  filters: CatalogFilters
  options: FilterOptions
  resultCount: number
}) {
  const { apply } = useCatalogNavigation(filters)
  const active = countActiveFilters(filters)

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {resultCount} {resultCount === 1 ? 'producto' : 'productos'}
      </p>
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger className="flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm font-medium lg:hidden">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filtros{active > 0 && ` (${active})`}
          </SheetTrigger>
          <SheetContent side="left" className="w-[88%] overflow-y-auto bg-background p-5">
            <SheetHeader className="p-0">
              <SheetTitle className="font-display">Filtrar catálogo</SheetTitle>
            </SheetHeader>
            <ProductFilters filters={filters} options={options} />
          </SheetContent>
        </Sheet>

        <Select
          items={SORT_ITEMS}
          value={filters.sort}
          onValueChange={(value) => {
            if (value) apply({ sort: value as SortOption })
          }}
        >
          <SelectTrigger aria-label="Ordenar" className="h-9 min-w-44 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
