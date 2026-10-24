'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Panel } from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'
import { saveProduct } from '@/lib/admin/product-actions'
import type { ProductStatus, ProductWithRelations } from '@/lib/types'

interface VariantDraft {
  key: string
  id?: string
  size: string
  color: string
  sku: string
  stock: string
}

const inputClass =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive'

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

let keySeed = 0
const newKey = () => `new-${++keySeed}`

export function ProductForm({ product }: { product?: ProductWithRelations }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [variants, setVariants] = useState<VariantDraft[]>(() =>
    product?.variants.length
      ? product.variants.map((v) => ({ key: v.id, id: v.id, size: v.size, color: v.color, sku: v.sku ?? '', stock: String(v.stock) }))
      : [{ key: newKey(), size: '40', color: '', sku: '', stock: '0' }],
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  function updateVariant(key: string, patch: Partial<VariantDraft>) {
    setVariants((list) => list.map((v) => (v.key === key ? { ...v, ...patch } : v)))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const next: Record<string, string> = {}
    const name = String(data.get('name') ?? '').trim()
    const brand = String(data.get('brand') ?? '').trim()
    const price = Number(data.get('price'))
    if (name.length < 2) next.name = 'Ingresá un nombre de al menos 2 caracteres.'
    if (brand.length < 1) next.brand = 'Ingresá la marca.'
    if (!Number.isFinite(price) || price <= 0) next.price = 'El precio debe ser mayor a 0.'
    const invalidVariant = variants.some(
      (v) => !v.size.trim() || !v.color.trim() || !Number.isInteger(Number(v.stock)) || Number(v.stock) < 0,
    )
    if (invalidVariant) next.variants = 'Cada variante necesita talle, color y un stock entero mayor o igual a 0.'
    const combos = variants.map((v) => `${v.size.trim().toLowerCase()}|${v.color.trim().toLowerCase()}`)
    if (new Set(combos).size !== combos.length) next.variants = 'Hay variantes repetidas (mismo talle y color).'

    setErrors(next)
    if (Object.keys(next).length > 0) {
      toast.error('Revisá los campos marcados.')
      return
    }

    startTransition(async () => {
      const result = await saveProduct({
        id: product?.id,
        name,
        brand,
        slug: String(data.get('slug') ?? ''),
        description: String(data.get('description') ?? ''),
        price,
        status: (data.get('status') as ProductStatus) ?? 'draft',
        variants: variants.map((v) => ({ id: v.id, size: v.size, color: v.color, sku: v.sku, stock: Number(v.stock) })),
      })

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
        return
      }

      toast.success(product ? 'Cambios guardados' : `“${name}” creado`, {
        description: product ? undefined : 'Ahora podés subir sus fotos.',
      })
      if (product) router.refresh()
      else router.push(`/admin/productos/${result.data.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5" aria-busy={pending}>
      <Panel className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre" htmlFor="name" error={errors.name}>
          <input id="name" name="name" defaultValue={product?.name} className={inputClass} placeholder="Ej. Street Runner" aria-invalid={!!errors.name} />
        </Field>
        <Field label="Marca" htmlFor="brand" error={errors.brand}>
          <input id="brand" name="brand" defaultValue={product?.brand} className={inputClass} placeholder="Ej. Nike" aria-invalid={!!errors.brand} />
        </Field>
        <Field label="Precio (ARS)" htmlFor="price" error={errors.price}>
          <input
            id="price"
            name="price"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            defaultValue={product?.price}
            className={inputClass}
            aria-invalid={!!errors.price}
          />
        </Field>
        <Field label="Estado" htmlFor="status">
          <select id="status" name="status" className={inputClass} defaultValue={product?.status ?? 'draft'}>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Slug (URL)" htmlFor="slug" error={errors.slug}>
            <input
              id="slug"
              name="slug"
              defaultValue={product?.slug}
              className={inputClass}
              placeholder="Se genera desde el nombre si lo dejás vacío"
              aria-invalid={!!errors.slug}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Descripción" htmlFor="description" error={errors.description}>
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={product?.description}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus-visible:border-ring"
            />
          </Field>
        </div>
      </Panel>

      <Panel className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Variantes y stock</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setVariants((list) => [...list, { key: newKey(), size: '', color: list.at(-1)?.color ?? '', sku: '', stock: '0' }])
            }
          >
            <Plus className="size-4" aria-hidden="true" />
            Agregar
          </Button>
        </div>
        <ul className="flex flex-col gap-3">
          {variants.map((v, i) => (
            <li key={v.key} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1.4fr_1.4fr_1fr_auto]">
              <Field label="Talle" htmlFor={`size-${v.key}`}>
                <input id={`size-${v.key}`} value={v.size} onChange={(e) => updateVariant(v.key, { size: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Color" htmlFor={`color-${v.key}`}>
                <input id={`color-${v.key}`} value={v.color} onChange={(e) => updateVariant(v.key, { color: e.target.value })} className={inputClass} />
              </Field>
              <Field label="SKU (opcional)" htmlFor={`sku-${v.key}`}>
                <input id={`sku-${v.key}`} value={v.sku} onChange={(e) => updateVariant(v.key, { sku: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Stock" htmlFor={`stock-${v.key}`}>
                <input
                  id={`stock-${v.key}`}
                  type="number"
                  min={0}
                  step={1}
                  value={v.stock}
                  onChange={(e) => updateVariant(v.key, { stock: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <button
                type="button"
                aria-label={`Quitar variante ${i + 1}`}
                disabled={variants.length === 1}
                onClick={() => setVariants((list) => list.filter((x) => x.key !== v.key))}
                className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-30"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {errors.variants && (
          <p className="text-sm text-destructive" role="alert">
            {errors.variants}
          </p>
        )}
      </Panel>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {pending ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </div>
    </form>
  )
}
