'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_LINES = 20
const MAX_QTY = 20

export interface PlaceOrderInput {
  idempotencyKey: string
  email?: string
  items: { variantId: string; quantity: number }[]
}

export type PlaceOrderResult =
  | { ok: true; orderId: string; total: number; itemCount: number }
  | { ok: false; error: string; unavailableVariantId?: string; keepIdempotencyKey?: boolean }

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_REQUEST: 'No pudimos procesar el pedido. Recargá la página e intentá de nuevo.',
  INVALID_ITEMS: 'El carrito tiene datos inválidos. Revisalo e intentá de nuevo.',
  INVALID_QUANTITY: `Cada producto admite entre 1 y ${MAX_QTY} unidades.`,
  INVALID_EMAIL: 'El email no es válido.',
  DUPLICATE_VARIANT: 'El carrito tiene productos repetidos. Revisalo e intentá de nuevo.',
  VARIANT_UNAVAILABLE: 'Uno de los productos ya no está disponible. Quitalo del carrito para continuar.',
  INSUFFICIENT_STOCK: 'No hay stock suficiente para uno de los productos. Ajustá la cantidad para continuar.',
}

const GENERIC_ERROR = 'No pudimos registrar el pedido. Intentá de nuevo en unos segundos.'

function parsePlaceOrderPayload(data: unknown) {
  if (!data || typeof data !== 'object') return null
  const result = data as Record<string, unknown>
  if (typeof result.order_id !== 'string' || !UUID_RE.test(result.order_id)) return null
  const totalCents = Number(result.total_cents)
  const itemCount = Number(result.item_count)
  if (!Number.isFinite(totalCents) || !Number.isFinite(itemCount)) return null
  return { orderId: result.order_id, totalCents, itemCount }
}

export async function placeDemoOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const items = Array.isArray(input?.items) ? input.items : []
  const email = typeof input?.email === 'string' ? input.email.trim().slice(0, 254) : ''

  if (typeof input?.idempotencyKey !== 'string' || !UUID_RE.test(input.idempotencyKey)) {
    return { ok: false, error: ERROR_MESSAGES.INVALID_REQUEST }
  }
  if (items.length === 0 || items.length > MAX_LINES) {
    return { ok: false, error: ERROR_MESSAGES.INVALID_ITEMS }
  }
  for (const item of items) {
    if (typeof item?.variantId !== 'string' || !UUID_RE.test(item.variantId)) {
      return { ok: false, error: ERROR_MESSAGES.INVALID_ITEMS }
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QTY) {
      return { ok: false, error: ERROR_MESSAGES.INVALID_QUANTITY }
    }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('place_demo_order', {
      p_items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
      p_idempotency_key: input.idempotencyKey,
      p_email: email || null,
    })

    if (error) {
      const [code, variantId] = (error.message ?? '').split(':')
      const message = ERROR_MESSAGES[code]
      if (!message) console.error('[orders] place_demo_order failed', error.code, error.message)
      return {
        ok: false,
        error: message ?? GENERIC_ERROR,
        unavailableVariantId: variantId && UUID_RE.test(variantId) ? variantId : undefined,
        keepIdempotencyKey: !message,
      }
    }

    const result = parsePlaceOrderPayload(data)
    if (!result) {
      console.error('[orders] place_demo_order invalid payload', data)
      return { ok: false, error: GENERIC_ERROR, keepIdempotencyKey: true }
    }

    // El stock cambió: refrescar catálogo y fichas de producto.
    revalidatePath('/', 'layout')

    return {
      ok: true,
      orderId: result.orderId,
      total: result.totalCents / 100,
      itemCount: result.itemCount,
    }
  } catch (error) {
    console.error('[orders] place_demo_order unexpected failure', error)
    return { ok: false, error: GENERIC_ERROR, keepIdempotencyKey: true }
  }
}
