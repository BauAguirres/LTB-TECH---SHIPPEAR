import type { Metadata } from 'next'
import { LegalPage } from '@/components/site/legal-page'
import { getStoreSettings } from '@/lib/store-settings'

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Qué datos personales recolectamos, para qué los usamos y cómo ejercer tus derechos.',
}

export default async function PrivacyPage() {
  const s = await getStoreSettings()
  return (
    <LegalPage title="Política de privacidad" updated="octubre de 2026">
      <p>
        {s.legalName ?? s.storeName} es responsable del tratamiento de tus datos personales, conforme a la Ley 25.326 de
        Protección de los Datos Personales.
      </p>
      <h2>Qué datos recolectamos</h2>
      <ul>
        <li>Nombre, email, teléfono y DNI o CUIT, para facturar y comunicarnos sobre tu pedido.</li>
        <li>Dirección de entrega, si elegís envío a domicilio.</li>
        <li>Detalle de la compra y estado del pago informado por Mercado Pago.</li>
      </ul>
      <p>No guardamos datos de tarjetas: el pago se hace directamente en Mercado Pago.</p>
      <h2>Para qué los usamos</h2>
      <p>
        Solo para procesar, entregar y facturar tu compra, atender reclamos y cumplir obligaciones legales. No vendemos
        ni cedemos tus datos. Los compartimos únicamente con Mercado Pago y con la empresa de transporte que entrega el
        pedido.
      </p>
      <h2>Tus derechos</h2>
      <p>
        Podés pedir acceso, rectificación o eliminación de tus datos
        {s.contactEmail ? ` escribiendo a ${s.contactEmail}` : ' contactándonos'}. La Agencia de Acceso a la Información
        Pública es el órgano de control de la Ley 25.326 y atiende denuncias por incumplimiento.
      </p>
      <h2>Cookies</h2>
      <p>
        Usamos almacenamiento local del navegador para recordar tu carrito, y cookies técnicas para la sesión del panel de
        administración. No usamos cookies publicitarias.
      </p>
    </LegalPage>
  )
}
