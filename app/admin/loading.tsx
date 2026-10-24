import { Loader2 } from 'lucide-react'

export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-5 w-full max-w-md animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="flex min-h-48 items-center justify-center rounded-2xl border border-border bg-card">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Cargando sección…</span>
      </div>
    </div>
  )
}
