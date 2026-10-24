'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Panel, StatusBadge } from '@/components/admin/admin-ui'
import { JobPanel } from '@/components/admin/digitization/job-panel'
import { NewJobForm } from '@/components/admin/digitization/new-job-form'
import { Button } from '@/components/ui/button'
import { STATUS_LABELS, type JobStatus, type JobSummary } from '@/lib/digitization/config'
import { cn } from '@/lib/utils'

export interface ProductOption {
  value: string
  label: string
  colors: string[]
}

const tips = [
  'Buena luz difusa, sin sombras duras ni reflejos.',
  'Fondo liso y de un color que contraste con la zapatilla.',
  'La zapatilla completa en cada foto, sin cortar la puntera ni el talón.',
  'La primera foto es la vista frontal; las demás, desde lados, atrás y arriba.',
]

export function statusTone(status: JobStatus): 'primary' | 'muted' | 'danger' {
  if (status === 'failed') return 'danger'
  if (status === 'completed' || status === 'confirmed') return 'primary'
  return 'muted'
}

export function DigitizationWorkspace({
  products,
  jobs,
  providerConfigured,
  initialJobId,
}: {
  products: ProductOption[]
  jobs: JobSummary[]
  providerConfigured: boolean
  initialJobId: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [jobId, setJobId] = useState<string | null>(initialJobId)

  function selectJob(id: string | null) {
    setJobId(id)
    router.replace(id ? `${pathname}?trabajo=${id}` : pathname, { scroll: false })
    router.refresh()
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        {jobId ? (
          <JobPanel key={jobId} jobId={jobId} products={products} onClose={() => selectJob(null)} />
        ) : (
          <NewJobForm products={products} providerConfigured={providerConfigured} onCreated={selectJob} />
        )}
      </div>

      <div className="flex flex-col gap-5 xl:sticky xl:top-6 xl:self-start">
        <Panel className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">Trabajos recientes</h2>
            {jobId && (
              <Button size="sm" variant="outline" onClick={() => selectJob(null)}>
                <Plus className="size-4" aria-hidden="true" />
                Nuevo
              </Button>
            )}
          </div>
          {jobs.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted-foreground">Todavía no hay trabajos de digitalización.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {jobs.map((job) => (
                <li key={job.id}>
                  <button
                    type="button"
                    onClick={() => selectJob(job.id)}
                    aria-current={job.id === jobId ? 'true' : undefined}
                    className={cn(
                      'flex w-full flex-col gap-1 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted',
                      job.id === jobId && 'bg-muted',
                    )}
                  >
                    <span className="truncate text-sm font-medium">
                      {job.productLabel ?? 'Sin producto asociado'}
                      {job.color && <span className="text-muted-foreground"> · {job.color}</span>}
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={statusTone(job.status)}>{STATUS_LABELS[job.status]}</StatusBadge>
                      {job.mode === 'test' && <StatusBadge tone="danger">Modo prueba</StatusBadge>}
                      <span className="text-xs text-muted-foreground">
                        {new Date(job.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold">Cómo tomar las fotos</h2>
          <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
            {tips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                {tip}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
