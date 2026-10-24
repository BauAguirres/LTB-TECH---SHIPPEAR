import 'server-only'
import { revalidatePath } from 'next/cache'
import { getPayment } from '@/lib/mercadopago'
import { createServiceClient } from '@/lib/supabase/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Consulta el pago a Mercado Pago (fuente de verdad) y lo aplica al pedido.
 * Lo usan el webhook y la página de retorno, así el pedido se actualiza aunque el webhook demore.
 */
export async function syncPayment(paymentId: string, expectedOrderId?: string) {
  const payment = await getPayment(paymentId)
  if (!payment) return { ok: false as const, reason: 'not_found' }

  const orderId = payment.externalReference
  if (!orderId || !UUID_RE.test(orderId)) return { ok: false as const, reason: 'no_reference' }
  if (expectedOrderId && expectedOrderId !== orderId) return { ok: false as const, reason: 'mismatch' }
  if (payment.currency !== 'ARS') return { ok: false as const, reason: 'currency' }

  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc('apply_payment', {
    p_order_id: orderId,
    p_payment_id: payment.id,
    p_mp_status: payment.status,
    p_amount_cents: payment.amountCents,
  })
  if (error) {
    console.error('[payments] apply_payment failed', error.message)
    return { ok: false as const, reason: 'db' }
  }

  revalidatePath('/', 'layout')
  return { ok: true as const, orderId, result: data as { status: string; payment_status: string } }
}
