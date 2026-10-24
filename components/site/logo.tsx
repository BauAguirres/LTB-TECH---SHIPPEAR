import Link from 'next/link'
import { cn } from '@/lib/utils'

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn('flex items-center gap-2 font-display text-xl font-bold tracking-tight', className)}
      aria-label="SneakAR, ir al inicio"
    >
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground"
      >
        S
      </span>
      <span>
        Sneak<span className="text-primary">AR</span>
      </span>
    </Link>
  )
}
