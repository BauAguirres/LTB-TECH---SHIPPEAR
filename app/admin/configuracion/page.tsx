import type { Metadata } from 'next'
import { PageHeader, Panel, StatusBadge } from '@/components/admin/admin-ui'
import { StoreSettingsForm } from '@/components/admin/store-settings-form'
import { isMercadoPagoConfigured } from '@/lib/mercadopago'
import { getStoreSettings } from '@/lib/store-settings'

export const metadata: Metadata = { title: 'Configuración' }

export default async function SettingsPage() {
  const settings = await getStoreSettings()
  const integrations = [
    { name: 'Base de datos y autenticación', provider: 'Supabase', status: 'Conectado' },
    { name: 'Almacenamiento de fotos y modelos', provider: 'Supabase Storage', status: 'Conectado' },
    {
      name: 'Cobros online',
      provider: 'Mercado Pago Checkout Pro',
      status: isMercadoPagoConfigured() ? 'Conectado' : 'Falta MP_ACCESS_TOKEN',
    },
    {
      name: 'Firma de notificaciones de pago',
      provider: 'Mercado Pago Webhooks',
      status: process.env.MP_WEBHOOK_SECRET ? 'Conectado' : 'Opcional · falta MP_WEBHOOK_SECRET',
    },
    {
      name: 'Generación de modelos 3D',
      provider: 'Meshy (image-to-3D)',
      status: process.env.MESHY_API_KEY ? 'Conectado' : 'Modo prueba · falta MESHY_API_KEY',
    },
    { name: 'Visor 3D y realidad aumentada', provider: 'model-viewer · WebXR, Scene Viewer, Quick Look', status: 'Conectado' },
  ]

  return (
    <>
      <PageHeader title="Configuración" description="Envíos, datos del comercio e integraciones." />
      <div className="flex flex-col gap-6">
        <Panel>
          <StoreSettingsForm values={settings} />
        </Panel>
        <Panel>
          <h2 className="mb-2 font-display text-lg font-semibold">Integraciones</h2>
          <ul className="flex flex-col divide-y divide-border">
            {integrations.map((item) => (
              <li key={item.name} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.provider}</p>
                </div>
                <StatusBadge tone={item.status === 'Conectado' ? 'primary' : 'muted'}>{item.status}</StatusBadge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            URL de notificaciones para Mercado Pago: <span className="font-mono">/api/mercadopago/webhook</span> (evento
            «Pagos»). Se configura sola en cada pago; registrarla en el panel de Mercado Pago habilita la firma.
          </p>
        </Panel>
      </div>
    </>
  )
}
