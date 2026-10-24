import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Info } from 'lucide-react'
import { DemoViewer } from '@/components/viewer/demo-viewer'
import { DEMO_SNEAKER_MODEL } from '@/lib/models'

export const metadata: Metadata = {
  title: 'Demostración 3D y AR',
  description: 'Probá el visor 3D y la realidad aumentada de SneakAR con un modelo genérico de demostración.',
}

export default function Demo3DPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-6 md:px-6">
      <Link
        href="/catalogo"
        className="flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Volver al catálogo
      </Link>
      <div className="grid gap-10 lg:grid-cols-2">
        <DemoViewer />
        <div className="flex flex-col gap-5">
          <h1 className="text-balance font-display text-3xl font-bold md:text-4xl">Demostración del visor 3D</h1>
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-accent p-4 text-accent-foreground">
            <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">Modelo genérico, no está a la venta.</span> Sirve para probar cómo
              funciona el visor y la realidad aumentada. No representa a ningún producto del catálogo.
            </p>
          </div>
          <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
            <li>Arrastrá para rotar, usá la rueda o pellizcá para hacer zoom.</li>
            <li>Cambiá la variante para ver los tres materiales incluidos en el archivo GLB.</li>
            <li>
              En un teléfono compatible, tocá «Probar en mi espacio» para ubicar la zapatilla en el piso con la cámara.
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Modelo:{' '}
            <a
              href={DEMO_SNEAKER_MODEL.attribution.href}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {DEMO_SNEAKER_MODEL.attribution.label}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
