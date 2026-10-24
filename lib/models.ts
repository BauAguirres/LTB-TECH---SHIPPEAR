import type { ProductModel } from '@/lib/types'

/**
 * Modelo genérico de demostración. No reproduce ninguna zapatilla de marca:
 * se usa solo en /demo-3d para mostrar cómo funcionan el visor y la realidad
 * aumentada. Nunca se presenta como el modelo de un producto del catálogo.
 * El GLB incluye tres variantes de material (KHR_materials_variants).
 */
export const DEMO_SNEAKER_MODEL = {
  src: '/models/generic-sneaker.glb',
  alt: 'Modelo 3D genérico de una zapatilla deportiva',
  variants: [
    { name: 'street', label: 'Street' },
    { name: 'beach', label: 'Beach' },
    { name: 'midnight', label: 'Midnight' },
  ],
  attribution: {
    label: 'Materials Variants Shoe — Shopify, CC BY 4.0',
    href: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/MaterialsVariantsShoe',
  },
} as const

/** Acepta rutas locales (/models/x.glb) o URLs https que terminen en .glb. */
export function isValidGlbUrl(url: string | null | undefined): url is string {
  if (!url) return false
  return /^(https:\/\/[^\s]+|\/[^\s]+)\.glb(\?[^\s]*)?$/i.test(url)
}

/**
 * Elige el modelo para el color seleccionado: primero uno específico de ese
 * color y, si no hay, uno general (color null). Nunca toma el de otro color.
 */
export function resolveModelForColor(models: ProductModel[], color: string | null): ProductModel | null {
  const normalized = color?.trim().toLowerCase()
  const specific = normalized ? models.find((m) => m.color?.trim().toLowerCase() === normalized) : undefined
  return specific ?? models.find((m) => !m.color) ?? null
}
