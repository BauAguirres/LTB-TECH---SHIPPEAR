'use client'

import { useId } from 'react'
import type { ProductOption } from '@/components/admin/digitization/digitization-workspace'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ALL_COLORS = '__all__'
const NO_PRODUCT = '__none__'

export function TargetSelects({
  products,
  productId,
  color,
  onProductChange,
  onColorChange,
  optionalProduct = false,
  disabled = false,
}: {
  products: ProductOption[]
  productId: string | null
  color: string | null
  onProductChange: (id: string | null) => void
  onColorChange: (color: string | null) => void
  optionalProduct?: boolean
  disabled?: boolean
}) {
  const id = useId()
  const product = products.find((p) => p.value === productId)
  const productItems = [
    ...(optionalProduct ? [{ value: NO_PRODUCT, label: 'Asociar más tarde' }] : []),
    ...products.map((p) => ({ value: p.value, label: p.label })),
  ]
  const colorItems = [
    { value: ALL_COLORS, label: 'Todos los colores' },
    ...(product?.colors ?? []).map((c) => ({ value: c, label: c })),
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" id={`${id}-product`}>
          Producto
        </label>
        <Select
          items={productItems}
          value={productId ?? (optionalProduct ? NO_PRODUCT : null)}
          onValueChange={(v) => onProductChange(!v || v === NO_PRODUCT ? null : (v as string))}
          disabled={disabled}
        >
          <SelectTrigger aria-labelledby={`${id}-product`} className="w-full bg-background">
            <SelectValue placeholder="Elegí un producto" />
          </SelectTrigger>
          <SelectContent>
            {productItems.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" id={`${id}-color`}>
          Color / variante
        </label>
        <Select
          items={colorItems}
          value={color ?? ALL_COLORS}
          onValueChange={(v) => onColorChange(!v || v === ALL_COLORS ? null : (v as string))}
          disabled={disabled || !product}
        >
          <SelectTrigger aria-labelledby={`${id}-color`} className="w-full bg-background">
            <SelectValue placeholder="Todos los colores" />
          </SelectTrigger>
          <SelectContent>
            {colorItems.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
