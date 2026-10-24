import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Clock, PackageCheck, XCircle } from 'lucide-react'
import { ClearCart } from '@/components/cart/clear-cart'
import { buttonVariants } from '@/components/ui/button'
import { formatPrice } from '@/lib/format'
import { isMercadoPagoConfigured } from '@/lib/mercadopago'
import { syncPayment } from '@/lib/orders/payments'
import { ORDER_STATUS_LABEL, orderNumber, type OrderStatus, type PaymentStatus } from '@/lib/orders/status'
import { getStoreSettings } from '@/lib/store-settings'
import { createServiceClient } from '@/lib/supabase/admin'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Estado del pedido', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const query = await searchParams
  const token = typeof query.t === 'string' ? query.t : ''
  if (!UUID_RE.test(id) || !UUID_RE.test(token)) notFound()

  const supabase = createServiceClient()
  const load = () =>
    supabase
      .from('orders')
      .select(
        'id, access_token, status, payment_status, customer_name, customer_email, shipping_method, shipping_address, subtotal_cents, shipping_cents, total_cents, tracking_carrier, tracking_code, created_at, order_items(id, product_name, size, color, unit_price_cents, quantity)',
      )
      .eq('id', id)
      .maybeSingle()

  let { data: order } = await load()
  // El token evita que se pueda adivinar un pedido ajeno a partir de su id.
  if (!order || order.access_token !== token) notFound()

  // Al volver de Mercado Pago llega el id del pago: lo verificamos sin esperar al webhook.
  const paymentId = typeof query.payment_id === 'string' ? query.payment_id : null
  if (paymentId && paymentId !== 'null' && isMercadoPagoConfigured() && order.payment_status !== 'approved') {
    try {
      await syncPayment(paymentId, id)
      order = (await load()).data ?? order
    } catch (err) {
      console.error('[order] sync on return failed', err instanceof Error ? err.message : err)
    }
  }

  const settings = await getStoreSettings()
  const status = order.status as OrderStatus
  const payment = order.payment_status as PaymentStatus
  const paid = payment === 'approved'
  const address = order.shipping_address as Record<string, string | null> | null

  const hero = paid
    ? { icon: CheckCircle2, tone: 'text-primary', title: '¡Gracias por tu compra!', text: `Recibimos el pago. Te escribimos a ${order.customer_email} con cada novedad del pedido.` }
    : status === 'cancelled'
      ? { icon: XCircle, tone: 'text-destructive', title: 'Pedido cancelado', text: 'El pago no se completó a tiempo o fue rechazado. No se realizó ningún cobro y el stock se liberó.' }
      : payment === 'in_process'
        ? { icon: Clock, tone: 'text-muted-foreground', title: 'Pago en revisión', text: 'Mercado Pago está revisando el pago. Esta página se actualiza cuando se acredite.' }
        : payment === 'rejected'
          ? { icon: XCircle, tone: 'text-destructive', title: 'El pago fue rechazado', text: 'Podés volver a intentar con otro medio de pago desde el carrito.' }
          : { icon: Clock, tone: 'text-muted-foreground', title: 'Esperando el pago', text: 'Si ya pagaste en efectivo o el pago está pendiente, lo verás reflejado acá cuando se acredite.' }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-8 md:px-6">
      {paid && <ClearCart />}
      <section className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-10 text-center">
        <hero.icon className={cn('size-12', hero.tone)} aria-hidden="true" />
        <h1 className="font-display text-3xl font-bold text-balance">{hero.title}</h1>
        <p className="max-w-lg leading-relaxed text-muted-foreground text-pretty">{hero.text}</p>
        <p className="font-mono text-sm">Pedido #{orderNumber(order.id)}</p>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{ORDER_STATUS_LABEL[status]}</span>
      </section>

      {order.tracking_code && (
        <section className="flex items-start gap-3 rounded-2xl border border-border bg-card p-6">
          <PackageCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Seguimiento del envío</h2>
            <p className="text-sm text-muted-foreground">
              {order.tracking_carrier ? `${order.tracking_carrier} · ` : ''}
              <span className="font-mono text-foreground">{order.tracking_code}</span>
            </p>
          </div>
        </section>
      )}

      <section className="grid gap-6 rounded-2xl border border-border bg-card p-6 md:grid-cols-2">
        <div className="flex flex-col gap-1 text-sm">
          <h2 className="mb-1 font-semibold">Entrega</h2>
          {order.shipping_method === 'pickup' ? (
            <>
              <p>Retiro en el local</p>
              <p className="text-muted-foreground">{settings.pickupAddress}</p>
              {settings.pickupHours && <p className="text-muted-foreground">{settings.pickupHours}</p>}
            </>
          ) : (
            address && (
              <>
                <p>Envío a domicilio · {settings.shippingEta}</p>
                <p className="text-muted-foreground">
                  {address.street} {address.number}
                  {address.apartment ? `, ${address.apartment}` : ''}
                </p>
                <p className="text-muted-foreground">
                  {address.city}, {address.province} ({address.postal_code})
                </p>
              </>
            )
          )}
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <h2 className="mb-1 font-semibold">Comprador</h2>
          <p>{order.customer_name}</p>
          <p className="text-muted-foreground">{order.customer_email}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-3 font-semibold">Detalle</h2>
        <ul className="flex flex-col divide-y divide-border text-sm">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-3">
              <div>
                <p className="font-semibold">{item.product_name}</p>
                <p className="text-muted-foreground">
                  Talle {item.size} · {item.color} · x{item.quantity}
                </p>
              </div>
              <p>{formatPrice((Number(item.unit_price_cents) * item.quantity) / 100)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-3 flex flex-col gap-2 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatPrice(Number(order.subtotal_cents) / 100)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Envío</dt>
            <dd>{Number(order.shipping_cents) === 0 ? 'Gratis' : formatPrice(Number(order.shipping_cents) / 100)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd className="font-display text-xl">{formatPrice(Number(order.total_cents) / 100)}</dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link href="/catalogo" className={cn(buttonVariants({ size: 'lg' }), 'rounded-full')}>
          Seguir comprando
        </Link>
        {paid && (
          <Link href="/arrepentimiento" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'rounded-full')}>
            Botón de arrepentimiento
          </Link>
        )}
      </div>
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Guardá este enlace para consultar tu pedido. ¿Dudas? Escribinos
        {settings.contactEmail ? ` a ${settings.contactEmail}` : ''} indicando el número de pedido.
      </p>
    </div>
  )
}
