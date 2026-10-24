'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Minus, Plus, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart/cart-context'
import { formatPrice, getSwatch } from '@/lib/format'
import type { ProductWithRelations } from '@/lib/types'
import { cn } from '@/lib/utils'

export function PurchasePanel({
  product,
  color,
  onColorChange: setColor,
}: {
  product: ProductWithRelations
  color: string | null
  onColorChange: (color: string) => void
}) {
  const { addItem } = useCart()
  const colors = [...new Set(product.variants.map((v) => v.color))]
  const sizes = [...new Set(product.variants.map((v) => v.size))].sort((a, b) => Number(a) - Number(b))

  const [size, setSize] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  const variantsForColor = product.variants.filter((v) => v.color === color)
  const variant = size ? variantsForColor.find((v) => v.size === size) : undefined
  const stock = variant?.stock ?? 0
  const colorHasStock = variantsForColor.some((v) => v.stock > 0)

  function selectColor(next: string) {
    setColor(next)
    const stillAvailable = product.variants.find((v) => v.color === next && v.size === size && v.stock > 0)
    if (!stillAvailable) setSize(null)
    setQuantity(1)
  }

  function handleAdd() {
    if (!variant || variant.stock === 0) return
    const { added, capped } = addItem({
      variantId: variant.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      image: product.images[0]?.url ?? '',
      size: variant.size,
      color: variant.color,
      unitPrice: product.price,
      quantity,
      maxStock: variant.stock,
    })
    if (added === 0) {
      toast.error('Ya tenés en el carrito todo el stock disponible de este talle.')
      return
    }
    toast.success(`${product.name} · talle ${variant.size} agregado al carrito`, {
      description: capped ? `Se agregaron ${added} por límite de stock.` : undefined,
      action: { label: 'Ver carrito', onClick: () => (window.location.href = '/carrito') },
    })
    setQuantity(1)
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{product.brand}</p>
        <h1 className="font-display text-4xl font-bold text-balance md:text-5xl">{product.name}</h1>
        <p className="font-display text-3xl font-bold">{formatPrice(product.price)}</p>
      </div>

      <p className="leading-relaxed text-pretty text-muted-foreground">{product.description}</p>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-semibold">
          Color: <span className="font-normal text-muted-foreground">{color}</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === color}
              aria-label={c}
              onClick={() => selectColor(c)}
              className={cn(
                'size-10 rounded-full border-2 p-0.5 transition-colors',
                c === color ? 'border-primary' : 'border-transparent hover:border-border',
              )}
            >
              <span className="block size-full rounded-full border border-border" style={{ backgroundColor: getSwatch(c) }} />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-semibold">Talle (AR)</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {sizes.map((s) => {
            const v = variantsForColor.find((x) => x.size === s)
            const available = !!v && v.stock > 0
            const selected = s === size
            return (
              <button
                key={s}
                type="button"
                disabled={!available}
                aria-pressed={selected}
                aria-label={available ? `Talle ${s}` : `Talle ${s}, sin stock`}
                onClick={() => {
                  setSize(s)
                  setQuantity(1)
                }}
                className={cn(
                  'h-11 rounded-lg border text-sm font-semibold transition-colors',
                  selected && 'border-primary bg-primary text-primary-foreground',
                  !selected && available && 'border-border bg-card hover:border-foreground',
                  !available && 'cursor-not-allowed border-border bg-muted text-muted-foreground line-through',
                )}
              >
                {s}
              </button>
            )
          })}
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {!colorHasStock
            ? 'Este color está agotado.'
            : variant
              ? stock <= 3
                ? `Quedan ${stock} unidades en este talle.`
                : `${stock} unidades disponibles.`
              : 'Elegí un talle para ver la disponibilidad.'}
        </p>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex h-12 items-center rounded-full border border-border bg-card" role="group" aria-label="Cantidad">
          <button
            type="button"
            aria-label="Restar uno"
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex size-12 items-center justify-center rounded-full disabled:opacity-40"
          >
            <Minus className="size-4" aria-hidden="true" />
          </button>
          <span className="w-8 text-center font-semibold" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Sumar uno"
            disabled={!variant || quantity >= stock}
            onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
            className="flex size-12 items-center justify-center rounded-full disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
        <Button
          size="lg"
          onClick={handleAdd}
          disabled={!variant || stock === 0}
          className="h-12 flex-1 rounded-full text-base"
        >
          <ShoppingBag className="size-4" aria-hidden="true" />
          {variant ? 'Agregar al carrito' : 'Elegí un talle'}
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Compra de demostración: no se realizan cobros. <Link href="/carrito" className="underline">Ir al carrito</Link>
      </p>
    </div>
  )
}
