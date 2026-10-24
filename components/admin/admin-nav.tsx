'use client'

import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { Box, LayoutDashboard, Loader2, Package, Settings, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/admin', label: 'Resumen', icon: LayoutDashboard },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/digitalizacion', label: 'Digitalización 3D', icon: Box },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
]

const linkClass = 'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors'

function NavIcon({ icon: Icon }: { icon: typeof Box }) {
  const { pending } = useLinkStatus()
  return pending ? (
    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
  ) : (
    <Icon className="size-4" aria-hidden="true" />
  )
}

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Panel de administración" className="flex gap-1 overflow-x-auto lg:flex-col">
      {links.map((link) => {
        const active = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              linkClass,
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <NavIcon icon={link.icon} />
            {link.label}
          </Link>
        )
      })}
      {/* Sale del panel hacia la tienda: navegación completa, sin depender del router del admin. */}
      <a
        href="/"
        className={cn(linkClass, 'text-muted-foreground hover:bg-muted hover:text-foreground lg:mt-4')}
      >
        <Store className="size-4" aria-hidden="true" />
        Ver tienda
      </a>
    </nav>
  )
}
