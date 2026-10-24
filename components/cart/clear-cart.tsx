'use client'

import { useEffect } from 'react'
import { useCart } from '@/lib/cart/cart-context'

/** Vacía el carrito una vez que el pedido quedó registrado y pagado. */
export function ClearCart() {
  const { clear } = useCart()
  useEffect(() => {
    clear()
  }, [clear])
  return null
}
