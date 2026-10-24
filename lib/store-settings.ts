import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export interface StoreSettings {
  storeName: string
  legalName: string | null
  taxId: string | null
  legalAddress: string | null
  contactEmail: string | null
  contactWhatsapp: string | null
  shippingEnabled: boolean
  shippingFlat: number
  freeShippingThreshold: number | null
  shippingEta: string
  pickupEnabled: boolean
  pickupAddress: string | null
  pickupHours: string | null
}

const DEFAULTS: StoreSettings = {
  storeName: 'SneakAR',
  legalName: null,
  taxId: null,
  legalAddress: null,
  contactEmail: null,
  contactWhatsapp: null,
  shippingEnabled: true,
  shippingFlat: 7999,
  freeShippingThreshold: null,
  shippingEta: '3 a 7 días hábiles',
  pickupEnabled: true,
  pickupAddress: 'A coordinar',
  pickupHours: 'Lunes a viernes de 10 a 18 h',
}

export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  const supabase = await createClient()
  const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).maybeSingle()
  if (error || !data) {
    if (error) console.error('[settings] read failed:', error.message)
    return DEFAULTS
  }
  return {
    storeName: data.store_name,
    legalName: data.legal_name,
    taxId: data.tax_id,
    legalAddress: data.legal_address,
    contactEmail: data.contact_email,
    contactWhatsapp: data.contact_whatsapp,
    shippingEnabled: data.shipping_enabled,
    shippingFlat: Number(data.shipping_flat_cents) / 100,
    freeShippingThreshold:
      data.free_shipping_threshold_cents == null ? null : Number(data.free_shipping_threshold_cents) / 100,
    shippingEta: data.shipping_eta,
    pickupEnabled: data.pickup_enabled,
    pickupAddress: data.pickup_address,
    pickupHours: data.pickup_hours,
  }
})

/** Mismo cálculo que place_order en la base; acá solo se usa para mostrar el total estimado. */
export function computeShipping(
  settings: Pick<StoreSettings, 'shippingFlat' | 'freeShippingThreshold'>,
  method: 'delivery' | 'pickup',
  subtotal: number,
): number {
  if (method === 'pickup') return 0
  if (settings.freeShippingThreshold != null && subtotal >= settings.freeShippingThreshold) return 0
  return settings.shippingFlat
}
