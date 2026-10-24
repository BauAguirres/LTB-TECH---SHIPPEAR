'use server'

import { revalidatePath } from 'next/cache'
import { getAdminClient } from '@/lib/auth'
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, PRODUCT_IMAGES_BUCKET } from '@/lib/storage'
import type { ProductStatus } from '@/lib/types'

export interface VariantInput {
  id?: string
  size: string
  color: string
  sku: string
  stock: number
}

export interface ProductInput {
  id?: string
  name: string
  slug: string
  brand: string
  description: string
  price: number
  status: ProductStatus
  variants: VariantInput[]
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_PRICE_PESOS = 100_000_000

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function revalidateCatalog(slug?: string) {
  revalidatePath('/', 'layout')
  if (slug) revalidatePath(`/producto/${slug}`)
}

function validate(input: ProductInput) {
  const fieldErrors: Record<string, string> = {}
  const name = String(input.name ?? '').trim()
  const brand = String(input.brand ?? '').trim()
  const description = String(input.description ?? '').trim()
  const slug = slugify(String(input.slug ?? '').trim() || name)
  const price = Number(input.price)
  const status: ProductStatus = input.status === 'published' ? 'published' : 'draft'

  if (name.length < 2 || name.length > 120) fieldErrors.name = 'El nombre debe tener entre 2 y 120 caracteres.'
  if (brand.length < 1 || brand.length > 60) fieldErrors.brand = 'Ingresá la marca (hasta 60 caracteres).'
  if (description.length > 4000) fieldErrors.description = 'La descripción no puede superar 4000 caracteres.'
  if (!slug) fieldErrors.slug = 'El slug no es válido.'
  if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE_PESOS)
    fieldErrors.price = 'El precio debe ser mayor a 0.'

  const variants = (Array.isArray(input.variants) ? input.variants : []).map((v) => ({
    id: v.id && UUID.test(v.id) ? v.id : undefined,
    size: String(v.size ?? '').trim(),
    color: String(v.color ?? '').trim(),
    sku: String(v.sku ?? '').trim() || null,
    stock: Number(v.stock),
  }))

  if (variants.length === 0) fieldErrors.variants = 'Agregá al menos una variante.'
  else if (variants.length > 200) fieldErrors.variants = 'Demasiadas variantes.'
  else if (
    variants.some(
      (v) =>
        !v.size ||
        v.size.length > 10 ||
        !v.color ||
        v.color.length > 40 ||
        (v.sku && v.sku.length > 64) ||
        !Number.isInteger(v.stock) ||
        v.stock < 0 ||
        v.stock > 100_000,
    )
  )
    fieldErrors.variants = 'Cada variante necesita talle, color y un stock entero mayor o igual a 0.'
  else {
    const combos = variants.map((v) => `${v.size.toLowerCase()}|${v.color.toLowerCase()}`)
    if (new Set(combos).size !== combos.length) fieldErrors.variants = 'Hay variantes repetidas (mismo talle y color).'
  }

  return {
    fieldErrors,
    values: { name, brand, description, slug, status, price_cents: Math.round(price * 100) },
    variants,
  }
}

function friendlyDbError(error: { code?: string; message: string }): string {
  if (error.code === '23505') {
    if (error.message.includes('slug')) return 'Ya existe un producto con ese slug.'
    if (error.message.includes('sku')) return 'Ese SKU ya está en uso por otra variante.'
    if (error.message.includes('unique_combo')) return 'Hay variantes repetidas (mismo talle y color).'
    return 'Ya existe un registro con esos datos.'
  }
  if (error.code === '42501') return 'No tenés permisos para realizar esta acción.'
  if (error.code === '23514') return 'Algún valor no cumple las reglas de la base de datos.'
  return 'No se pudo guardar. Intentá de nuevo.'
}

