'use server'

import { createServiceClient } from '@/lib/supabase/admin'

export type WithdrawalState = { ok: true; code: string } | { ok: false; message: string } | null

function field(data: FormData, key: string, max: number): string {
  return String(data.get(key) ?? '').trim().slice(0, max)
}

export async function submitWithdrawal(_prev: WithdrawalState, data: FormData): Promise<WithdrawalState> {
  // Campo trampa: los bots lo completan, las personas no lo ven.
  if (field(data, 'website', 100)) return { ok: true, code: 'RECIBIDA' }

  const orderReference = field(data, 'order', 64).replace(/^#/, '')
  const fullName = field(data, 'name', 120)
  const email = field(data, 'email', 254).toLowerCase()
  const phone = field(data, 'phone', 40)
  const reason = field(data, 'reason', 1000)

  if (orderReference.length < 4) return { ok: false, message: 'Ingresá el número de pedido.' }
  if (fullName.length < 2) return { ok: false, message: 'Ingresá tu nombre y apellido.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: 'Ingresá un email válido.' }

  const supabase = createServiceClient()
  const { data: row, error } = await supabase
    .from('withdrawal_requests')
    .insert({ order_reference: orderReference, full_name: fullName, email, phone: phone || null, reason: reason || null })
    .select('code')
    .single()
  if (error || !row) {
    console.error('[withdrawal] insert failed', error?.message)
    return { ok: false, message: 'No pudimos registrar la solicitud. Intentá de nuevo.' }
  }
  return { ok: true, code: row.code }
}
