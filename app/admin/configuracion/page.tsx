import type { Metadata } from 'next'
import { PageHeader, Panel, StatusBadge } from '@/components/admin/admin-ui'

export const metadata: Metadata = { title: 'Configuración' }

const integrations = [
  { name: 'Base de datos y autenticación', provider: 'Supabase', phase: 'Fase 2' },
  { name: 'Almacenamiento de fotos', provider: 'Supabase Storage', phase: 'Fase 3' },
  { name: 'Generación de modelos 3D', provider: 'Proveedor de fotogrametría', phase: 'Fase 4' },
  { name: 'Visor 3D y realidad aumentada', provider: 'model-viewer', phase: 'Fase 5' },
  { name: 'Pedidos y stock', provider: 'Supabase', phase: 'Fase 6' },
]

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Configuración" description="Estado de las integraciones previstas para el proyecto." />
      <Panel>
        <ul className="flex flex-col divide-y divide-border">
          {integrations.map((item) => (
            <li key={item.name} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.provider}</p>
              </div>
              <StatusBadge tone="muted">Pendiente · {item.phase}</StatusBadge>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  )
}
