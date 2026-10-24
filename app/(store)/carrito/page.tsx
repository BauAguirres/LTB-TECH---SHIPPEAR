import type { Metadata } from 'next'
import { CartView } from '@/components/cart/cart-view'

export const metadata: Metadata = { title: 'Carrito' }

export default function CartPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-8 md:px-6">
      <h1 className="font-display text-4xl font-bold">Carrito</h1>
      <CartView />
    </div>
  )
}
