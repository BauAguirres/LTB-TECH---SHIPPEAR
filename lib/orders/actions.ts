'use server'

import { revalidatePath } from 'next/cache'
import { createPreference, isMercadoPagoConfigured } from '@/lib/mercadopago'
import { getRequestOrigin } from '@/lib/site-url'
import { createServiceClient } from '@/lib/supabase/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_LINES = 20
const MAX_QTY = 20

export interface CheckoutInput {
  idempotencyKey: string
  items: { variantId: string; quantity: number }[]
  customer: { name: string; email: string; phone: string; dni: string }
  shippingMethod: 'delivery' | 'pickup'
  address?: {
    street: string
    number: string
    apartment?: string
    city: string
    province: string
    postalCode: string
    notes?: string
  }
  acceptedTerms: boolean
}

export type CheckoutResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string; field?: string; unavailableVariantId?: string }

const ERRORS: Record<string, { message: string; field?: string }> = {
  INVALID_REQUEST: { message: 'No pudimos procesar el pedido. Recargá la página e intentá de nuevo.' },
  INVALID_ITEMS: { message: 'El carrito tiene datos inválidos. Revisalo e intentá de nuevo.' },
  INVALID_QUANTITY: { message: `Cada producto admite entre 1 y ${MAX_QTY} unidades.` },
  DUPLICATE_VARIANT: { message: 'El carrito tiene productos repetidos. Revisalo e intentá de nuevo.' },
  INVALID_EMAIL: { message: 'Ingresá un email válido.', field: 'email' },
  INVALID_NAME: { message: 'Ingresá tu nombre y apellido.', field: 'name' },
  INVALID_PHONE: { message: 'Ingresá un teléfono con código de área.', field: 'phone' },
  INVALID_DNI: { message: 'Ingresá un DNI o CUIT válido.', field: 'dni' },
  INVALID_ADDRESS: { message: 'Revisá la dirección de envío: calle, número, ciudad, provincia y código postal.', field: 'address' },
  INVALID_SHIPPING: { message: 'Elegí un método de entrega.' },
  SHIPPING_UNAVAILABLE: { message: 'El envío a domicilio no está disponible en este momento.' },
  PICKUP_UNAVAILABLE: { message: 'El retiro en el local no está disponible en este momento.' },
  VARIANT_UNAVAILABLE: { message: 'Uno de los productos ya no está disponible. Quitalo del carrito para continuar.' },
  INSUFFICIENT_STOCK: { message: 'No hay stock suficiente para uno de los productos. Ajustá la cantidad para continuar.' },
}

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function startCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  if (!isMercadoPagoConfigured()) {
    return { ok: false, error: 'Los pagos todavía no están habilitados en la tienda. Intentá más tarde.' }
  }
  if (input?.acceptedTerms !== true) {
    return { ok: false, error: 'Tenés que aceptar los términos y condiciones para continuar.', field: 'terms' }
  }
  if (typeof input.idempotencyKey !== 'string' || !UUID_RE.test(input.idempotencyKey)) {
    return { ok: false, error: ERRORS.INVALID_REQUEST.message }
  }
  const items = Array.isArray(input.items) ? input.items : []
  if (items.length === 0 || items.length > MAX_LINES) return { ok: false, error: ERRORS.INVALID_ITEMS.message }
  for (const item of items) {
    if (typeof item?.variantId !== 'string' || !UUID_RE.test(item.variantId)) {
      return { ok: false, error: ERRORS.INVALID_ITEMS.message }
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QTY) {
      return { ok: false, error: ERRORS.INVALID_QUANTITY.message }
    }
  }
  const method = input.shippingMethod === 'pickup' ? 'pickup' : input.shippingMethod === 'delivery' ? 'delivery' : null
  if (!method) return { ok: false, error: ERRORS.INVALID_SHIPPING.message }

  const customer = {
    name: str(input.customer?.name, 120),
    email: str(input.customer?.email, 254),
    phone: str(input.customer?.phone, 40),
    dni: str(input.customer?.dni, 20),
  }
  const address =
    method === 'delivery'
      ? {
          street: str(input.address?.street, 120),
          number: str(input.address?.number, 12),
          apartment: str(input.address?.apartment, 40),
          city: str(input.address?.city, 80),
          province: str(input.address?.province, 60),
          postal_code: str(input.address?.postalCode, 10),
          notes: str(input.address?.notes, 300),
        }
      : null

  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc('place_order', {
    p_items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
    p_idempotency_key: input.idempotencyKey,
    p_customer: customer,
    p_shipping_method: method,
    p_address: address,
  })

  if (error) {
    const [code, variantId] = (error.message ?? '').split(':')
    const known = ERRORS[code]
    if (!known) console.error('[orders] place_order failed', error.code, error.message)
    return {
      ok: false,
      error: known?.message ?? 'No pudimos registrar el pedido. Intentá de nuevo en unos segundos.',
      field: known?.field,
      unavailableVariantId: variantId && UUID_RE.test(variantId) ? variantId : undefined,
    }
  }

  const placed = data as { order_id: string; access_token: string; status: string; duplicate: boolean }
  const origin = await getRequestOrigin()
  const orderUrl = `${origin}/pedido/${placed.order_id}?t=${placed.access_token}`

  // Reintento de un pedido ya pagado o cancelado: mostrar su estado en vez de cobrar de nuevo.
  if (placed.status !== 'pending') return { ok: true, redirectUrl: orderUrl }

  const { data: order } = await supabase
    .from('orders')
    .select('shipping_cents, expires_at, order_items(variant_id, product_name, size, color, unit_price_cents, quantity)')
    .eq('id', placed.order_id)
    .single()
  if (!order) return { ok: false, error: 'No pudimos preparar el pago. Intentá de nuevo.' }

  try {
    const preference = await createPreference({
      orderId: placed.order_id,
      items: order.order_items.map((item) => ({
        id: item.variant_id ?? 'item',
        title: `${item.product_name} · Talle ${item.size} · ${item.color}`,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price_cents) / 100,
      })),
      shipping: Number(order.shipping_cents) / 100,
      payer: { email: customer.email, name: customer.name },
      backUrl: orderUrl,
      // Mercado Pago solo puede notificar a URLs públicas por HTTPS.
      notificationUrl: origin.startsWith('https://') ? `${origin}/api/mercadopago/webhook` : null,
      expiresAt: order.expires_at ? new Date(order.expires_at) : new Date(Date.now() + 60 * 60 * 1000),
      idempotencyKey: input.idempotencyKey,
    })
    await supabase.from('orders').update({ mp_preference_id: preference.id }).eq('id', placed.order_id)
    revalidatePath('/', 'layout')
    return { ok: true, redirectUrl: preference.initPoint }
  } catch (err) {
    console.error('[orders] createPreference failed', err instanceof Error ? err.message : err)
    // Sin preferencia no hay forma de pagar: liberamos el stock reservado.
    await supabase.rpc('cancel_order', { p_order_id: placed.order_id })
    return { ok: false, error: 'No pudimos conectar con Mercado Pago. Intentá de nuevo en unos minutos.' }
  }
}
