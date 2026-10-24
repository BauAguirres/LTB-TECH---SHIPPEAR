'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Box, LayoutDashboard, Package, Settings, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/admin', label: 'Resumen', icon: LayoutDashboard },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/digitalizacion', label: 'Digitalización 3D', icon: Box },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
]

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
              'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <link.icon className="size-4" aria-hidden="true" />
            {link.label}
          </Link>
        )
      })}
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground lg:mt-4"
      >
        <Store className="size-4" aria-hidden="true" />
        Ver tienda
      </Link>
    </nav>
  )
}
