import Image from 'next/image'
import Link from 'next/link'
import { Box } from 'lucide-react'
import { formatPrice, getSwatch } from '@/lib/format'
import { getTotalStock } from '@/lib/products'
import type { ProductWithRelations } from '@/lib/types'

export function StockIndicator({ stock }: { stock: number }) {
  if (stock === 0) {
    return <span className="text-xs font-medium text-destructive">Sin stock</span>
  }
  if (stock <= 10) {
    return <span className="text-xs font-medium text-muted-foreground">Últimas {stock} unidades</span>
  }
  return <span className="text-xs font-medium text-primary">En stock</span>
}

export function ProductCard({ product, priority = false }: { product: ProductWithRelations; priority?: boolean }) {
  const image = product.images[0]
  const colors = [...new Set(product.variants.map((v) => v.color))]
  const stock = getTotalStock(product)

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg hover:shadow-foreground/5">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {image && (
          <Image
            src={image.storage_path || '/placeholder.svg'}
            alt={image.alt_text}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        {product.model?.status === 'completed' && (
          <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-xs font-semibold">
            <Box className="size-3.5 text-primary" aria-hidden="true" />
            3D · AR
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{product.brand}</p>
        <h3 className="font-display text-lg leading-tight font-semibold text-balance">
          <Link href={`/producto/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col gap-1">
            <p className="font-display text-lg font-bold">{formatPrice(product.price)}</p>
            <StockIndicator stock={stock} />
          </div>
          <ul className="flex gap-1" aria-label={`Colores: ${colors.join(', ')}`}>
            {colors.map((color) => (
              <li
                key={color}
                className="size-4 rounded-full border border-border"
                style={{ backgroundColor: getSwatch(color) }}
              />
            ))}
          </ul>
        </div>
      </div>
    </article>
  )
}
