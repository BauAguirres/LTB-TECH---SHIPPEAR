import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CAPTURES_BUCKET,
  RESULTS_BUCKET,
  type JobDTO,
  type JobMode,
  type JobStatus,
  type JobSummary,
} from '@/lib/digitization/config'
import { downloadGlb, getMeshyTask, ProviderError } from '@/lib/digitization/meshy'
import { DEMO_SNEAKER_MODEL } from '@/lib/models'

const SIGNED_URL_TTL_SECONDS = 60 * 60
const PROCESSING_TIMEOUT_MS = 45 * 60 * 1000
const MISSING_TASK_TIMEOUT_MS = 2 * 60 * 1000
const PROVIDER_POLL_MIN_MS = 4000
export const TEST_MODE_DURATION_MS = 20_000

export const JOB_SELECT = `
  id, product_id, color, status, mode, provider_task_id, progress, error_message, error_retryable,
  result_path, attempts, simulate_failure, started_at, finished_at, created_at, updated_at,
  product:products (brand, name),
  photos:digitization_photos (id, storage_path, sort_order)
`

export interface JobRow {
  id: string
  product_id: string | null
  color: string | null
  status: JobStatus
  mode: JobMode
  provider_task_id: string | null
  progress: number
  error_message: string | null
  error_retryable: boolean
  result_path: string | null
  attempts: number
  simulate_failure: boolean
  started_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
  product: { brand: string; name: string } | null
  photos: { id: string; storage_path: string; sort_order: number }[] | null
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function resultPathFor(jobId: string) {
  return `jobs/${jobId}/model.glb`
}

export async function loadJob(supabase: SupabaseClient, id: string): Promise<JobRow | null> {
  if (!UUID.test(id)) return null
  const { data, error } = await supabase.from('digitization_jobs').select(JOB_SELECT).eq('id', id).maybeSingle()
  if (error) {
    console.error('[digitization] loadJob:', error.message)
    return null
  }
  return data as unknown as JobRow | null
}

export async function listRecentJobs(supabase: SupabaseClient, limit = 20): Promise<JobSummary[]> {
  const { data, error } = await supabase
    .from('digitization_jobs')
    .select('id, status, mode, color, created_at, product:products (brand, name)')
    .neq('status', 'discarded')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[digitization] listRecentJobs:', error.message)
    return []
  }
  return (data as unknown as Pick<JobRow, 'id' | 'status' | 'mode' | 'color' | 'created_at' | 'product'>[]).map((j) => ({
    id: j.id,
    status: j.status,
    mode: j.mode,
    color: j.color,
    productLabel: j.product ? `${j.product.brand} ${j.product.name}` : null,
    createdAt: j.created_at,
  }))
}

export function sortedPhotos(row: JobRow) {
  return [...(row.photos ?? [])].sort((a, b) => a.sort_order - b.sort_order)
}

