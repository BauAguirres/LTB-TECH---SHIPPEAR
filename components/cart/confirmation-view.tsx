'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { AlertCircle, Loader2, Lock, Store, Truck } from 'lucide-react'
import { OrderSummary } from '@/components/cart/order-summary'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCart } from '@/lib/cart/cart-context'
import { formatPrice } from '@/lib/format'
import { startCheckout } from '@/lib/orders/actions'
import { cn } from '@/lib/utils'

export interface CheckoutShippingOptions {
  shippingEnabled: boolean
  shippingFlat: number
  freeShippingThreshold: number | null
  shippingEta: string
  pickupEnabled: boolean
  pickupAddress: string | null
  pickupHours: string | null
}

const PROVINCES = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa',
  'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
]

type Method = 'delivery' | 'pickup'

function Field({
  id,
  label,
  className,
  invalid,
  ...props
}: React.ComponentProps<typeof Input> & { id: string; label: string; invalid?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} aria-invalid={invalid || undefined} {...props} />
    </div>
  )
}

export function CheckoutView({
  shipping,
  paymentsEnabled,
}: {
  shipping: CheckoutShippingOptions
  paymentsEnabled: boolean
}) {
  const { items, itemCount, subtotal } = useCart()
  const [method, setMethod] = useState<Method>(shipping.shippingEnabled ? 'delivery' : 'pickup')
  const [error, setError] = useState<{ message: string; field?: string; variantId?: string } | null>(null)
  // Misma clave en reintentos: si la respuesta se pierde, el servidor no duplica el pedido.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())
  const [pending, startTransition] = useTransition()

  const freeShipping = shipping.freeShippingThreshold != null && subtotal >= shipping.freeShippingThreshold
  const shippingCost = method === 'pickup' || freeShipping ? 0 : shipping.shippingFlat

  function submit(form: HTMLFormElement) {
    const data = new FormData(form)
    const get = (key: string) => String(data.get(key) ?? '')
    setError(null)
    startTransition(async () => {
      const result = await startCheckout({
        idempotencyKey,
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        customer: { name: get('name'), email: get('email'), phone: get('phone'), dni: get('dni') },
        shippingMethod: method,
        address:
          method === 'delivery'
            ? {
                street: get('street'),
                number: get('number'),
                apartment: get('apartment'),
                city: get('city'),
                province: get('province'),
                postalCode: get('postalCode'),
                notes: get('notes'),
              }
            : undefined,
        acceptedTerms: data.get('terms') === 'on',
      })
      if (result.ok) {
        // El carrito se vacía en la página del pedido, cuando el pago está confirmado.
        window.location.assign(result.redirectUrl)
        return
      }
      setError({ message: result.error, field: result.field, variantId: result.unavailableVariantId })
      // Rechazado sin guardarse: el próximo intento, con los datos corregidos, es un pedido nuevo.
      setIdempotencyKey(crypto.randomUUID())
    })
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <p className="font-display text-xl font-semibold">Tu carrito está vacío</p>
        <Link href="/catalogo" className={cn(buttonVariants({ size: 'lg' }), 'rounded-full')}>
          Ir al catálogo
        </Link>
      </div>
    )
  }

  const methods = [
    shipping.shippingEnabled && {
      value: 'delivery' as const,
      icon: Truck,
      title: 'Envío a domicilio',
      detail: `${freeShipping ? 'Gratis' : formatPrice(shipping.shippingFlat)} · ${shipping.shippingEta}`,
    },
    shipping.pickupEnabled && {
      value: 'pickup' as const,
      icon: Store,
      title: 'Retiro en el local',
      detail: `Gratis · ${shipping.pickupAddress ?? 'A coordinar'}`,
    },
  ].filter(Boolean) as { value: Method; icon: typeof Truck; title: string; detail: string }[]

  return (
    <form
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]"
      onSubmit={(event) => {
        event.preventDefault()
        if (!pending) submit(event.currentTarget)
      }}
    >
      <div className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
          <legend className="sr-only">Tus datos</legend>
          <h2 className="font-display text-xl font-semibold">Tus datos</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Nombre y apellido" autoComplete="name" required maxLength={120} invalid={error?.field === 'name'} className="sm:col-span-2" />
            <Field id="email" label="Email" type="email" autoComplete="email" required maxLength={254} invalid={error?.field === 'email'} />
            <Field id="phone" label="Teléfono" type="tel" autoComplete="tel" required maxLength={40} placeholder="11 2345 6789" invalid={error?.field === 'phone'} />
            <Field id="dni" label="DNI o CUIT" inputMode="numeric" required maxLength={13} invalid={error?.field === 'dni'} />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Usamos estos datos para la factura y para avisarte el estado del pedido.
          </p>
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
          <legend className="sr-only">Entrega</legend>
          <h2 className="font-display text-xl font-semibold">Entrega</h2>
          <div role="radiogroup" aria-label="Método de entrega" className="grid gap-3 sm:grid-cols-2">
            {methods.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring',
                  method === option.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
                )}
              >
                <input
                  type="radio"
                  name="method"
                  value={option.value}
                  checked={method === option.value}
                  onChange={() => setMethod(option.value)}
                  className="sr-only"
                />
                <option.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold">{option.title}</span>
                  <span className="text-sm text-muted-foreground">{option.detail}</span>
                </span>
              </label>
            ))}
          </div>

          {method === 'delivery' ? (
            <div className="grid gap-4 sm:grid-cols-6">
              <Field id="street" label="Calle" autoComplete="address-line1" required maxLength={120} invalid={error?.field === 'address'} className="sm:col-span-4" />
              <Field id="number" label="Número" required maxLength={12} invalid={error?.field === 'address'} className="sm:col-span-2" />
              <Field id="apartment" label="Piso / depto (opcional)" autoComplete="address-line2" maxLength={40} className="sm:col-span-2" />
              <Field id="city" label="Ciudad" autoComplete="address-level2" required maxLength={80} invalid={error?.field === 'address'} className="sm:col-span-4" />
              <div className="flex flex-col gap-1.5 sm:col-span-3">
                <Label htmlFor="province">Provincia</Label>
                <select
                  id="province"
                  name="province"
                  required
                  defaultValue=""
                  autoComplete="address-level1"
                  className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="" disabled>
                    Elegí una provincia
                  </option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <Field id="postalCode" label="Código postal" autoComplete="postal-code" required maxLength={10} placeholder="1414" invalid={error?.field === 'address'} className="sm:col-span-3" />
              <Field id="notes" label="Indicaciones para la entrega (opcional)" maxLength={300} className="sm:col-span-6" />
            </div>
          ) : (
            <p className="rounded-xl bg-muted p-4 text-sm leading-relaxed">
              Retirás en <strong>{shipping.pickupAddress ?? 'el local'}</strong>
              {shipping.pickupHours ? ` · ${shipping.pickupHours}` : ''}. Te avisamos por email cuando esté listo.
            </p>
          )}
        </fieldset>

        <section aria-labelledby="detalle" className="rounded-2xl border border-border bg-card p-6">
          <h2 id="detalle" className="mb-4 font-display text-xl font-semibold">
            Tu pedido
          </h2>
          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.variantId}
                className={cn('flex justify-between gap-4 py-3 text-sm', error?.variantId === item.variantId && 'text-destructive')}
              >
                <div>
                  <p className="font-semibold">
                    {item.brand} {item.name}
                  </p>
                  <p className={cn(error?.variantId !== item.variantId && 'text-muted-foreground')}>
                    Talle {item.size} · {item.color} · x{item.quantity}
                  </p>
                </div>
                <p className="font-semibold">{formatPrice(item.unitPrice * item.quantity)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <OrderSummary
          subtotal={subtotal}
          itemCount={itemCount}
          shipping={shippingCost}
          shippingLabel={method === 'pickup' ? 'Retiro en el local' : 'Envío a domicilio'}
        >
          {!freeShipping && shipping.freeShippingThreshold != null && method === 'delivery' && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Envío gratis en compras desde {formatPrice(shipping.freeShippingThreshold)}.
            </p>
          )}
          <label className="flex items-start gap-2 text-sm leading-relaxed">
            <input type="checkbox" name="terms" required className="mt-1 size-4 accent-primary" />
            <span>
              Acepto los{' '}
              <Link href="/terminos" target="_blank" className="font-medium text-primary underline-offset-4 hover:underline">
                términos y condiciones
              </Link>{' '}
              y la{' '}
              <Link href="/privacidad" target="_blank" className="font-medium text-primary underline-offset-4 hover:underline">
                política de privacidad
              </Link>
              .
            </span>
          </label>
          {error && (
            <p role="alert" className="flex gap-2 text-sm leading-relaxed text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error.message}
            </p>
          )}
          {!paymentsEnabled && (
            <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
              Los pagos online se habilitan cuando la tienda conecta su cuenta de Mercado Pago.
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending || !paymentsEnabled} className="h-12 rounded-full text-base">
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Preparando el pago…
              </>
            ) : (
              <>
                <Lock className="size-4" aria-hidden="true" />
                Pagar con Mercado Pago
              </>
            )}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Tarjetas de crédito y débito, dinero en cuenta y efectivo. Reservamos el stock por 60 minutos mientras
            completás el pago.
          </p>
          <Link href="/carrito" className="text-center text-sm font-medium text-muted-foreground hover:text-foreground">
            Volver al carrito
          </Link>
        </OrderSummary>
      </div>
    </form>
  )
}
