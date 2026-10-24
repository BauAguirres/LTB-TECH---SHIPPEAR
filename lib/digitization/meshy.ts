import 'server-only'

// Cliente mínimo de Meshy Multi-Image to 3D (https://docs.meshy.ai/en/api/multi-image-to-3d).
// La API key vive solo en el servidor (MESHY_API_KEY) y nunca se devuelve ni se registra.

const BASE_URL = 'https://api.meshy.ai/openapi/v1/multi-image-to-3d'
const REQUEST_TIMEOUT_MS = 20_000
const DOWNLOAD_TIMEOUT_MS = 90_000
export const MAX_GLB_BYTES = 50 * 1024 * 1024

export function isMeshyConfigured(): boolean {
  return Boolean(process.env.MESHY_API_KEY?.trim())
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message)
  }
}

export type MeshyTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED'

export interface MeshyTask {
  status: MeshyTaskStatus
  progress: number
  glbUrl: string | null
  errorMessage: string | null
}

function apiKey(): string {
  const key = process.env.MESHY_API_KEY?.trim()
  if (!key) throw new ProviderError('Meshy no está configurado. Agregá MESHY_API_KEY en las variables del proyecto.', false)
  return key
}

function errorForStatus(status: number, providerMessage: string | null): ProviderError {
  const detail = providerMessage ? ` Detalle: ${providerMessage.slice(0, 200)}` : ''
  switch (status) {
    case 400:
      return new ProviderError(`Meshy rechazó la solicitud.${detail}`, true)
    case 401:
    case 403:
      return new ProviderError('La API key de Meshy es inválida o no tiene permisos. Revisá MESHY_API_KEY.', false)
    case 402:
      return new ProviderError(
        'La cuenta de Meshy no tiene créditos suficientes o requiere un plan pago. Revisá tu suscripción y reintentá.',
        true,
      )
    case 404:
      return new ProviderError('Meshy no encontró el trabajo. Puede haber expirado; reintentá la generación.', true)
    case 429:
      return new ProviderError('Se alcanzó el límite de uso de Meshy. Esperá unos minutos y reintentá.', true)
    default:
      return new ProviderError(
        status >= 500
          ? 'Meshy no está respondiendo correctamente. Reintentá en unos minutos.'
          : `Meshy devolvió un error inesperado (${status}).`,
        true,
      )
  }
}

async function readProviderMessage(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { message?: unknown }
    return typeof body.message === 'string' ? body.message : null
  } catch {
    return null
  }
}

async function request(path: string, init: RequestInit): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json', ...init.headers },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch (error) {
    if (error instanceof ProviderError) throw error
    const timedOut = error instanceof Error && error.name === 'TimeoutError'
    throw new ProviderError(
      timedOut ? 'Meshy tardó demasiado en responder. Reintentá en unos minutos.' : 'No se pudo conectar con Meshy. Revisá la conexión y reintentá.',
      true,
    )
  }
  if (!res.ok) throw errorForStatus(res.status, await readProviderMessage(res))
  return res
}

export async function createMeshyTask(imageUrls: string[]): Promise<string> {
  const res = await request('', {
    method: 'POST',
    body: JSON.stringify({
      image_urls: imageUrls,
      ai_model: 'latest',
      should_texture: true,
      enable_pbr: true,
      should_remesh: true,
      topology: 'triangle',
      target_polycount: 50000,
      target_formats: ['glb'],
      origin_at: 'bottom',
    }),
  })
  const body = (await res.json().catch(() => null)) as { result?: unknown } | null
  if (!body || typeof body.result !== 'string' || !body.result) {
    throw new ProviderError('Meshy devolvió una respuesta inválida al crear el trabajo.', true)
  }
  return body.result
}

const VALID_STATUSES: MeshyTaskStatus[] = ['PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'CANCELED']

export async function getMeshyTask(taskId: string): Promise<MeshyTask> {
  const res = await request(`/${encodeURIComponent(taskId)}`, { method: 'GET' })
  const body = (await res.json().catch(() => null)) as {
    status?: unknown
    progress?: unknown
    model_urls?: { glb?: unknown }
    task_error?: { message?: unknown }
  } | null
  if (!body || !VALID_STATUSES.includes(body.status as MeshyTaskStatus)) {
    throw new ProviderError('Meshy devolvió un estado inválido para el trabajo.', true)
  }
  const glb = body.model_urls?.glb
  const message = body.task_error?.message
  return {
    status: body.status as MeshyTaskStatus,
    progress: typeof body.progress === 'number' ? Math.max(0, Math.min(100, Math.round(body.progress))) : 0,
    glbUrl: typeof glb === 'string' && glb.startsWith('https://') ? glb : null,
    errorMessage: typeof message === 'string' && message ? message.slice(0, 200) : null,
  }
}

/** Borra el trabajo en Meshy. Solo reintegra créditos si seguía PENDING; un 409 (en curso) se ignora. */
export async function deleteMeshyTask(taskId: string): Promise<void> {
  try {
    await request(`/${encodeURIComponent(taskId)}`, { method: 'DELETE' })
  } catch {
    // Mejor esfuerzo: si no se puede borrar, el trabajo queda en la cuenta del proveedor.
  }
}

/** Los archivos GLB binarios empiezan con la firma ASCII "glTF". */
export function isGlbBuffer(bytes: Uint8Array): boolean {
  return bytes.length > 20 && bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46
}

/** Descarga el GLB resultante (URL firmada de Meshy) con límite de tamaño y verificación de formato. */
export async function downloadGlb(url: string): Promise<Uint8Array> {
  const host = new URL(url).hostname
  if (!host.endsWith('meshy.ai')) throw new ProviderError('La URL del resultado no pertenece a Meshy.', true)

  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS), cache: 'no-store' })
  } catch {
    throw new ProviderError('No se pudo descargar el modelo generado. Se reintentará en la próxima consulta.', true)
  }
  if (!res.ok) throw new ProviderError('El enlace del modelo generado no está disponible. Reintentá la consulta.', true)

  const declared = Number(res.headers.get('content-length') ?? 0)
  if (declared > MAX_GLB_BYTES) throw new ProviderError('El modelo generado supera los 50 MB permitidos.', false)

  const bytes = new Uint8Array(await res.arrayBuffer())
  if (bytes.byteLength > MAX_GLB_BYTES) throw new ProviderError('El modelo generado supera los 50 MB permitidos.', false)
  if (!isGlbBuffer(bytes)) throw new ProviderError('El archivo devuelto no es un GLB válido.', true)
  return bytes
}
