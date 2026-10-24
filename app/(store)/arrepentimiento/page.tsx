import type { Metadata } from 'next'
import { LegalPage } from '@/components/site/legal-page'
import { WithdrawalForm } from '@/components/site/withdrawal-form'

export const metadata: Metadata = {
  title: 'Botón de arrepentimiento',
  description: 'Revocá tu compra dentro de los 10 días corridos desde la entrega, sin costo.',
}

export default function WithdrawalPage() {
  return (
    <LegalPage title="Botón de arrepentimiento">
      <p>
        Tenés derecho a revocar la compra dentro de los 10 días corridos desde que recibiste el producto, sin costo ni
        explicación (Ley 24.240, art. 34, y Resolución 424/2020). Completá el formulario y te damos un código de
        identificación al instante.
      </p>
      <WithdrawalForm />
    </LegalPage>
  )
}
