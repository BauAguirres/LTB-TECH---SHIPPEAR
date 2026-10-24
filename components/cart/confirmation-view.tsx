'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { OrderSummary } from '@/components/cart/order-summary'
import { Button, buttonVariants } from '@/components/ui/button'
import { useCart } from '@/lib/cart/cart-context'
import { formatPrice } from '@/lib/format'
import type { CartItem } from '@/lib/types'
import { cn } from '@/lib/utils'

export function ConfirmationView() {
  const { items, itemCount, subtotal, clear } = useCart()
  const [confirmed, setConfirmed] = useState<{ items: CartItem[]; total: number; count: number } | null>(null)

  if (confirmed) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-14 text-center">
        <CheckCircle2 className="size-12 text-primary" aria-hidden="true" />
        <h2 className="font-display text-3xl font-bold">¡Pedido de demostración confirmado!</h2>
        <p className="leading-relaxed text-muted-foreground">
          Registramos {confirmed.count} {confirmed.count === 1 ? 'producto' : 'productos'} por{' '}
          {formatPrice(confirmed.total)}. No se realizó ningún cobro. En una próxima fase los pedidos se guardarán y
          descontarán stock automáticamente.
        </p>
        <Link href="/catalogo" className={cn(buttonVariants({ size: 'lg' }), 'rounded-full')}>
          Seguir explorando
        </Link>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <p className="font-display text-xl font-semibold">No hay productos para confirmar</p>
        <Link href="/catalogo" className={cn(buttonVariants({ size: 'lg' }), 'rounded-full')}>
          Ir al catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="detalle" className="rounded-2xl border border-border bg-card p-6">
        <h2 id="detalle" className="mb-4 font-display text-xl font-semibold">
          Detalle del pedido
        </h2>
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <li key={item.variantId} className="flex justify-between gap-4 py-3 text-sm">
              <div>
                <p className="font-semibold">
                  {item.brand} {item.name}
                </p>
                <p className="text-muted-foreground">
                  Talle {item.size} · {item.color} · x{item.quantity}
                </p>
              </div>
              <p className="font-semibold">{formatPrice(item.unitPrice * item.quantity)}</p>
            </li>
          ))}
        </ul>
      </section>
      <div className="lg:sticky lg:top-24 lg:self-start">
        <OrderSummary subtotal={subtotal} itemCount={itemCount}>
          <Button
            size="lg"
            className="h-12 rounded-full text-base"
            onClick={() => {
              setConfirmed({ items, total: subtotal, count: itemCount })
              clear()
            }}
          >
            Confirmar pedido de demostración
          </Button>
          <Link href="/carrito" className="text-center text-sm font-medium text-muted-foreground hover:text-foreground">
            Volver al carrito
          </Link>
        </OrderSummary>
      </div>
    </div>
  )
}
