import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {description && <p className="max-w-2xl leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn('rounded-2xl border border-border bg-card p-5', className)}>{children}</section>
}

export function StatusBadge({ tone, children }: { tone: 'primary' | 'muted' | 'danger'; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tone === 'primary' && 'bg-accent text-accent-foreground',
        tone === 'muted' && 'bg-muted text-muted-foreground',
        tone === 'danger' && 'bg-destructive/10 text-destructive',
      )}
    >
      {children}
    </span>
  )
}
