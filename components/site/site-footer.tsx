import Link from 'next/link'
import { Logo } from '@/components/site/logo'
import { getStoreSettings } from '@/lib/store-settings'

const linkClass = 'text-muted-foreground hover:text-foreground'

export async function SiteFooter() {
  const settings = await getStoreSettings()
  const year = new Date().getFullYear()
  const legal = [settings.legalName, settings.taxId && `CUIT ${settings.taxId}`, settings.legalAddress].filter(Boolean)

  return (
    <footer className="mt-24 border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 md:flex-row md:justify-between md:px-6">
        <div className="flex max-w-sm flex-col gap-3">
          <Logo />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Zapatillas originales con vista 3D y prueba en realidad aumentada. Pagás seguro con Mercado Pago.
          </p>
          {(settings.contactEmail || settings.contactWhatsapp) && (
            <p className="flex flex-col gap-1 text-sm">
              {settings.contactEmail && (
                <a href={`mailto:${settings.contactEmail}`} className={linkClass}>
                  {settings.contactEmail}
                </a>
              )}
              {settings.contactWhatsapp && (
                <a
                  href={`https://wa.me/${settings.contactWhatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  WhatsApp {settings.contactWhatsapp}
                </a>
              )}
            </p>
          )}
        </div>
        <nav aria-label="Pie de página" className="grid grid-cols-2 gap-x-12 gap-y-8 text-sm sm:flex">
          <div className="flex flex-col gap-2">
            <p className="font-semibold">Tienda</p>
            <Link href="/catalogo" className={linkClass}>
              Catálogo
            </Link>
            <Link href="/carrito" className={linkClass}>
              Carrito
            </Link>
            <Link href="/envios-y-devoluciones" className={linkClass}>
              Envíos y cambios
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-semibold">Legales</p>
            <Link href="/terminos" className={linkClass}>
              Términos y condiciones
            </Link>
            <Link href="/privacidad" className={linkClass}>
              Privacidad
            </Link>
            <Link href="/arrepentimiento" className="font-semibold text-foreground underline-offset-4 hover:underline">
              Botón de arrepentimiento
            </Link>
          </div>
        </nav>
      </div>
      <div className="flex flex-col gap-1 border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        <p>
          © {year} {settings.storeName}
          {legal.length > 0 ? ` · ${legal.join(' · ')}` : ''}
        </p>
        <p>
          Defensa de las y los Consumidores. Para reclamos{' '}
          <a
            href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            ingresá acá
          </a>
          .
        </p>
      </div>
    </footer>
  )
}
