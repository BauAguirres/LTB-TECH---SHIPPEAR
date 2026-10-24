import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/site/legal-page'
import { getStoreSettings } from '@/lib/store-settings'

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Condiciones de compra, precios, pagos, envíos y derecho de arrepentimiento.',
}

export default async function TermsPage() {
  const s = await getStoreSettings()
  const seller = s.legalName ?? s.storeName
  return (
    <LegalPage title="Términos y condiciones" updated="octubre de 2026">
      <p>
        Estos términos regulan las compras en {s.storeName}, operada por {seller}
        {s.taxId ? `, CUIT ${s.taxId}` : ''}
        {s.legalAddress ? `, con domicilio en ${s.legalAddress}` : ''}. Al confirmar un pedido aceptás estas condiciones,
        que se rigen por la Ley 24.240 de Defensa del Consumidor y el Código Civil y Comercial de la Nación.
      </p>

      <h2>Precios y stock</h2>
      <p>
        Los precios están expresados en pesos argentinos e incluyen IVA. El costo de envío se informa antes de pagar. El
        stock se reserva durante 60 minutos desde que iniciás el pago; si no se acredita en ese plazo, el pedido se
        cancela automáticamente sin cargo.
      </p>

      <h2>Pagos</h2>
      <p>
        Los pagos se procesan a través de Mercado Pago. No almacenamos datos de tarjetas. El pedido se confirma cuando
        Mercado Pago acredita el pago; las cuotas y promociones bancarias dependen de Mercado Pago y de cada emisor.
      </p>

      <h2>Entrega</h2>
      <p>
        Ofrecemos envío a domicilio ({s.shippingEta}) y retiro en el local. Más detalles en{' '}
        <Link href="/envios-y-devoluciones" className="text-primary hover:underline">
          Envíos y cambios
        </Link>
        .
      </p>

      <h2>Derecho de arrepentimiento</h2>
      <p>
        Podés revocar la compra dentro de los 10 días corridos desde que recibís el producto, sin costo ni
        responsabilidad, según el artículo 34 de la Ley 24.240 y el artículo 1110 del Código Civil y Comercial. Iniciá la
        solicitud desde el{' '}
        <Link href="/arrepentimiento" className="text-primary hover:underline">
          botón de arrepentimiento
        </Link>
        . El producto debe devolverse sin uso y en su caja original; el reembolso se hace por el mismo medio de pago.
      </p>

      <h2>Garantía</h2>
      <p>
        Los productos tienen la garantía legal por defectos de fabricación. Escribinos
        {s.contactEmail ? ` a ${s.contactEmail}` : ''} con el número de pedido y fotos del problema.
      </p>

      <h2>Vista 3D y realidad aumentada</h2>
      <p>
        Los modelos 3D y la vista en realidad aumentada son ilustrativos. Colores y proporciones pueden variar según la
        pantalla y el dispositivo.
      </p>

      <h2>Reclamos</h2>
      <p>
        Ante cualquier reclamo contactanos primero para resolverlo. También podés acudir a la Dirección Nacional de
        Defensa del Consumidor o al sistema COPREC.
      </p>
    </LegalPage>
  )
}
