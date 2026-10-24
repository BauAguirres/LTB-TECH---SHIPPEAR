'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { AlertTriangle, ArrowLeft, Check, FlaskConical, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Panel, StatusBadge } from '@/components/admin/admin-ui'
import { statusTone, type ProductOption } from '@/components/admin/digitization/digitization-workspace'
import { TargetSelects } from '@/components/admin/digitization/target-selects'
import { SneakerViewer } from '@/components/viewer/sneaker-viewer'
import { Button } from '@/components/ui/button'
import { confirmJob, discardJob, startGeneration } from '@/lib/digitization/actions'
import {
  ACTIVE_STATUSES,
  POLL_INTERVAL_MS,
  STATUS_LABELS,
  pickProviderPhotoIndexes,
  type JobDTO,
  type JobStatus,
} from '@/lib/digitization/config'
import { cn } from '@/lib/utils'

async function fetchJob(url: string): Promise<JobDTO> {
  const res = await fetch(url, { cache: 'no-store' })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.error ?? 'No se pudo consultar el trabajo.')
  return body as JobDTO
}

const STEPS: JobStatus[] = ['pending', 'uploading', 'processing', 'completed']
const STEP_ORDER: Record<JobStatus, number> = {
  uploading: 1,
  pending: 1,
  processing: 2,
  completed: 3,
  confirmed: 4,
  failed: 2,
  discarded: -1,
}

