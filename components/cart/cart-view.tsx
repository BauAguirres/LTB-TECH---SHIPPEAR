'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { OrderSummary } from '@/components/cart/order-summary'
import { buttonVariants } from '@/components/ui/button'
import { useCart } from '@/lib/cart/cart-context'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

export function CartView() {
  const { items, itemCount, subtotal, updateQuantity, removeItem } = useCart()

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center">
        <ShoppingBag className="size-10 text-muted-foreground" aria-hidden="true" />
        <h2 className="font-display text-2xl font-semibold">Tu carrito está vacío</h2>
        <p className="text-muted-foreground">Elegí unas zapatillas del catálogo para empezar.</p>
        <Link href="/catalogo" className={cn(buttonVariants({ size: 'lg' }), 'rounded-full')}>
          Explorar productos
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
        {items.map((item) => (
          <li key={item.variantId} className="flex gap-4 p-4">
            <Link
              href={`/producto/${item.slug}`}
              className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-28"
            >
              <Image src={item.image || '/placeholder.svg'} alt={item.name} fill sizes="112px" className="object-cover" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">{item.brand}</p>
              <Link href={`/producto/${item.slug}`} className="truncate font-display font-semibold hover:underline">
                {item.name}
              </Link>
              <p className="text-sm text-muted-foreground">
                Talle {item.size} · {item.color}
              </p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                <div
                  className="flex items-center rounded-full border border-border"
                  role="group"
                  aria-label={`Cantidad de ${item.name}`}
                >
                  <button
                    type="button"
                    aria-label="Restar uno"
                    disabled={item.quantity <= 1}
                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                    className="flex size-9 items-center justify-center disabled:opacity-40"
                  >
                    <Minus className="size-3.5" aria-hidden="true" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label="Sumar uno"
                    disabled={item.quantity >= item.maxStock}
                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                    className="flex size-9 items-center justify-center disabled:opacity-40"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-display font-bold">{formatPrice(item.unitPrice * item.quantity)}</p>
                  <button
                    type="button"
                    onClick={() => removeItem(item.variantId)}
                    aria-label={`Quitar ${item.name} del carrito`}
                    className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <OrderSummary subtotal={subtotal} itemCount={itemCount}>
          <Link href="/carrito/confirmacion" className={cn(buttonVariants({ size: 'lg' }), 'h-12 rounded-full text-base')}>
            Continuar con la compra
          </Link>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Compra de demostración: no se solicitan datos de pago ni se realiza ningún cobro.
          </p>
        </OrderSummary>
      </div>
    </div>
  )
}
