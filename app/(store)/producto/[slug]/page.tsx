import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { ProductMedia } from '@/components/product-detail/product-media'
import { PurchasePanel } from '@/components/product-detail/purchase-panel'
import { ProductGrid } from '@/components/products/product-grid'
import { getProductBySlug, getRelatedProducts } from '@/lib/products'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug)
  if (!product) return { title: 'Producto no encontrado' }
  return { title: `${product.brand} ${product.name}`, description: product.description }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProductBySlug((await params).slug)
  if (!product) notFound()
  const related = await getRelatedProducts(product)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 pt-6 md:px-6">
      <div className="flex flex-col gap-6">
        <Link
          href="/catalogo"
          className="flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Volver al catálogo
        </Link>
        <div className="grid gap-10 lg:grid-cols-2">
          <ProductMedia product={product} />
          <PurchasePanel key={product.id} product={product} />
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="relacionados">
          <h2 id="relacionados" className="mb-6 font-display text-2xl font-bold">
            También te puede gustar
          </h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  )
}
