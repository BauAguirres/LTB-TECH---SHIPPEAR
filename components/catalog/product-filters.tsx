'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { buildCatalogQuery, countActiveFilters } from '@/lib/catalog-params'
import { getSwatch } from '@/lib/format'
import type { CatalogFilters } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface FilterOptions {
  brands: string[]
  sizes: string[]
  colors: string[]
  minPrice: number
  maxPrice: number
}

export function useCatalogNavigation(filters: CatalogFilters) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function apply(patch: Partial<CatalogFilters>) {
    const next = { ...filters, ...patch }
    startTransition(() => {
      router.replace(`/catalogo${buildCatalogQuery(next)}`, { scroll: false })
    })
  }

  return { apply, isPending }
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 border-b border-border pb-5">
      <legend className="mb-3 font-display text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  )
}

export function ProductFilters({ filters, options }: { filters: CatalogFilters; options: FilterOptions }) {
  const { apply, isPending } = useCatalogNavigation(filters)
  const active = countActiveFilters(filters)

  function applyPrice(form: HTMLFormElement) {
    const data = new FormData(form)
    const parse = (v: FormDataEntryValue | null) => {
      const n = Number(v)
      return v && Number.isFinite(n) && n >= 0 ? n : null
    }
    let min = parse(data.get('min'))
    let max = parse(data.get('max'))
    if (min !== null && max !== null && min > max) [min, max] = [max, min]
    apply({ minPrice: min, maxPrice: max })
  }

  return (
    <div className={cn('flex flex-col gap-5 transition-opacity', isPending && 'opacity-60')} aria-busy={isPending}>
      <div className="flex items-center justify-between">
        <p className="font-display font-semibold">Filtros{active > 0 && ` (${active})`}</p>
        {active > 0 && (
          <button
            type="button"
            onClick={() => apply({ brands: [], sizes: [], colors: [], minPrice: null, maxPrice: null })}
            className="text-sm font-medium text-primary hover:underline"
          >
            Limpiar
          </button>
        )}
      </div>

      <FilterGroup title="Marca">
        {options.brands.map((brand) => {
          const id = `brand-${brand}`
          return (
            <label key={brand} htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                id={id}
                checked={filters.brands.includes(brand)}
                onCheckedChange={() => apply({ brands: toggle(filters.brands, brand) })}
              />
              {brand}
            </label>
          )
        })}
      </FilterGroup>

      <FilterGroup title="Precio (ARS)">
        <form
          key={`${filters.minPrice}-${filters.maxPrice}`}
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            applyPrice(e.currentTarget)
          }}
        >
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="price-min">
              Precio mínimo
            </label>
            <input
              id="price-min"
              name="min"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              defaultValue={filters.minPrice ?? ''}
              placeholder={String(options.minPrice)}
              className="h-9 w-full min-w-0 rounded-lg border border-input bg-card px-2 text-sm outline-none focus-visible:border-ring"
            />
            <span className="text-muted-foreground" aria-hidden="true">
              –
            </span>
            <label className="sr-only" htmlFor="price-max">
              Precio máximo
            </label>
            <input
              id="price-max"
              name="max"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              defaultValue={filters.maxPrice ?? ''}
              placeholder={String(options.maxPrice)}
              className="h-9 w-full min-w-0 rounded-lg border border-input bg-card px-2 text-sm outline-none focus-visible:border-ring"
            />
          </div>
          <button
            type="submit"
            className="h-9 rounded-lg border border-border bg-card text-sm font-medium hover:border-primary hover:text-primary"
          >
            Aplicar precio
          </button>
        </form>
      </FilterGroup>

      <FilterGroup title="Talle disponible (AR)">
        <div className="grid grid-cols-4 gap-2">
          {options.sizes.map((size) => {
            const selected = filters.sizes.includes(size)
            return (
              <button
                key={size}
                type="button"
                aria-pressed={selected}
                onClick={() => apply({ sizes: toggle(filters.sizes, size) })}
                className={cn(
                  'h-9 rounded-lg border text-sm font-medium transition-colors',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:border-foreground',
                )}
              >
                {size}
              </button>
            )
          })}
        </div>
      </FilterGroup>

      <FilterGroup title="Color">
        <div className="flex flex-wrap gap-2">
          {options.colors.map((color) => {
            const selected = filters.colors.includes(color)
            return (
              <button
                key={color}
                type="button"
                aria-pressed={selected}
                onClick={() => apply({ colors: toggle(filters.colors, color) })}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-xs font-medium transition-colors',
                  selected ? 'border-primary bg-accent text-accent-foreground' : 'border-border bg-card hover:border-foreground',
                )}
              >
                <span
                  aria-hidden="true"
                  className="size-5 rounded-full border border-border"
                  style={{ backgroundColor: getSwatch(color) }}
                />
                {color}
              </button>
            )
          })}
        </div>
      </FilterGroup>
    </div>
  )
}
