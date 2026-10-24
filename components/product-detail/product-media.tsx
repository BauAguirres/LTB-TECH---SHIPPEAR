'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Box, Images, Info } from 'lucide-react'
import { SneakerViewer } from '@/components/viewer/sneaker-viewer'
import { resolveModelForColor } from '@/lib/models'
import { cn } from '@/lib/utils'
import type { ProductWithRelations } from '@/lib/types'

type View = 'photos' | '3d'

export function ProductMedia({ product, color }: { product: ProductWithRelations; color: string | null }) {
  const [view, setView] = useState<View>('photos')
  const [activeImage, setActiveImage] = useState(0)

  const image = product.images[activeImage] ?? product.images[0]
  const model = resolveModelForColor(product.models, color)
  const hasAnyModel = product.models.length > 0
  const productLabel = `${product.brand} ${product.name}`

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Vista del producto" className="flex w-fit gap-1 rounded-full bg-muted p-1">
        <TabButton active={view === 'photos'} onClick={() => setView('photos')} controls="panel-fotos">
          <Images className="size-4" aria-hidden="true" />
          Fotos
        </TabButton>
        <TabButton active={view === '3d'} onClick={() => setView('3d')} controls="panel-3d">
          <Box className="size-4" aria-hidden="true" />
          3D y AR
        </TabButton>
      </div>

      {view === 'photos' ? (
        <div id="panel-fotos" role="tabpanel" className="flex flex-col gap-3">
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-card">
            {image && (
              <Image
                src={image.url || '/placeholder.svg'}
                alt={image.alt_text || productLabel}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`Ver foto ${i + 1}`}
                  aria-current={i === activeImage}
                  className={cn(
                    'relative size-16 overflow-hidden rounded-xl border-2 bg-card',
                    i === activeImage ? 'border-primary' : 'border-border',
                  )}
                >
                  <Image src={img.url || '/placeholder.svg'} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div id="panel-3d" role="tabpanel" className="flex flex-col gap-3">
          {model?.glb_url ? (
            <SneakerViewer
              key={model.glb_url}
              src={model.glb_url}
              alt={`Modelo 3D de ${productLabel}${model.color ? ` en color ${model.color}` : ''}`}
              poster={image?.url}
            />
          ) : (
            <NoModelNotice
              productLabel={productLabel}
              color={color}
              reason={hasAnyModel ? 'color' : 'product'}
              onShowPhotos={() => setView('photos')}
            />
          )}
        </div>
      )}
    </div>
  )
}

function NoModelNotice({
  productLabel,
  color,
  reason,
  onShowPhotos,
}: {
  productLabel: string
  color: string | null
  reason: 'product' | 'color'
  onShowPhotos: () => void
}) {
  return (
    <div className="flex aspect-square flex-col items-center justify-center gap-5 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
      <Info className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <p className="text-balance font-display text-lg font-bold">
          {reason === 'color' ? `Sin modelo 3D para el color ${color}` : 'Modelo 3D todavía no disponible'}
        </p>
        <p className="max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
          {reason === 'color'
            ? `El ${productLabel} tiene modelo 3D en otros colores. Elegí otro color o mirá las fotos de este.`
            : `El ${productLabel} aún no fue digitalizado, por eso la vista 3D y la realidad aumentada no están disponibles. Podés ver sus fotos.`}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onShowPhotos}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Ver fotos
        </button>
        <Link
          href="/demo-3d"
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          Probar el visor con un modelo de demostración
        </Link>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  controls,
  children,
}: {
  active: boolean
  onClick: () => void
  controls: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
        active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
