'use client'

import { useState } from 'react'
import { ProductMedia } from '@/components/product-detail/product-media'
import { PurchasePanel } from '@/components/product-detail/purchase-panel'
import type { ProductWithRelations } from '@/lib/types'

export function ProductDetail({ product }: { product: ProductWithRelations }) {
  const colors = [...new Set(product.variants.map((v) => v.color))]
  const [color, setColor] = useState<string | null>(colors[0] ?? null)

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <ProductMedia product={product} color={color} />
      <PurchasePanel product={product} color={color} onColorChange={setColor} />
    </div>
  )
}
