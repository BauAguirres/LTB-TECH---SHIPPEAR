import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/site/legal-page'
import { formatPrice } from '@/lib/format'
import { getStoreSettings } from '@/lib/store-settings'

export const metadata: Metadata = {
  title: 'Envíos y cambios',
  description: 'Costos y plazos de envío, retiro en el local, cambios de talle y devoluciones.',
}

export default async function ShippingPage() {
  const s = await getStoreSettings()
  return (
    <LegalPage title="Envíos y cambios">
      {s.shippingEnabled && (
        <>
          <h2>Envío a domicilio</h2>
          <p>
            Enviamos a todo el país con una tarifa fija de {formatPrice(s.shippingFlat)}
            {s.freeShippingThreshold != null ? `, gratis en compras desde ${formatPrice(s.freeShippingThreshold)}` : ''}.
            El plazo estimado es de {s.shippingEta} desde que se acredita el pago. Cuando despachamos el pedido te
            enviamos el código de seguimiento, que también ves en la página de tu pedido.
          </p>
        </>
      )}
      {s.pickupEnabled && (
        <>
          <h2>Retiro en el local</h2>
          <p>
            Gratis en {s.pickupAddress ?? 'nuestro local'}
            {s.pickupHours ? `, ${s.pickupHours}` : ''}. Te avisamos cuando el pedido esté listo; presentá tu DNI y el
            número de pedido.
          </p>
        </>
      )}
      <h2>Cambios de talle</h2>
      <p>
        Podés cambiar el talle dentro de los 30 días desde la entrega, con el producto sin uso y en su caja original,
        sujeto a disponibilidad. Escribinos{s.contactEmail ? ` a ${s.contactEmail}` : ''} con tu número de pedido.
      </p>
      <h2>Devoluciones</h2>
      <p>
        Si te arrepentiste de la compra, tenés 10 días corridos desde la entrega para devolverla sin costo. Iniciá la
        solicitud desde el{' '}
        <Link href="/arrepentimiento" className="text-primary hover:underline">
          botón de arrepentimiento
        </Link>
        .
      </p>
    </LegalPage>
  )
}
