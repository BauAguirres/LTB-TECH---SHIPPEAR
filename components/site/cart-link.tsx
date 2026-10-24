'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { useCart } from '@/lib/cart/cart-context'

export function CartLink() {
  const { itemCount } = useCart()
  return (
    <Link
      href="/carrito"
      className="relative flex size-10 items-center justify-center rounded-full transition-colors hover:bg-muted"
      aria-label={itemCount ? `Carrito, ${itemCount} productos` : 'Carrito vacío'}
    >
      <ShoppingBag className="size-5" aria-hidden="true" />
      {itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
          {itemCount}
        </span>
      )}
    </Link>
  )
}
