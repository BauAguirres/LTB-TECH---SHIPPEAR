'use client'

import { useState } from 'react'
import { SneakerViewer } from '@/components/viewer/sneaker-viewer'
import { Button } from '@/components/ui/button'
import { DEMO_SNEAKER_MODEL } from '@/lib/models'

export function DemoViewer() {
  const [variant, setVariant] = useState<string>(DEMO_SNEAKER_MODEL.variants[0].name)

  return (
    <div className="flex flex-col gap-4">
      <SneakerViewer src={DEMO_SNEAKER_MODEL.src} alt={DEMO_SNEAKER_MODEL.alt} variantName={variant} />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Variante del modelo</span>
        <div role="group" aria-label="Variante del modelo" className="flex flex-wrap gap-2">
          {DEMO_SNEAKER_MODEL.variants.map((v) => (
            <Button
              key={v.name}
              size="sm"
              variant={variant === v.name ? 'default' : 'outline'}
              aria-pressed={variant === v.name}
              onClick={() => setVariant(v.name)}
            >
              {v.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
