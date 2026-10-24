import { ProductCard } from '@/components/products/product-card'
import type { ProductWithRelations } from '@/lib/types'

export function ProductGrid({ products }: { products: ProductWithRelations[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <li key={product.id} className="flex">
          <div className="flex w-full flex-col">
            <ProductCard product={product} priority={index < 2} />
          </div>
        </li>
      ))}
    </ul>
  )
}
