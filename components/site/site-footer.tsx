import Link from 'next/link'
import { Logo } from '@/components/site/logo'

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 md:flex-row md:justify-between md:px-6">
        <div className="flex max-w-sm flex-col gap-3">
          <Logo />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Tienda de zapatillas con visualización 3D y realidad aumentada. Proyecto de demostración:
            precios, stock y pedidos son ficticios y no representan información oficial de las marcas.
          </p>
        </div>
        <nav aria-label="Pie de página" className="flex gap-12 text-sm">
          <div className="flex flex-col gap-2">
            <p className="font-semibold">Tienda</p>
            <Link href="/catalogo" className="text-muted-foreground hover:text-foreground">
              Catálogo
            </Link>
            <Link href="/carrito" className="text-muted-foreground hover:text-foreground">
              Carrito
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-semibold">Vendedor</p>
            <Link href="/admin" className="text-muted-foreground hover:text-foreground">
              Panel admin
            </Link>
            <Link href="/admin/digitalizacion" className="text-muted-foreground hover:text-foreground">
              Digitalización 3D
            </Link>
          </div>
        </nav>
      </div>
      <p className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © 2026 SneakAR · Demo de hackatón
      </p>
    </footer>
  )
}
