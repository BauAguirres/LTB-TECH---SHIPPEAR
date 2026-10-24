'use server'

import { revalidatePath } from 'next/cache'
import { getAdminClient } from '@/lib/auth'
import { nextStatuses, type OrderStatus } from '@/lib/orders/status'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Result = { ok: true } | { ok: false; error: string }

function done(orderId: string): Result {
  revalidatePath('/admin/pedidos')
  revalidatePath(`/admin/pedidos/${orderId}`)
  revalidatePath('/admin')
  return { ok: true }
}

export async function updateOrderFulfillment(input: {
  orderId: string
  status: OrderStatus
  trackingCarrier: string
  trackingCode: string
  adminNotes: string
}): Promise<Result> {
  if (!UUID_RE.test(input?.orderId ?? '')) return { ok: false, error: 'Pedido inválido.' }
  const { supabase, error } = await getAdminClient()
  if (!supabase) return { ok: false, error }

  const { data: order } = await supabase
    .from('orders')
    .select('status, payment_status, shipping_method')
    .eq('id', input.orderId)
    .maybeSingle()
  if (!order) return { ok: false, error: 'No encontramos el pedido.' }
  if (order.status === 'cancelled') return { ok: false, error: 'El pedido está cancelado.' }

  const allowed = nextStatuses(order.shipping_method)
  if (input.status !== order.status) {
    if (order.payment_status !== 'approved') {
      return { ok: false, error: 'Solo se puede avanzar el estado de pedidos con el pago aprobado.' }
    }
    if (!allowed.includes(input.status)) return { ok: false, error: 'Estado no válido para este método de entrega.' }
  }

  const trackingCode = input.trackingCode.trim().slice(0, 80)
  if (input.status === 'shipped' && !trackingCode) {
    return { ok: false, error: 'Cargá el código de seguimiento para marcarlo como enviado.' }
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: input.status,
      tracking_carrier: input.trackingCarrier.trim().slice(0, 60) || null,
      tracking_code: trackingCode || null,
      admin_notes: input.adminNotes.trim().slice(0, 2000) || null,
    })
    .eq('id', input.orderId)
  if (updateError) return { ok: false, error: 'No pudimos guardar los cambios.' }
  return done(input.orderId)
}

export async function cancelOrder(orderId: string): Promise<Result> {
  if (!UUID_RE.test(orderId ?? '')) return { ok: false, error: 'Pedido inválido.' }
  const { supabase, error } = await getAdminClient()
  if (!supabase) return { ok: false, error }

  const { data: order } = await supabase.from('orders').select('status, payment_status').eq('id', orderId).maybeSingle()
  if (!order) return { ok: false, error: 'No encontramos el pedido.' }
  if (['shipped', 'fulfilled', 'cancelled'].includes(order.status)) {
    return { ok: false, error: 'Este pedido ya no se puede cancelar.' }
  }

  const { error: rpcError } = await supabase.rpc('cancel_order', { p_order_id: orderId })
  if (rpcError) return { ok: false, error: 'No pudimos cancelar el pedido.' }
  revalidatePath('/', 'layout')
  return done(orderId)
}

export async function updateWithdrawalStatus(id: string, status: string): Promise<Result> {
  if (!UUID_RE.test(id ?? '') || !['received', 'in_review', 'resolved', 'rejected'].includes(status)) {
    return { ok: false, error: 'Datos inválidos.' }
  }
  const { supabase, error } = await getAdminClient()
  if (!supabase) return { ok: false, error }
  const { error: updateError } = await supabase.from('withdrawal_requests').update({ status }).eq('id', id)
  if (updateError) return { ok: false, error: 'No pudimos actualizar la solicitud.' }
  revalidatePath('/admin/pedidos')
  return { ok: true }
}
