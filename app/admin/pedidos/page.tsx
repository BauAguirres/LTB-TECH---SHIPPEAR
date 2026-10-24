import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader, Panel, StatusBadge } from '@/components/admin/admin-ui'
import { WithdrawalStatusSelect } from '@/components/admin/withdrawal-status-select'
import { requireAdmin } from '@/lib/auth'
import { formatPrice } from '@/lib/format'
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  orderNumber,
  type OrderStatus,
  type PaymentStatus,
} from '@/lib/orders/status'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Pedidos' }

const FILTERS: { value: string; label: string }[] = [
  { value: 'todo', label: 'Para preparar' },
  { value: 'pending', label: 'Pendientes de pago' },
  { value: 'shipped', label: 'Enviados' },
  { value: 'all', label: 'Todos' },
]

const dateFormat = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' })

function statusTone(status: OrderStatus): 'primary' | 'muted' | 'danger' {
  if (status === 'cancelled') return 'danger'
  if (status === 'paid' || status === 'preparing' || status === 'ready_for_pickup') return 'primary'
  return 'muted'
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireAdmin()
  const { estado = 'todo' } = await searchParams
  const supabase = await createClient()

  // Libera reservas vencidas antes de listar, así el stock y los estados están al día.
  await supabase.rpc('expire_stale_orders')

  let query = supabase
    .from('orders')
    .select('id, status, payment_status, customer_name, customer_email, shipping_method, total_cents, created_at, is_demo')
    .order('created_at', { ascending: false })
    .limit(100)
  if (estado === 'todo') query = query.in('status', ['paid', 'preparing', 'ready_for_pickup'])
  else if (estado === 'pending') query = query.eq('status', 'pending')
  else if (estado === 'shipped') query = query.in('status', ['shipped', 'fulfilled'])

  const [{ data: orders }, { data: withdrawals }] = await Promise.all([
    query,
    supabase
      .from('withdrawal_requests')
      .select('id, code, order_reference, full_name, email, phone, reason, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return (
    <>
      <PageHeader title="Pedidos" description="Pagos de Mercado Pago, preparación y envíos." />
      <nav aria-label="Filtrar pedidos" className="mb-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/pedidos?estado=${f.value}`}
            aria-current={estado === f.value ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium',
              estado === f.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted',
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <Panel className="p-0">
        {!orders || orders.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No hay pedidos en esta vista.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Pedido</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Cliente</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Entrega</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Pago</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/pedidos/${order.id}`} className="font-mono font-semibold text-primary hover:underline">
                        #{orderNumber(order.id)}
                      </Link>
                      <p className="text-xs text-muted-foreground">{dateFormat.format(new Date(order.created_at))}</p>
                    </td>
                    <td className="max-w-48 px-4 py-3">
                      <p className="truncate">{order.customer_name ?? (order.is_demo ? 'Pedido demo' : '—')}</p>
                      <p className="truncate text-xs text-muted-foreground">{order.customer_email}</p>
                    </td>
                    <td className="px-4 py-3">{order.shipping_method === 'pickup' ? 'Retiro' : order.shipping_method === 'delivery' ? 'Envío' : '—'}</td>
                    <td className="px-4 py-3">{PAYMENT_STATUS_LABEL[order.payment_status as PaymentStatus]}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={statusTone(order.status as OrderStatus)}>
                        {ORDER_STATUS_LABEL[order.status as OrderStatus]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatPrice(Number(order.total_cents) / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <section aria-labelledby="arrepentimientos" className="mt-8">
        <h2 id="arrepentimientos" className="mb-1 font-display text-lg font-semibold">
          Solicitudes de arrepentimiento
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Por ley, el cliente puede revocar la compra dentro de los 10 días corridos desde la entrega.
        </p>
        <Panel className="p-0">
          {!withdrawals || withdrawals.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No hay solicitudes.</p>
          ) : (
            <ul className="divide-y divide-border">
              {withdrawals.map((w) => (
                <li key={w.id} className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {w.full_name} · <span className="font-mono">{w.order_reference}</span>
                    </p>
                    <p className="text-muted-foreground">
                      {w.email}
                      {w.phone ? ` · ${w.phone}` : ''} · Código {w.code} · {dateFormat.format(new Date(w.created_at))}
                    </p>
                    {w.reason && <p className="mt-1 leading-relaxed text-pretty">{w.reason}</p>}
                  </div>
                  <WithdrawalStatusSelect id={w.id} status={w.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>
    </>
  )
}
