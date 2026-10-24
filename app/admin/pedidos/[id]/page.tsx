import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PageHeader, Panel, StatusBadge } from '@/components/admin/admin-ui'
import { OrderManager } from '@/components/admin/order-manager'
import { requireAdmin } from '@/lib/auth'
import { formatPrice } from '@/lib/format'
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  nextStatuses,
  orderNumber,
  type OrderStatus,
  type PaymentStatus,
} from '@/lib/orders/status'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Detalle del pedido' }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const dateFormat = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' })

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const supabase = await createClient()
  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(id, product_name, size, color, unit_price_cents, quantity)')
    .eq('id', id)
    .maybeSingle()
  if (!order) notFound()

  const status = order.status as OrderStatus
  const payment = order.payment_status as PaymentStatus
  const method = order.shipping_method as 'delivery' | 'pickup' | null
  const address = order.shipping_address as Record<string, string | null> | null
  const customerUrl = `/pedido/${order.id}?t=${order.access_token}`

  return (
    <>
      <Link href="/admin/pedidos" className="mb-3 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Pedidos
      </Link>
      <PageHeader
        title={`Pedido #${orderNumber(order.id)}`}
        description={`Creado el ${dateFormat.format(new Date(order.created_at))}`}
        action={
          <div className="flex gap-2">
            <StatusBadge tone={status === 'cancelled' ? 'danger' : 'primary'}>{ORDER_STATUS_LABEL[status]}</StatusBadge>
            <StatusBadge tone={payment === 'approved' ? 'primary' : payment === 'rejected' ? 'danger' : 'muted'}>
              Pago {PAYMENT_STATUS_LABEL[payment].toLowerCase()}
            </StatusBadge>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-4">
          <Panel>
            <h2 className="mb-3 font-display text-lg font-semibold">Productos</h2>
            <ul className="flex flex-col divide-y divide-border text-sm">
              {order.order_items.map((item: { id: string; product_name: string; size: string; color: string; unit_price_cents: number; quantity: number }) => (
                <li key={item.id} className="flex justify-between gap-4 py-2.5">
                  <span>
                    <span className="font-semibold">{item.product_name}</span>
                    <span className="block text-muted-foreground">
                      Talle {item.size} · {item.color} · x{item.quantity}
                    </span>
                  </span>
                  <span>{formatPrice((Number(item.unit_price_cents) * item.quantity) / 100)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatPrice(Number(order.subtotal_cents) / 100)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Envío</dt>
                <dd>{formatPrice(Number(order.shipping_cents) / 100)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Total</dt>
                <dd>{formatPrice(Number(order.total_cents) / 100)}</dd>
              </div>
            </dl>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel>
              <h2 className="mb-2 font-display text-lg font-semibold">Cliente</h2>
              <dl className="flex flex-col gap-1 text-sm">
                <dt className="sr-only">Nombre</dt>
                <dd className="font-semibold">{order.customer_name ?? '—'}</dd>
                <dt className="sr-only">Email</dt>
                <dd>
                  {order.customer_email ? (
                    <a href={`mailto:${order.customer_email}`} className="text-primary hover:underline">
                      {order.customer_email}
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
                <dt className="sr-only">Teléfono</dt>
                <dd>{order.customer_phone ?? '—'}</dd>
                <dt className="sr-only">DNI o CUIT</dt>
                <dd className="text-muted-foreground">DNI/CUIT {order.customer_dni ?? '—'}</dd>
              </dl>
            </Panel>
            <Panel>
              <h2 className="mb-2 font-display text-lg font-semibold">Entrega</h2>
              {method === 'pickup' ? (
                <p className="text-sm">Retiro en el local</p>
              ) : address ? (
                <address className="flex flex-col gap-0.5 text-sm not-italic">
                  <span>
                    {address.street} {address.number}
                    {address.apartment ? `, ${address.apartment}` : ''}
                  </span>
                  <span>
                    {address.city}, {address.province}
                  </span>
                  <span>CP {address.postal_code}</span>
                  {address.notes && <span className="mt-1 text-muted-foreground">{address.notes}</span>}
                </address>
              ) : (
                <p className="text-sm text-muted-foreground">Sin datos de entrega.</p>
              )}
            </Panel>
          </div>

          <Panel>
            <h2 className="mb-2 font-display text-lg font-semibold">Pago</h2>
            <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-muted-foreground">Medio</dt>
              <dd>{order.payment_provider === 'mercadopago' ? 'Mercado Pago' : order.is_demo ? 'Pedido demo (sin cobro)' : '—'}</dd>
              <dt className="text-muted-foreground">ID de pago</dt>
              <dd className="font-mono">{order.mp_payment_id ?? '—'}</dd>
              <dt className="text-muted-foreground">Acreditado</dt>
              <dd>{order.paid_at ? dateFormat.format(new Date(order.paid_at)) : '—'}</dd>
            </dl>
            <Link href={customerUrl} target="_blank" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Ver la página que ve el cliente
            </Link>
          </Panel>
        </div>

        <Panel className="xl:sticky xl:top-6 xl:self-start">
          <h2 className="mb-4 font-display text-lg font-semibold">Preparación y envío</h2>
          <OrderManager
            orderId={order.id}
            status={status}
            statuses={nextStatuses(method)}
            canAdvance={payment === 'approved' && status !== 'cancelled'}
            canCancel={!['shipped', 'fulfilled', 'cancelled'].includes(status)}
            shippingMethod={method}
            trackingCarrier={order.tracking_carrier}
            trackingCode={order.tracking_code}
            adminNotes={order.admin_notes}
          />
        </Panel>
      </div>
    </>
  )
}
