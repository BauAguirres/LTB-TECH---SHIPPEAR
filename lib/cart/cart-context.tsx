'use client'

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react'
import type { CartItem } from '@/lib/types'

// El carrito es estado efímero del navegador (permitido por la especificación).
// Los pedidos se persistirán en Supabase en la Fase 6.
const STORAGE_KEY = 'sneakar-cart-v1'
const EMPTY: CartItem[] = []

let cache: CartItem[] | null = null
const listeners = new Set<() => void>()

function read(): CartItem[] {
  if (cache) return cache
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    cache = Array.isArray(parsed) ? (parsed as CartItem[]) : []
  } catch {
    cache = []
  }
  return cache
}

function write(items: CartItem[]) {
  cache = items
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Almacenamiento no disponible (modo privado): el carrito vive solo en memoria.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cache = null
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  subtotal: number
  addItem: (item: CartItem) => { added: number; capped: boolean }
  updateQuantity: (variantId: string, quantity: number) => void
  removeItem: (variantId: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY)

  const addItem = useCallback((item: CartItem) => {
    const current = read()
    const existing = current.find((i) => i.variantId === item.variantId)
    const currentQty = existing?.quantity ?? 0
    const nextQty = Math.min(currentQty + item.quantity, item.maxStock)
    const added = nextQty - currentQty

    if (added <= 0) return { added: 0, capped: true }

    const next = existing
      ? current.map((i) =>
          i.variantId === item.variantId ? { ...i, quantity: nextQty, maxStock: item.maxStock } : i,
        )
      : [...current, { ...item, quantity: nextQty }]
    write(next)
    return { added, capped: added < item.quantity }
  }, [])

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    const next = read()
      .map((i) =>
        i.variantId === variantId
          ? { ...i, quantity: Math.max(1, Math.min(Math.floor(quantity), i.maxStock)) }
          : i,
      )
      .filter((i) => i.quantity > 0)
    write(next)
  }, [])

  const removeItem = useCallback((variantId: string) => {
    write(read().filter((i) => i.variantId !== variantId))
  }, [])

  const clear = useCallback(() => write([]), [])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      addItem,
      updateQuantity,
      removeItem,
      clear,
    }),
    [items, addItem, updateQuantity, removeItem, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider')
  return context
}
