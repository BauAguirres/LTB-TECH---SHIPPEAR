'use client'

import { useActionState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveStoreSettings } from '@/lib/admin/settings-actions'
import { cn } from '@/lib/utils'

export interface StoreSettingsValues {
  storeName: string
  legalName: string | null
  taxId: string | null
  legalAddress: string | null
  contactEmail: string | null
  contactWhatsapp: string | null
  shippingEnabled: boolean
  shippingFlat: number
  freeShippingThreshold: number | null
  shippingEta: string
  pickupEnabled: boolean
  pickupAddress: string | null
  pickupHours: string | null
}

function Field({ id, label, hint, ...props }: React.ComponentProps<typeof Input> & { id: string; label: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} {...props} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function StoreSettingsForm({ values }: { values: StoreSettingsValues }) {
  const [state, action, pending] = useActionState(saveStoreSettings, null)

  return (
    <form action={action} className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-display text-lg font-semibold">Entrega</legend>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="shipping_enabled" defaultChecked={values.shippingEnabled} className="size-4 accent-primary" />
          Envío a domicilio con tarifa fija
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="shipping_flat" label="Tarifa de envío (ARS)" inputMode="decimal" defaultValue={values.shippingFlat} required />
          <Field
            id="free_threshold"
            label="Envío gratis desde (ARS)"
            inputMode="decimal"
            defaultValue={values.freeShippingThreshold ?? ''}
            hint="Vacío = nunca gratis"
          />
          <Field id="shipping_eta" label="Plazo de entrega" defaultValue={values.shippingEta} maxLength={60} />
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="pickup_enabled" defaultChecked={values.pickupEnabled} className="size-4 accent-primary" />
          Retiro en el local (gratis)
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pickup_address" label="Dirección de retiro" defaultValue={values.pickupAddress ?? ''} maxLength={200} />
          <Field id="pickup_hours" label="Horarios de retiro" defaultValue={values.pickupHours ?? ''} maxLength={120} />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 font-display text-lg font-semibold">Datos del comercio</legend>
        <p className="-mt-2 text-sm leading-relaxed text-muted-foreground">
          La Ley de Defensa del Consumidor exige mostrar razón social, CUIT y domicilio. Aparecen en el pie de página y en
          los términos.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="store_name" label="Nombre de la tienda" defaultValue={values.storeName} maxLength={80} required />
          <Field id="legal_name" label="Razón social" defaultValue={values.legalName ?? ''} maxLength={120} />
          <Field id="tax_id" label="CUIT" defaultValue={values.taxId ?? ''} maxLength={20} placeholder="20-12345678-9" />
          <Field id="legal_address" label="Domicilio legal" defaultValue={values.legalAddress ?? ''} maxLength={200} />
          <Field id="contact_email" label="Email de contacto" type="email" defaultValue={values.contactEmail ?? ''} maxLength={254} />
          <Field id="contact_whatsapp" label="WhatsApp" type="tel" defaultValue={values.contactWhatsapp ?? ''} maxLength={40} placeholder="5491123456789" />
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Guardar configuración
        </Button>
        {state && (
          <p role="status" className={cn('text-sm', state.ok ? 'text-primary' : 'text-destructive')}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  )
}
