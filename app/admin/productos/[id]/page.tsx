import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/admin/admin-ui'
import { ProductForm } from '@/components/admin/product-form'
import { ProductImagesManager } from '@/components/admin/product-images-manager'
import { ProductModelsManager } from '@/components/admin/product-models-manager'
import { buttonVariants } from '@/components/ui/button'
import { getProductById } from '@/lib/products'

export const metadata: Metadata = { title: 'Editar producto' }

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const product = await getProductById((await params).id)
  if (!product) notFound()

  return (
    <>
      <PageHeader
        title={product.name}
        description={`${product.brand} · ${product.status === 'published' ? 'Publicado' : 'Borrador'}`}
        action={
          product.status === 'published' ? (
            <Link href={`/producto/${product.slug}`} className={buttonVariants({ variant: 'outline' })}>
              Ver en la tienda
              <ExternalLink aria-hidden="true" />
            </Link>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-5">
        <ProductImagesManager productId={product.id} images={product.images} />
        <ProductModelsManager
          productId={product.id}
          productLabel={`${product.brand} ${product.name}`}
          colors={[...new Set(product.variants.map((v) => v.color))]}
          models={product.models}
        />
        <ProductForm key={product.updated_at} product={product} />
      </div>
    </>
  )
}
