'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cancelOrder, updateOrderFulfillment } from '@/lib/admin/order-actions'
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/lib/orders/status'

export function OrderManager({
  orderId,
  status,
  statuses,
  canAdvance,
  canCancel,
  shippingMethod,
  trackingCarrier,
  trackingCode,
  adminNotes,
}: {
  orderId: string
  status: OrderStatus
  statuses: OrderStatus[]
  canAdvance: boolean
  canCancel: boolean
  shippingMethod: 'delivery' | 'pickup' | null
  trackingCarrier: string | null
  trackingCode: string | null
  adminNotes: string | null
}) {
  const [nextStatus, setNextStatus] = useState<OrderStatus>(status)
  const [saving, startSaving] = useTransition()
  const [cancelling, startCancelling] = useTransition()
  const options = statuses.includes(status) ? statuses : [status, ...statuses]

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        startSaving(async () => {
          const result = await updateOrderFulfillment({
            orderId,
            status: nextStatus,
            trackingCarrier: String(data.get('carrier') ?? ''),
            trackingCode: String(data.get('code') ?? ''),
            adminNotes: String(data.get('notes') ?? ''),
          })
          if (result.ok) toast.success('Pedido actualizado')
          else toast.error(result.error)
        })
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="order-status">Estado</Label>
        <select
          id="order-status"
          value={nextStatus}
          disabled={!canAdvance}
          onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
          className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm disabled:opacity-60"
        >
          {options.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {!canAdvance && status !== 'cancelled' && (
          <p className="text-xs text-muted-foreground">Se habilita cuando Mercado Pago aprueba el pago.</p>
        )}
      </div>
      {shippingMethod === 'delivery' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="carrier">Transporte</Label>
            <Input id="carrier" name="carrier" defaultValue={trackingCarrier ?? ''} placeholder="Correo Argentino, Andreani…" maxLength={60} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Código de seguimiento</Label>
            <Input id="code" name="code" defaultValue={trackingCode ?? ''} maxLength={80} />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notas internas</Label>
        <Textarea id="notes" name="notes" defaultValue={adminNotes ?? ''} maxLength={2000} rows={3} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving || status === 'cancelled'}>
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          Guardar cambios
        </Button>
        {canCancel && (
          <Button
            type="button"
            variant="outline"
            disabled={cancelling}
            onClick={() => {
              if (!window.confirm('¿Cancelar el pedido y devolver el stock? Si estaba pagado, hacé la devolución desde Mercado Pago.')) return
              startCancelling(async () => {
                const result = await cancelOrder(orderId)
                if (result.ok) toast.success('Pedido cancelado')
                else toast.error(result.error)
              })
            }}
            className="text-destructive"
          >
            {cancelling && <Loader2 className="animate-spin" aria-hidden="true" />}
            Cancelar pedido
          </Button>
        )}
      </div>
    </form>
  )
}
