'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { StatusBadge } from '@/components/admin/admin-ui'
import { formatPrice } from '@/lib/format'
import type { ProductStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface ProductRow {
  id: string
  name: string
  slug: string
  brand: string
  price: number
  status: ProductStatus
  image: string
  stock: number
  variantCount: number
  hasModel: boolean
}

const FILTERS: { value: 'all' | ProductStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'published', label: 'Publicados' },
  { value: 'draft', label: 'Borradores' },
]

export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | ProductStatus>('all')

  const q = query.trim().toLowerCase()
  const visible = rows.filter(
    (r) => (status === 'all' || r.status === status) && (!q || `${r.name} ${r.brand}`.toLowerCase().includes(q)),
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="sr-only" htmlFor="admin-search">
          Buscar productos
        </label>
        <input
          id="admin-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o marca"
          className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring sm:max-w-xs"
        />
        <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Filtrar por estado">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={status === f.value}
              onClick={() => setStatus(f.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium',
                status === f.value ? 'bg-card shadow-sm' : 'text-muted-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Producto</th>
              <th scope="col" className="px-4 py-3 font-semibold">Precio</th>
              <th scope="col" className="px-4 py-3 font-semibold">Stock</th>
              <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
              <th scope="col" className="px-4 py-3 font-semibold">Modelo 3D</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <Image src={row.image || '/placeholder.svg'} alt="" fill sizes="44px" className="object-cover" />
                    </div>
                    <div>
                      <p className="font-semibold">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.brand}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{formatPrice(row.price)}</td>
                <td className="px-4 py-3">
                  {row.stock} u. <span className="text-xs text-muted-foreground">· {row.variantCount} var.</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={row.status === 'published' ? 'primary' : 'muted'}>
                    {row.status === 'published' ? 'Publicado' : 'Borrador'}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={row.hasModel ? 'primary' : 'muted'}>{row.hasModel ? 'Listo' : 'Sin modelo'}</StatusBadge>
                </td>
                <td className="px-4 py-3 text-right">
                  {row.status === 'published' && (
                    <Link
                      href={`/producto/${row.slug}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Ver
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="p-8 text-center text-muted-foreground">Sin resultados.</p>}
      </div>
      <p className="text-xs text-muted-foreground">
        La edición, publicación y eliminación se habilitan en la Fase 2, cuando el catálogo se guarde en Supabase.
      </p>
    </div>
  )
}
