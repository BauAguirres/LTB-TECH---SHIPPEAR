import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

const API = 'https://api.mercadopago.com'

export function isMercadoPagoConfigured(): boolean {
  return !!process.env.MP_ACCESS_TOKEN
}

function token(): string {
  const value = process.env.MP_ACCESS_TOKEN
  if (!value) throw new Error('Falta MP_ACCESS_TOKEN.')
  return value
}

export interface PreferenceItem {
  id: string
  title: string
  quantity: number
  unitPrice: number
}

export interface CreatePreferenceInput {
  orderId: string
  items: PreferenceItem[]
  shipping: number
  payer: { email: string; name: string }
  backUrl: string
  notificationUrl: string | null
  expiresAt: Date
  idempotencyKey: string
}

export async function createPreference(input: CreatePreferenceInput): Promise<{ id: string; initPoint: string }> {
  const items = input.items.map((item) => ({
    id: item.id,
    title: item.title.slice(0, 250),
    quantity: item.quantity,
    unit_price: item.unitPrice,
    currency_id: 'ARS',
  }))
  if (input.shipping > 0) {
    items.push({ id: 'envio', title: 'Envío a domicilio', quantity: 1, unit_price: input.shipping, currency_id: 'ARS' })
  }

  const isHttps = input.backUrl.startsWith('https://')
  const res = await fetch(`${API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      items,
      payer: { email: input.payer.email, name: input.payer.name },
      external_reference: input.orderId,
      back_urls: { success: input.backUrl, pending: input.backUrl, failure: input.backUrl },
      // Mercado Pago rechaza auto_return con URLs que no son HTTPS (por ejemplo, localhost).
      ...(isHttps ? { auto_return: 'approved' } : {}),
      ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
      statement_descriptor: 'SNEAKAR',
      expires: true,
      expiration_date_to: input.expiresAt.toISOString(),
    }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Mercado Pago ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = (await res.json()) as { id: string; init_point: string }
  return { id: data.id, initPoint: data.init_point }
}

export interface MercadoPagoPayment {
  id: string
  status: string
  externalReference: string | null
  amountCents: number
  currency: string
}

export async function getPayment(paymentId: string): Promise<MercadoPagoPayment | null> {
  if (!/^\d{1,20}$/.test(paymentId)) return null
  const res = await fetch(`${API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: 'no-store',
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Mercado Pago ${res.status} al consultar el pago ${paymentId}`)
  const data = (await res.json()) as {
    id: number
    status: string
    external_reference: string | null
    transaction_amount: number
    currency_id: string
  }
  return {
    id: String(data.id),
    status: data.status,
    externalReference: data.external_reference,
    amountCents: Math.round(Number(data.transaction_amount) * 100),
    currency: data.currency_id,
  }
}

/**
 * Valida la firma `x-signature` de Mercado Pago. Si no hay secreto configurado se omite:
 * el pago igual se verifica consultándolo a la API antes de aplicarlo.
 */
export function verifyWebhookSignature(params: {
  signature: string | null
  requestId: string | null
  dataId: string
}): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return true
  if (!params.signature) return false

  const parts = Object.fromEntries(
    params.signature.split(',').map((part) => {
      const [key, ...rest] = part.trim().split('=')
      return [key, rest.join('=')]
    }),
  )
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false

  const manifest = `id:${params.dataId.toLowerCase()};${params.requestId ? `request-id:${params.requestId};` : ''}ts:${ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(v1)
  return a.length === b.length && timingSafeEqual(a, b)
}
