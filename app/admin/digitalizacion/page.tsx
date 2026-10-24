import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/admin-ui'
import { PhotoCapture } from '@/components/admin/photo-capture'
import { getAllProducts } from '@/lib/products'

export const metadata: Metadata = { title: 'Digitalización 3D' }

export default async function DigitizationPage() {
  const products = await getAllProducts()
  const options = products.map((p) => ({ value: p.id, label: `${p.brand} ${p.name}` }))

  return (
    <>
      <PageHeader
        title="Digitalización 3D"
        description="Tomá o subí fotos de la zapatilla desde todos los ángulos para generar su modelo 3D."
      />
      <PhotoCapture products={options} />
    </>
  )
}
