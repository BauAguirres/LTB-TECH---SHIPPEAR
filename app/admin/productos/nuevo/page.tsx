import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/admin-ui'
import { ProductForm } from '@/components/admin/product-form'

export const metadata: Metadata = { title: 'Nuevo producto' }

export default function NewProductPage() {
  return (
    <>
      <PageHeader title="Nuevo producto" description="Cargá los datos básicos y las variantes de talle, color y stock." />
      <ProductForm />
    </>
  )
}
