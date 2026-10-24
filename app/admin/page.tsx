import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PageHeader, Panel, StatusBadge } from '@/components/admin/admin-ui'
import { buttonVariants } from '@/components/ui/button'
import { getAllProducts, getTotalStock } from '@/lib/products'

export default async function AdminDashboard() {
  const products = await getAllProducts()
  const published = products.filter((p) => p.status === 'published').length
  const variants = products.flatMap((p) => p.variants)
  const totalStock = variants.reduce((s, v) => s + v.stock, 0)
  const outOfStock = variants.filter((v) => v.stock === 0).length
  const withModel = products.filter((p) => p.model?.status === 'completed').length

  const stats = [
    { label: 'Productos', value: products.length, note: `${published} publicados · ${products.length - published} borradores` },
    { label: 'Unidades en stock', value: totalStock, note: `${variants.length} variantes` },
    { label: 'Variantes sin stock', value: outOfStock, note: 'talle y color agotados' },
    { label: 'Modelos 3D listos', value: withModel, note: `de ${products.length} productos` },
  ]

  const lowStock = products
    .filter((p) => p.status === 'published')
    .map((p) => ({ product: p, stock: getTotalStock(p) }))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5)

  return (
    <>
      <PageHeader
        title="Resumen"
        description="Estado general del catálogo de demostración."
        action={
          <Link href="/admin/productos/nuevo" className={buttonVariants()}>
            Nuevo producto
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Panel key={stat.label}>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 font-display text-4xl font-bold">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.note}</p>
          </Panel>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Panel>
          <h2 className="mb-4 font-display text-lg font-semibold">Menor stock publicado</h2>
          <ul className="flex flex-col divide-y divide-border">
            {lowStock.map(({ product, stock }) => (
              <li key={product.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="truncate">
                  <span className="text-muted-foreground">{product.brand}</span> {product.name}
                </span>
                <StatusBadge tone={stock === 0 ? 'danger' : stock <= 10 ? 'muted' : 'primary'}>{stock} u.</StatusBadge>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold">Próximo paso: digitalizar en 3D</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Ningún producto tiene modelo 3D todavía. Preparé fotos desde el celular o subí imágenes para generar el
            modelo cuando la integración esté conectada.
          </p>
          <Link href="/admin/digitalizacion" className="flex w-fit items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Ir a digitalización
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <p className="mt-auto text-xs text-muted-foreground">Pedidos registrados: 0 (se habilitan en la Fase 6).</p>
        </Panel>
      </div>
    </>
  )
}
