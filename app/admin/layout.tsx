import type { Metadata } from 'next'
import { ShieldAlert } from 'lucide-react'
import { AdminNav } from '@/components/admin/admin-nav'
import { Logo } from '@/components/site/logo'

export const metadata: Metadata = {
  title: { default: 'Panel admin', template: '%s · Admin SneakAR' },
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <div className="flex items-center gap-2 bg-foreground px-4 py-2 text-xs text-background">
        <ShieldAlert className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <p>Fase 1: panel sin autenticación y con datos temporales. El acceso protegido con Supabase Auth llega en la Fase 2.</p>
      </div>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <Logo href="/admin" />
          <AdminNav />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
