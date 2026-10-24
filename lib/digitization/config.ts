export const MIN_PHOTOS = 4
export const MAX_PHOTOS = 12
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AllowedPhotoType = (typeof ALLOWED_PHOTO_TYPES)[number]

/** Meshy Multi-Image to 3D acepta como máximo 4 imágenes por trabajo. */
export const PROVIDER_MAX_IMAGES = 4

export const CAPTURES_BUCKET = 'product-captures'
export const RESULTS_BUCKET = 'digitization-results'
export const MODELS_BUCKET = 'product-models'

export const POLL_INTERVAL_MS = 5000

export type JobStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'confirmed' | 'discarded'
export type JobMode = 'meshy' | 'test'

export const ACTIVE_STATUSES: JobStatus[] = ['uploading', 'processing']

export const STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'Pendiente',
  uploading: 'Subiendo imágenes',
  processing: 'Procesando',
  completed: 'Completado',
  failed: 'Error',
  confirmed: 'Confirmado',
  discarded: 'Descartado',
}

export interface JobPhotoDTO {
  id: string
  url: string | null
  order: number
}

export interface JobDTO {
  id: string
  status: JobStatus
  mode: JobMode
  progress: number
  error: string | null
  retryable: boolean
  productId: string | null
  productLabel: string | null
  color: string | null
  attempts: number
  photos: JobPhotoDTO[]
  /** URL firmada (privada, de corta duración) del GLB generado, o el GLB de demostración en modo prueba. */
  previewUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface JobSummary {
  id: string
  status: JobStatus
  mode: JobMode
  productLabel: string | null
  color: string | null
  createdAt: string
}

/**
 * Elige hasta 4 fotos repartidas en la secuencia: la primera siempre es la vista
 * frontal (Meshy la usa como frente) y el resto cubre ángulos distintos.
 */
export function pickProviderPhotoIndexes(count: number, max = PROVIDER_MAX_IMAGES): number[] {
  if (count <= max) return Array.from({ length: count }, (_, i) => i)
  const picked = new Set<number>()
  for (let i = 0; i < max; i++) picked.add(Math.round((i * count) / max))
  return [...picked].sort((a, b) => a - b)
}
