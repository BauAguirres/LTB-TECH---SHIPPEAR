import { NextResponse, type NextRequest } from 'next/server'
import { isMercadoPagoConfigured, verifyWebhookSignature } from '@/lib/mercadopago'
import { syncPayment } from '@/lib/orders/payments'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!isMercadoPagoConfigured()) return NextResponse.json({ ok: false }, { status: 503 })

  const url = request.nextUrl
  let body: { type?: string; action?: string; data?: { id?: string | number } } = {}
  try {
    body = await request.json()
  } catch {
    // Las notificaciones IPN viejas llegan sin cuerpo y con los datos en la query.
  }

  const type = body.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic')
  const dataId = String(body.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '')

  if (type !== 'payment' || !/^\d{1,20}$/.test(dataId)) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const valid = verifyWebhookSignature({
    signature: request.headers.get('x-signature'),
    requestId: request.headers.get('x-request-id'),
    dataId: url.searchParams.get('data.id') ?? dataId,
  })
  if (!valid) return NextResponse.json({ ok: false }, { status: 401 })

  try {
    const result = await syncPayment(dataId)
    // 200 incluso si el pago no es nuestro: evita reintentos infinitos de Mercado Pago.
    return NextResponse.json({ ok: result.ok })
  } catch (err) {
    console.error('[webhook] sync failed', err instanceof Error ? err.message : err)
    // 500 para que Mercado Pago reintente más tarde.
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
