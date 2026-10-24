import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/admin-ui'
import { ProductsTable, type ProductRow } from '@/components/admin/products-table'
import { buttonVariants } from '@/components/ui/button'
import { getAllProducts, getTotalStock } from '@/lib/products'

export const metadata: Metadata = { title: 'Productos' }

export default async function AdminProductsPage() {
  const products = await getAllProducts()
  const rows: ProductRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    price: p.price,
    status: p.status,
    image: p.images[0]?.url ?? '',
    stock: getTotalStock(p),
    variantCount: p.variants.length,
    hasModel: p.model?.status === 'completed' && !!p.model.glb_url,
  }))

  return (
    <>
      <PageHeader
        title="Productos"
        description={`${products.length} productos guardados en Supabase.`}
        action={
          <Link href="/admin/productos/nuevo" className={buttonVariants()}>
            Nuevo producto
          </Link>
        }
      />
      <ProductsTable rows={rows} />
    </>
  )
}
