import Image from 'next/image'
import { Box } from 'lucide-react'
import type { ProductWithRelations } from '@/lib/types'

export function ProductMedia({ product }: { product: ProductWithRelations }) {
  const image = product.images[0]
  const hasModel = product.model?.status === 'completed' && !!product.model.glb_url

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-card">
        {image && (
          <Image
            src={image.url}
            alt={image.alt_text}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        )}
      </div>
      {!hasModel && (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <Box className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">Modelo 3D aún no disponible</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Este producto todavía no tiene un modelo 3D. Cuando se digitalice vas a poder rotarlo y verlo en tu
              espacio con realidad aumentada.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
