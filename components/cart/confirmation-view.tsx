'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { OrderSummary } from '@/components/cart/order-summary'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCart } from '@/lib/cart/cart-context'
import { formatPrice } from '@/lib/format'
import { placeDemoOrder } from '@/lib/orders/actions'
import { cn } from '@/lib/utils'

interface ConfirmedOrder {
  orderId: string
  total: number
  count: number
}

export function ConfirmationView() {
  const { items, itemCount, subtotal, clear } = useCart()
  const [confirmed, setConfirmed] = useState<ConfirmedOrder | null>(null)
  const [error, setError] = useState<{ message: string; variantId?: string } | null>(null)
  const [email, setEmail] = useState('')
  // Misma clave en reintentos: si la respuesta se pierde, el servidor no duplica el pedido.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())
  const [pending, startTransition] = useTransition()

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await placeDemoOrder({
        idempotencyKey,
        email,
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      })
      if (result.ok) {
        setConfirmed({ orderId: result.orderId, total: result.total, count: result.itemCount })
        clear()
        setIdempotencyKey(crypto.randomUUID())
      } else {
        setError({ message: result.error, variantId: result.unavailableVariantId })
        // El pedido fue rechazado sin guardarse: el próximo intento (con el carrito corregido) es uno nuevo.
        setIdempotencyKey(crypto.randomUUID())
      }
    })
  }

  if (confirmed) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-14 text-center">
        <CheckCircle2 className="size-12 text-primary" aria-hidden="true" />
        <h2 className="font-display text-3xl font-bold text-balance">¡Pedido de demostración confirmado!</h2>
        <p className="leading-relaxed text-muted-foreground text-pretty">
          Registramos {confirmed.count} {confirmed.count === 1 ? 'producto' : 'productos'} por{' '}
          {formatPrice(confirmed.total)} y descontamos el stock. No se realizó ningún cobro.
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          Pedido #{confirmed.orderId.slice(0, 8).toUpperCase()}
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
            <li
              key={item.variantId}
              className={cn(
                'flex justify-between gap-4 py-3 text-sm',
                error?.variantId === item.variantId && 'text-destructive',
              )}
            >
              <div>
                <p className="font-semibold">
                  {item.brand} {item.name}
                </p>
                <p className={cn(error?.variantId !== item.variantId && 'text-muted-foreground')}>
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
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (!pending) submit()
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="order-email">Email (opcional)</Label>
              <Input
                id="order-email"
                type="email"
                autoComplete="email"
                maxLength={254}
                placeholder="vos@ejemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="flex gap-2 text-sm leading-relaxed text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {error.message}
              </p>
            )}
            <Button type="submit" size="lg" disabled={pending} className="h-12 rounded-full text-base">
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Registrando pedido…
                </>
              ) : (
                'Confirmar pedido de demostración'
              )}
            </Button>
          </form>
          <p className="text-xs leading-relaxed text-muted-foreground">
            El total final se calcula con los precios vigentes. No se solicitan datos de pago.
          </p>
          <Link href="/carrito" className="text-center text-sm font-medium text-muted-foreground hover:text-foreground">
            Volver al carrito
          </Link>
        </OrderSummary>
      </div>
    </div>
  )
}
