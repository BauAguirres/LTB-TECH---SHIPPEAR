import type { Metadata } from 'next'
import { CheckoutView } from '@/components/cart/confirmation-view'
import { isMercadoPagoConfigured } from '@/lib/mercadopago'
import { getStoreSettings } from '@/lib/store-settings'

export const metadata: Metadata = { title: 'Finalizar compra', robots: { index: false } }

export default async function CheckoutPage() {
  const settings = await getStoreSettings()
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-8 md:px-6">
      <h1 className="font-display text-4xl font-bold">Finalizar compra</h1>
      <CheckoutView
        paymentsEnabled={isMercadoPagoConfigured()}
        shipping={{
          shippingEnabled: settings.shippingEnabled,
          shippingFlat: settings.shippingFlat,
          freeShippingThreshold: settings.freeShippingThreshold,
          shippingEta: settings.shippingEta,
          pickupEnabled: settings.pickupEnabled,
          pickupAddress: settings.pickupAddress,
          pickupHours: settings.pickupHours,
        }}
      />
    </div>
  )
}
