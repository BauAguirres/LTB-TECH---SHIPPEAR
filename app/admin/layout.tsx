import type { Metadata } from 'next'
import { LogOut } from 'lucide-react'
import { AdminNav } from '@/components/admin/admin-nav'
import { Logo } from '@/components/site/logo'
import { Button } from '@/components/ui/button'
import { requireAdmin } from '@/lib/auth'
import { signOut } from '@/lib/auth-actions'

export const metadata: Metadata = {
  title: { default: 'Panel admin', template: '%s · Admin SneakAR' },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()

  return (
    <div className="min-h-dvh">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <Logo href="/admin" />
          <AdminNav />
          <div className="flex items-center justify-between gap-2 border-t border-border pt-4 lg:flex-col lg:items-stretch">
            <p className="truncate text-xs text-muted-foreground" title={session.email ?? undefined}>
              {session.email}
            </p>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm" className="w-full">
                <LogOut aria-hidden="true" />
                Cerrar sesión
              </Button>
            </form>
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
