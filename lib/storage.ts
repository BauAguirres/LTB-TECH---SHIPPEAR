export const PRODUCT_IMAGES_BUCKET = 'product-images'
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Convierte un storage_path en URL pública. Las rutas locales (/images/...) se devuelven tal cual. */
export function productImageUrl(storagePath: string): string {
  if (!storagePath) return '/placeholder.svg'
  if (storagePath.startsWith('/') || storagePath.startsWith('https://')) return storagePath
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/')
  return `${base}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${encoded}`
}