export function JobPanel({ jobId, products, onClose }: { jobId: string; products: ProductOption[]; onClose: () => void }) {
  const router = useRouter()
  const { data: job, error, isLoading, mutate } = useSWR(`/api/admin/digitalizacion/${jobId}`, fetchJob, {
    refreshInterval: (latest) => (latest && ACTIVE_STATUSES.includes(latest.status) ? POLL_INTERVAL_MS : 0),
    revalidateOnFocus: true,
    keepPreviousData: true,
  })
  const [busy, setBusy] = useState<'retry' | 'confirm' | 'discard' | null>(null)
  const busyRef = useRef(false)
  const [productId, setProductId] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  if (job && !initialized) {
    setInitialized(true)
    setProductId(job.productId)
    setColor(job.color)
  }

  async function run(kind: 'retry' | 'confirm' | 'discard', action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(kind)
    try {
      const result = await action()
      if (result.ok) toast.success(success)
      else toast.error(result.error ?? 'No se pudo completar la acción.')
      await mutate()
      router.refresh()
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  if (isLoading && !job) {
    return (
      <Panel className="flex items-center gap-3">
        <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Cargando el trabajo…</p>
      </Panel>
    )
  }

  if (!job) {
    return (
      <Panel className="flex flex-col items-start gap-3">
        <p className="text-sm leading-relaxed text-muted-foreground">{error?.message ?? 'No se encontró el trabajo.'}</p>
        <Button variant="outline" onClick={onClose}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver
        </Button>
      </Panel>
    )
  }

  const isTest = job.mode === 'test'
  const sentIndexes = new Set(pickProviderPhotoIndexes(job.photos.length))
  const stepIndex = STEP_ORDER[job.status]
  const canDiscard = job.status !== 'confirmed' && job.status !== 'discarded'

  return (
    <div className="flex flex-col gap-5">
      <Panel className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={onClose}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Nuevo trabajo
            </Button>
            <h2 className="font-display text-xl font-semibold text-balance">
              {job.productLabel ?? 'Digitalización sin producto asociado'}
              {job.color && <span className="text-muted-foreground"> · {job.color}</span>}
            </h2>
            <p className="text-xs text-muted-foreground">
              Creado {new Date(job.createdAt).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })} · Intentos:{' '}
              {job.attempts}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isTest && <StatusBadge tone="danger">Modo prueba</StatusBadge>}
            <StatusBadge tone={statusTone(job.status)}>{STATUS_LABELS[job.status]}</StatusBadge>
          </div>
        </div>

        {isTest && (
          <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-relaxed">
            <FlaskConical className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <p>
              <span className="font-semibold">Modo prueba.</span> No se contacta a ningún proveedor: el progreso es simulado y la
              vista previa usa el modelo genérico de demostración, no uno generado con tus fotos.
            </p>
          </div>
        )}

        {job.status !== 'discarded' && (
          <ol className="grid grid-cols-4 gap-2" aria-label="Etapas del trabajo">
            {STEPS.map((step, i) => {
              const failedHere = job.status === 'failed' && i === 2
              const done = stepIndex > i || (stepIndex === 3 && i === 3) || job.status === 'confirmed'
              const current = !done && stepIndex === i
              return (
                <li key={step} className="flex flex-col gap-1.5" aria-current={current ? 'step' : undefined}>
                  <span
                    className={cn(
                      'h-1.5 rounded-full bg-muted',
                      done && 'bg-primary',
                      current && 'bg-primary/50',
                      failedHere && 'bg-destructive',
                    )}
                  />
                  <span className={cn('text-xs', done || current ? 'text-foreground' : 'text-muted-foreground', failedHere && 'text-destructive')}>
                    {failedHere ? 'Error' : STATUS_LABELS[step]}
                  </span>
                </li>
              )
            })}
          </ol>
        )}

        <StatusDetail job={job} />

        <div className="flex flex-wrap gap-2">
          {(job.status === 'pending' || job.status === 'failed') && (
            <Button
              disabled={!!busy}
              onClick={() => run('retry', () => startGeneration(job.id), 'Generación iniciada.')}
            >
              {busy === 'retry' ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="size-4" aria-hidden="true" />}
              {job.status === 'failed' ? 'Reintentar con las mismas fotos' : 'Generar modelo 3D'}
            </Button>
          )}
          {canDiscard && (
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => {
                const warning =
                  job.status === 'processing' && !isTest
                    ? 'El proveedor ya puede haber consumido créditos. ¿Descartar el trabajo y borrar sus fotos?'
                    : '¿Descartar el trabajo y borrar sus fotos?'
                if (window.confirm(warning)) run('discard', () => discardJob(job.id), 'Trabajo descartado.')
              }}
            >
              {busy === 'discard' ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
              Descartar
            </Button>
          )}
        </div>
      </Panel>

      {(job.status === 'completed' || job.status === 'confirmed') && job.previewUrl && (
        <Panel className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-semibold">Vista previa</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isTest
                ? 'Modelo genérico de demostración. No corresponde a tus fotos.'
                : 'Revisá el modelo desde todos los ángulos antes de publicarlo. El catálogo sigue mostrando las fotos convencionales.'}
            </p>
          </div>
          <SneakerViewer
            src={job.previewUrl}
            alt={isTest ? 'Modelo de demostración (modo prueba)' : `Modelo 3D generado de ${job.productLabel ?? 'la zapatilla'}`}
            options={{ enableAR: false, autoRotate: true }}
            className="aspect-[4/3] w-full"
          />

          {job.status === 'completed' && (
            <div className="flex flex-col gap-4 border-t border-border pt-4">
              <TargetSelects
                products={products}
                productId={productId}
                color={color}
                onProductChange={(id) => {
                  setProductId(id)
                  setColor(null)
                }}
                onColorChange={setColor}
                disabled={isTest || !!busy}
              />
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <Button
                  size="lg"
                  disabled={isTest || !productId || !!busy}
                  onClick={() =>
                    productId &&
                    run('confirm', () => confirmJob(job.id, { productId, color }), 'Modelo guardado y asociado al producto.')
                  }
                >
                  {busy === 'confirm' ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
                  Confirmar y asociar al producto
                </Button>
                <p className="text-xs text-muted-foreground">
                  {isTest
                    ? 'Los resultados del modo prueba no se pueden asociar a productos.'
                    : 'Al confirmar, el modelo se publica en la ficha del producto (si el producto está publicado).'}
                </p>
              </div>
            </div>
          )}

          {job.status === 'confirmed' && job.productId && (
            <p className="flex items-center gap-2 text-sm">
              <Check className="size-4 text-primary" aria-hidden="true" />
              Modelo asociado.{' '}
              <Link href={`/admin/productos/${job.productId}`} className="font-medium text-primary underline-offset-4 hover:underline">
                Ver producto
              </Link>
            </p>
          )}
        </Panel>
      )}

      {job.photos.length > 0 && (
        <Panel className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold">Fotos originales ({job.photos.length})</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Guardadas en almacenamiento privado. Las marcadas se envían al proveedor.
          </p>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {job.photos.map((photo, i) => (
              <li key={photo.id} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                {photo.url && (
                  // eslint-disable-next-line @next/next/no-img-element -- signed private URLs
                  <img src={photo.url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                )}
                {sentIndexes.has(i) && (
                  <span className="absolute top-1 left-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                    {i === 0 ? 'Frente' : 'Enviada'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}

function StatusDetail({ job }: { job: JobDTO }) {
  switch (job.status) {
    case 'uploading':
      return (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Las fotos se están subiendo. Si cerraste la pantalla durante la subida, descartá este trabajo y crealo de nuevo.
        </p>
      )
    case 'pending':
      return (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Las fotos están guardadas. Iniciá la generación cuando quieras.
        </p>
      )
    case 'processing':
      return (
        <div className="flex flex-col gap-2" aria-live="polite">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
              {job.mode === 'test' ? 'Simulando la generación…' : 'Meshy está generando el modelo…'}
            </span>
            <span className="font-mono text-muted-foreground">{job.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${job.progress}%` }} />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Puede tardar varios minutos. Podés salir de esta pantalla: el estado queda guardado y se actualiza al volver.
          </p>
          {job.error && (
            <p className="flex gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="size-3.5 shrink-0 text-destructive" aria-hidden="true" />
              Última consulta con problemas: {job.error} Se reintenta automáticamente.
            </p>
          )}
        </div>
      )
    case 'failed':
      return (
        <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-relaxed" role="alert">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold">La generación falló</p>
            <p>{job.error ?? 'Error desconocido.'}</p>
            <p className="text-muted-foreground">Las fotos originales se conservan para reintentar.</p>
          </div>
        </div>
      )
    case 'completed':
      return (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {job.mode === 'test'
            ? 'Simulación terminada. Revisá la vista previa de demostración.'
            : 'El modelo está listo y guardado en privado. Revisalo y confirmá para asociarlo al producto, o descartalo.'}
        </p>
      )
    case 'confirmed':
      return <p className="text-sm leading-relaxed text-muted-foreground">El modelo fue revisado y asociado al producto.</p>
    case 'discarded':
      return <p className="text-sm leading-relaxed text-muted-foreground">Este trabajo fue descartado.</p>
  }
}
