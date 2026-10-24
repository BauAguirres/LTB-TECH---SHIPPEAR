'use server'

import { revalidatePath } from 'next/cache'
import { getAdminClient } from '@/lib/auth'
import { MODELS_BUCKET } from '@/lib/digitization/config'
import type { ActionResult } from '@/lib/admin/product-actions'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PUBLIC_MARKER = `/storage/v1/object/public/${MODELS_BUCKET}/`

function revalidateProduct(slug: string) {
  revalidatePath('/', 'layout')
  revalidatePath(`/producto/${slug}`)
}

/**
 * Registra un GLB que el admin ya subió a Storage (bucket product-models).
 * El archivo se sube desde el navegador porque supera el límite de cuerpo de
 * las Server Actions; acá se valida la ruta, el color y la firma real del GLB.
 */
export async function registerProductModel(input: {
  productId: string
  color: string | null
  path: string
}): Promise<ActionResult> {
  const { supabase, error: authError } = await getAdminClient()
  if (!supabase) return { ok: false, error: authError }

  const productId = String(input.productId ?? '')
  const path = String(input.path ?? '')
  const color = input.color ? String(input.color).trim() : null

  if (!UUID.test(productId)) return { ok: false, error: 'Producto inválido.' }
  if (!new RegExp(`^products/${productId}/manual-[0-9a-f-]{36}\\.glb$`, 'i').test(path))
    return { ok: false, error: 'Ruta de archivo inválida.' }

  const { data: product } = await supabase
    .from('products')
    .select('slug, variants:product_variants (color)')
    .eq('id', productId)
    .maybeSingle()
  if (!product) return { ok: false, error: 'El producto no existe.' }

  const colors = new Set((product.variants ?? []).map((v: { color: string }) => v.color))
  if (color && !colors.has(color)) return { ok: false, error: 'El color elegido no pertenece al producto.' }

  const discard = async (message: string) => {
    await supabase.storage.from(MODELS_BUCKET).remove([path])
    return { ok: false as const, error: message }
  }

  const { data: publicUrl } = supabase.storage.from(MODELS_BUCKET).getPublicUrl(path)
  try {
    const res = await fetch(publicUrl.publicUrl, {
      headers: { Range: 'bytes=0-11' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    const head = new Uint8Array(await res.arrayBuffer())
    const magic = String.fromCharCode(...head.slice(0, 4))
    const version = head[4] | (head[5] << 8)
    if (!res.ok || magic !== 'glTF') return discard('El archivo no es un GLB válido.')
    if (version !== 2) return discard('El GLB debe ser glTF 2.0.')
  } catch {
    return discard('No se pudo verificar el archivo subido. Intentá de nuevo.')
  }

  const { error } = await supabase.from('product_models').insert({
    product_id: productId,
    color,
    glb_url: publicUrl.publicUrl,
    status: 'completed',
    provider: 'manual',
  })
  if (error) {
    console.error('[models] register:', error.message)
    return discard('No se pudo guardar el modelo.')
  }

  revalidateProduct(product.slug)
  return { ok: true, data: undefined }
}

export async function deleteProductModel(modelId: string): Promise<ActionResult> {
  const { supabase, error: authError } = await getAdminClient()
  if (!supabase) return { ok: false, error: authError }
  if (!UUID.test(String(modelId))) return { ok: false, error: 'Modelo inválido.' }

  const { data: model } = await supabase
    .from('product_models')
    .select('id, glb_url, product:products (slug)')
    .eq('id', modelId)
    .maybeSingle()
  if (!model) return { ok: false, error: 'El modelo no existe.' }

  const { error } = await supabase.from('product_models').delete().eq('id', modelId)
  if (error) {
    console.error('[models] delete:', error.message)
    return { ok: false, error: 'No se pudo eliminar el modelo.' }
  }

  const markerIndex = model.glb_url?.indexOf(PUBLIC_MARKER) ?? -1
  if (model.glb_url && markerIndex >= 0) {
    const storagePath = decodeURIComponent(model.glb_url.slice(markerIndex + PUBLIC_MARKER.length).split('?')[0])
    await supabase.storage.from(MODELS_BUCKET).remove([storagePath])
  }

  const product = model.product as unknown as { slug: string } | null
  if (product?.slug) revalidateProduct(product.slug)
  return { ok: true, data: undefined }
}
