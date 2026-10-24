import { formatPrice } from '@/lib/format'

export function OrderSummary({
  subtotal,
  itemCount,
  shipping,
  shippingLabel,
  children,
}: {
  subtotal: number
  itemCount: number
  /** null = todavía no se eligió método de entrega */
  shipping?: number | null
  shippingLabel?: string
  children?: React.ReactNode
}) {
  const shippingKnown = typeof shipping === 'number'
  const total = subtotal + (shippingKnown ? shipping : 0)
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-semibold">Resumen</h2>
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Productos ({itemCount})</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{shippingLabel ?? 'Envío'}</dt>
          <dd>{shippingKnown ? (shipping === 0 ? 'Gratis' : formatPrice(shipping)) : 'Se calcula al confirmar'}</dd>
        </div>
        <div className="mt-2 flex justify-between border-t border-border pt-3 text-base font-semibold">
          <dt>Total</dt>
          <dd className="font-display text-xl">{formatPrice(total)}</dd>
        </div>
      </dl>
      {children}
    </div>
  )
}
