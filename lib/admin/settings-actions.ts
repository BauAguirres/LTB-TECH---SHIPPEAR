'use server'

import { revalidatePath } from 'next/cache'
import { getAdminClient } from '@/lib/auth'

export type SettingsState = { ok: boolean; message: string } | null

function text(data: FormData, key: string, max: number): string | null {
  const value = String(data.get(key) ?? '').trim().slice(0, max)
  return value || null
}

function money(data: FormData, key: string): number | null | 'invalid' {
  const raw = String(data.get(key) ?? '').replace(/[.\s$]/g, '').replace(',', '.').trim()
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0 || value > 100_000_000) return 'invalid'
  return Math.round(value * 100)
}

export async function saveStoreSettings(_prev: SettingsState, data: FormData): Promise<SettingsState> {
  const { supabase, error } = await getAdminClient()
  if (!supabase) return { ok: false, message: error }

  const shippingEnabled = data.get('shipping_enabled') === 'on'
  const pickupEnabled = data.get('pickup_enabled') === 'on'
  if (!shippingEnabled && !pickupEnabled) {
    return { ok: false, message: 'Activá al menos un método de entrega.' }
  }
  const flat = money(data, 'shipping_flat')
  const threshold = money(data, 'free_threshold')
  if (flat === 'invalid' || flat === null) return { ok: false, message: 'Ingresá una tarifa de envío válida.' }
  if (threshold === 'invalid') return { ok: false, message: 'El monto para envío gratis no es válido.' }

  const email = text(data, 'contact_email', 254)
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: 'El email de contacto no es válido.' }

  const { error: updateError } = await supabase
    .from('store_settings')
    .update({
      store_name: text(data, 'store_name', 80) ?? 'SneakAR',
      legal_name: text(data, 'legal_name', 120),
      tax_id: text(data, 'tax_id', 20),
      legal_address: text(data, 'legal_address', 200),
      contact_email: email,
      contact_whatsapp: text(data, 'contact_whatsapp', 40),
      shipping_enabled: shippingEnabled,
      shipping_flat_cents: flat,
      free_shipping_threshold_cents: threshold,
      shipping_eta: text(data, 'shipping_eta', 60) ?? '3 a 7 días hábiles',
      pickup_enabled: pickupEnabled,
      pickup_address: text(data, 'pickup_address', 200),
      pickup_hours: text(data, 'pickup_hours', 120),
    })
    .eq('id', 1)
  if (updateError) return { ok: false, message: 'No pudimos guardar la configuración.' }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'Configuración guardada.' }
}