export async function toJobDTO(supabase: SupabaseClient, row: JobRow): Promise<JobDTO> {
  const photos = sortedPhotos(row)
  const signed = photos.length
    ? await supabase.storage.from(CAPTURES_BUCKET).createSignedUrls(
        photos.map((p) => p.storage_path),
        SIGNED_URL_TTL_SECONDS,
      )
    : { data: [] as { signedUrl: string | null }[] }

  let previewUrl: string | null = null
  if (row.status === 'completed' || row.status === 'confirmed') {
    if (row.mode === 'test') {
      previewUrl = DEMO_SNEAKER_MODEL.src
    } else if (row.result_path) {
      const { data } = await supabase.storage.from(RESULTS_BUCKET).createSignedUrl(row.result_path, SIGNED_URL_TTL_SECONDS)
      previewUrl = data?.signedUrl ?? null
    }
  }

  return {
    id: row.id,
    status: row.status,
    mode: row.mode,
    progress: row.progress,
    error: row.error_message,
    retryable: row.error_retryable,
    productId: row.product_id,
    productLabel: row.product ? `${row.product.brand} ${row.product.name}` : null,
    color: row.color,
    attempts: row.attempts,
    photos: photos.map((p, i) => ({ id: p.id, order: p.sort_order, url: signed.data?.[i]?.signedUrl ?? null })),
    previewUrl,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function update(supabase: SupabaseClient, row: JobRow, patch: Partial<JobRow>): Promise<JobRow> {
  // Solo actualiza si el trabajo sigue procesándose: evita pisar un descarte o una confirmación concurrente.
  const { error } = await supabase
    .from('digitization_jobs')
    .update(patch)
    .eq('id', row.id)
    .eq('status', 'processing')
  if (error) console.error('[digitization] update:', error.message)
  return (await loadJob(supabase, row.id)) ?? row
}

function fail(supabase: SupabaseClient, row: JobRow, message: string, retryable = true) {
  return update(supabase, row, {
    status: 'failed',
    error_message: message.slice(0, 500),
    error_retryable: retryable,
    finished_at: new Date().toISOString(),
  })
}

/**
 * Avanza un trabajo en proceso consultando al proveedor (o al reloj, en modo prueba).
 * Se llama en cada polling del panel; no mantiene ninguna petición abierta.
 */
export async function advanceJob(supabase: SupabaseClient, row: JobRow): Promise<JobRow> {
  if (row.status !== 'processing') return row

  const startedAt = row.started_at ? new Date(row.started_at).getTime() : Date.now()
  const elapsed = Date.now() - startedAt

  if (row.mode === 'test') {
    if (elapsed < TEST_MODE_DURATION_MS) {
      const progress = Math.min(95, Math.round((elapsed / TEST_MODE_DURATION_MS) * 100))
      return progress > row.progress ? update(supabase, row, { progress }) : row
    }
    if (row.simulate_failure && row.attempts === 1) {
      return fail(supabase, row, 'Fallo simulado del modo prueba. Usá «Reintentar» para comprobar la recuperación.')
    }
    return update(supabase, row, { status: 'completed', progress: 100, finished_at: new Date().toISOString() })
  }

  if (elapsed > PROCESSING_TIMEOUT_MS) {
    return fail(supabase, row, 'La generación superó el tiempo máximo de espera (45 min). Reintentá el trabajo.')
  }
  if (!row.provider_task_id) {
    return elapsed > MISSING_TASK_TIMEOUT_MS
      ? fail(supabase, row, 'No se pudo crear el trabajo en Meshy. Reintentá la generación.')
      : row
  }
  if (Date.now() - new Date(row.updated_at).getTime() < PROVIDER_POLL_MIN_MS) return row

  try {
    const task = await getMeshyTask(row.provider_task_id)

    if (task.status === 'PENDING' || task.status === 'IN_PROGRESS') {
      // Se toca updated_at aunque no cambie el progreso para espaciar las consultas al proveedor.
      return update(supabase, row, { progress: Math.min(99, task.progress) })
    }
    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      return fail(
        supabase,
        row,
        task.status === 'CANCELED'
          ? 'El trabajo fue cancelado en Meshy.'
          : `Meshy no pudo generar el modelo.${task.errorMessage ? ` Detalle: ${task.errorMessage}` : ''} Probá con fotos más nítidas y reintentá.`,
      )
    }
    if (!task.glbUrl) {
      return fail(supabase, row, 'Meshy terminó, pero no devolvió un archivo GLB compatible con el visor.')
    }

    const bytes = await downloadGlb(task.glbUrl)
    const path = resultPathFor(row.id)
    const { error: uploadError } = await supabase.storage
      .from(RESULTS_BUCKET)
      .upload(path, bytes, { contentType: 'model/gltf-binary', upsert: true })
    if (uploadError) {
      console.error('[digitization] result upload:', uploadError.message)
      return fail(supabase, row, 'El modelo se generó, pero no se pudo guardar. Se reintentará la descarga.')
    }

    return update(supabase, row, {
      status: 'completed',
      progress: 100,
      result_path: path,
      error_message: null,
      finished_at: new Date().toISOString(),
    })
  } catch (error) {
    if (error instanceof ProviderError) {
      // Errores transitorios al consultar no hacen fallar el trabajo: se vuelve a intentar en el próximo polling.
      if (error.retryable && elapsed < PROCESSING_TIMEOUT_MS) {
        return update(supabase, row, { error_message: error.message })
      }
      return fail(supabase, row, error.message, error.retryable)
    }
    console.error('[digitization] advanceJob:', error instanceof Error ? error.message : 'unknown')
    return fail(supabase, row, 'Ocurrió un error inesperado al consultar el trabajo.')
  }
}
