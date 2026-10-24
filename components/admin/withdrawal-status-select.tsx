'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { updateWithdrawalStatus } from '@/lib/admin/order-actions'

const OPTIONS = [
  { value: 'received', label: 'Recibida' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'resolved', label: 'Resuelta' },
  { value: 'rejected', label: 'Rechazada' },
]

export function WithdrawalStatusSelect({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <select
      aria-label="Estado de la solicitud"
      defaultValue={status}
      disabled={pending}
      onChange={(event) => {
        const value = event.target.value
        startTransition(async () => {
          const result = await updateWithdrawalStatus(id, value)
          if (result.ok) toast.success('Solicitud actualizada')
          else toast.error(result.error)
        })
      }}
      className="h-9 shrink-0 rounded-lg border border-input bg-card px-2.5 text-sm"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
