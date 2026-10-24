import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/admin-ui'
import { DigitizationWorkspace } from '@/components/admin/digitization/digitization-workspace'
import { requireAdmin } from '@/lib/auth'
import { listRecentJobs } from '@/lib/digitization/jobs'
import { isMeshyConfigured } from '@/lib/digitization/meshy'
import { getAllProducts } from '@/lib/products'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Digitalización 3D' }

export default async function DigitizationPage({ searchParams }: { searchParams: Promise<{ trabajo?: string }> }) {
  await requireAdmin()
  const [{ trabajo }, products, supabase] = await Promise.all([searchParams, getAllProducts(), createClient()])
  const jobs = await listRecentJobs(supabase)

  const options = products.map((p) => ({
    value: p.id,
    label: `${p.brand} ${p.name}`,
    colors: [...new Set(p.variants.map((v) => v.color.trim()).filter(Boolean))],
  }))

  return (
    <>
      <PageHeader
        title="Digitalización 3D"
        description="Subí fotos de la zapatilla, generá su modelo 3D con un proveedor externo y revisalo antes de publicarlo."
      />
      <DigitizationWorkspace
        products={options}
        jobs={jobs}
        providerConfigured={isMeshyConfigured()}
        initialJobId={typeof trabajo === 'string' ? trabajo : null}
      />
    </>
  )
}
