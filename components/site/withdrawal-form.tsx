'use client'

import { useActionState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitWithdrawal } from '@/lib/withdrawal-actions'

export function WithdrawalForm() {
  const [state, action, pending] = useActionState(submitWithdrawal, null)

  if (state?.ok) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
        <CheckCircle2 className="size-10 text-primary" aria-hidden="true" />
        <h2 className="font-display text-xl font-semibold">Recibimos tu solicitud</h2>
        <p className="leading-relaxed text-muted-foreground">
          Tu código de identificación es <strong className="font-mono text-foreground">{state.code}</strong>. Guardalo:
          te vamos a contactar por email para coordinar la devolución.
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order">Número de pedido</Label>
          <Input id="order" name="order" required maxLength={64} placeholder="A1B2C3D4" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nombre y apellido</Label>
          <Input id="name" name="name" required maxLength={120} autoComplete="name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email de la compra</Label>
          <Input id="email" name="email" type="email" required maxLength={254} autoComplete="email" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Teléfono (opcional)</Label>
          <Input id="phone" name="phone" type="tel" maxLength={40} autoComplete="tel" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reason">Comentarios (opcional)</Label>
        <Textarea id="reason" name="reason" maxLength={1000} rows={3} />
      </div>
      <div aria-hidden="true" className="hidden">
        <label htmlFor="website">No completar</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="rounded-full sm:w-fit">
        {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
        Solicitar la revocación
      </Button>
    </form>
  )
}
