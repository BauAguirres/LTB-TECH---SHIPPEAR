import type { Metadata } from 'next'
import { ConfirmationView } from '@/components/cart/confirmation-view'

export const metadata: Metadata = { title: 'Confirmar pedido' }

export default function ConfirmationPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-8 md:px-6">
      <h1 className="font-display text-4xl font-bold">Confirmar pedido</h1>
      <ConfirmationView />
    </div>
  )
}
