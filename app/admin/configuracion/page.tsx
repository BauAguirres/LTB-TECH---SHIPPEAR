import type { Metadata } from 'next'
import { PageHeader, Panel, StatusBadge } from '@/components/admin/admin-ui'

export const metadata: Metadata = { title: 'Configuración' }

const integrations = [
  { name: 'Base de datos y autenticación', provider: 'Supabase', status: 'Conectado' },
  { name: 'Almacenamiento de fotos', provider: 'Supabase Storage', status: 'Conectado' },
  {
    name: 'Generación de modelos 3D',
    provider: 'Meshy (image-to-3D)',
    status: process.env.MESHY_API_KEY ? 'Conectado' : 'Modo prueba · falta MESHY_API_KEY',
  },
  { name: 'Visor 3D y realidad aumentada', provider: 'model-viewer · WebXR, Scene Viewer, Quick Look', status: 'Conectado' },
  { name: 'Pedidos de demostración y descuento de stock', provider: 'Supabase', status: 'Conectado' },
]

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Configuración" description="Estado de las integraciones del proyecto." />
      <Panel>
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
      </Panel>
    </>
  )
}
