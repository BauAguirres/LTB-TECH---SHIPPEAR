'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Box, Images, Info } from 'lucide-react'
import { SneakerViewer } from '@/components/viewer/sneaker-viewer'
import { DEMO_SNEAKER_MODEL } from '@/lib/models'
import { cn } from '@/lib/utils'
import type { ProductWithRelations } from '@/lib/types'

type View = 'photos' | '3d'

export function ProductMedia({ product }: { product: ProductWithRelations }) {
  const [view, setView] = useState<View>('photos')
  const [activeImage, setActiveImage] = useState(0)

  const image = product.images[activeImage] ?? product.images[0]
  const ownModel = product.model?.status === 'completed' && product.model.glb_url ? product.model.glb_url : null
  const modelSrc = ownModel ?? DEMO_SNEAKER_MODEL.src
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
          {ownModel ? 'Ver en 3D y AR' : '3D de demostración'}
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
          {!ownModel && (
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-accent p-4 text-accent-foreground">
              <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p className="text-sm leading-relaxed">
                <span className="font-semibold">Modelo genérico de demostración.</span> Este producto todavía no fue
                digitalizado, así que mostramos una zapatilla genérica para que pruebes el visor y la realidad
                aumentada. No representa al {productLabel}.
              </p>
            </div>
          )}
          <SneakerViewer
            key={modelSrc}
            src={modelSrc}
            alt={ownModel ? `Modelo 3D de ${productLabel}` : DEMO_SNEAKER_MODEL.alt}
            poster={ownModel ? image?.url : undefined}
          />
          {!ownModel && (
            <p className="text-xs text-muted-foreground">
              Modelo:{' '}
              <a
                href={DEMO_SNEAKER_MODEL.attribution.href}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                {DEMO_SNEAKER_MODEL.attribution.label}
              </a>
            </p>
          )}
        </div>
      )}
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