export async function saveProduct(input: ProductInput): Promise<ActionResult<{ id: string; slug: string }>> {
  const { supabase, error: authError } = await getAdminClient()
  if (!supabase) return { ok: false, error: authError }

  const { fieldErrors, values, variants } = validate(input)
  if (Object.keys(fieldErrors).length) return { ok: false, error: 'Revisá los campos marcados.', fieldErrors }

  const isEdit = !!input.id
  if (isEdit && !UUID.test(input.id!)) return { ok: false, error: 'Producto inválido.' }

  let productId = input.id
  let previousSlug: string | undefined

  if (isEdit) {
    const { data: prev } = await supabase.from('products').select('slug').eq('id', productId!).maybeSingle()
    if (!prev) return { ok: false, error: 'El producto no existe.' }
    previousSlug = prev.slug
    const { error } = await supabase.from('products').update(values).eq('id', productId!)
    if (error) return { ok: false, error: friendlyDbError(error) }
  } else {
    const { data, error } = await supabase.from('products').insert(values).select('id').single()
    if (error) return { ok: false, error: friendlyDbError(error) }
    productId = data.id
  }

  // Sincroniza variantes: borra las quitadas, actualiza las existentes e inserta las nuevas.
  const { data: existing, error: listError } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId!)
  if (listError) return { ok: false, error: friendlyDbError(listError) }

  const existingIds = new Set((existing ?? []).map((v) => v.id))
  const keptIds = new Set(variants.filter((v) => v.id && existingIds.has(v.id)).map((v) => v.id!))
  const removedIds = [...existingIds].filter((id) => !keptIds.has(id))

  if (removedIds.length) {
    const { error } = await supabase.from('product_variants').delete().in('id', removedIds)
    if (error) return { ok: false, error: friendlyDbError(error) }
  }

  const toUpdate = variants.filter((v) => v.id && keptIds.has(v.id))
  for (const v of toUpdate) {
    const { error } = await supabase
      .from('product_variants')
      .update({ size: v.size, color: v.color, sku: v.sku, stock: v.stock })
      .eq('id', v.id!)
      .eq('product_id', productId!)
    if (error) return { ok: false, error: friendlyDbError(error) }
  }

  const toInsert = variants
    .filter((v) => !v.id || !keptIds.has(v.id))
    .map((v) => ({ product_id: productId!, size: v.size, color: v.color, sku: v.sku, stock: v.stock }))
  if (toInsert.length) {
    const { error } = await supabase.from('product_variants').insert(toInsert)
    if (error) return { ok: false, error: friendlyDbError(error) }
  }

  revalidateCatalog(values.slug)
  if (previousSlug && previousSlug !== values.slug) revalidatePath(`/producto/${previousSlug}`)
  return { ok: true, data: { id: productId!, slug: values.slug } }
}

export async function setProductStatus(id: string, status: ProductStatus): Promise<ActionResult> {
  const { supabase, error: authError } = await getAdminClient()
  if (!supabase) return { ok: false, error: authError }
  if (!UUID.test(id) || (status !== 'draft' && status !== 'published')) return { ok: false, error: 'Datos inválidos.' }

  if (status === 'published') {
    const { count } = await supabase
      .from('product_variants')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id)
    if (!count) return { ok: false, error: 'Agregá al menos una variante antes de publicar.' }
  }

  const { data, error } = await supabase.from('products').update({ status }).eq('id', id).select('slug').maybeSingle()
  if (error) return { ok: false, error: friendlyDbError(error) }
  if (!data) return { ok: false, error: 'El producto no existe.' }

  revalidateCatalog(data.slug)
  return { ok: true, data: undefined }
}

export async function uploadProductImage(formData: FormData): Promise<ActionResult> {
  const { supabase, error: authError } = await getAdminClient()
  if (!supabase) return { ok: false, error: authError }

  const productId = String(formData.get('productId') ?? '')
  const altText = String(formData.get('altText') ?? '').trim().slice(0, 200)
  const file = formData.get('file')

  if (!UUID.test(productId)) return { ok: false, error: 'Producto inválido.' }
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Elegí una imagen.' }
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type))
    return { ok: false, error: 'Formato no permitido. Usá JPG, PNG o WebP.' }
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'La imagen supera los 5 MB.' }

  // Verifica la firma real del archivo, no solo el tipo MIME declarado por el navegador.
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  const isWebp =
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  if (!isJpeg && !isPng && !isWebp) return { ok: false, error: 'El archivo no es una imagen válida.' }

  const { data: product } = await supabase.from('products').select('slug, name, brand').eq('id', productId).maybeSingle()
  if (!product) return { ok: false, error: 'El producto no existe.' }

  const ext = isPng ? 'png' : isWebp ? 'webp' : 'jpg'
  const path = `${productId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' })
  if (uploadError) {
    console.error('[images] upload failed:', uploadError.message)
    return { ok: false, error: 'No se pudo subir la imagen.' }
  }

  const { count } = await supabase
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)

  const { error: insertError } = await supabase.from('product_images').insert({
    product_id: productId,
    storage_path: path,
    alt_text: altText || `${product.brand} ${product.name}`,
    sort_order: count ?? 0,
  })
  if (insertError) {
    await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path])
    return { ok: false, error: friendlyDbError(insertError) }
  }

  revalidateCatalog(product.slug)
  return { ok: true, data: undefined }
}

export async function deleteProductImage(imageId: string): Promise<ActionResult> {
  const { supabase, error: authError } = await getAdminClient()
  if (!supabase) return { ok: false, error: authError }
  if (!UUID.test(imageId)) return { ok: false, error: 'Imagen inválida.' }

  const { data: image } = await supabase
    .from('product_images')
    .select('storage_path, products(slug)')
    .eq('id', imageId)
    .maybeSingle()
  if (!image) return { ok: false, error: 'La imagen no existe.' }

  const { error } = await supabase.from('product_images').delete().eq('id', imageId)
  if (error) return { ok: false, error: friendlyDbError(error) }

  // Las imágenes de demo viven en /public: solo se borran del bucket las subidas.
  if (!image.storage_path.startsWith('/')) {
    await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([image.storage_path])
  }

  const products = image.products as { slug: string } | { slug: string }[] | null
  const slug = Array.isArray(products) ? products[0]?.slug : products?.slug
  revalidateCatalog(slug)
  return { ok: true, data: undefined }
}
