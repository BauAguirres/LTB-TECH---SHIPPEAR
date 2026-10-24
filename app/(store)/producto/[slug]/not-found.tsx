import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default function ProductNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-bold">No encontramos este producto</h1>
      <p className="text-muted-foreground">Puede que ya no esté publicado o que el enlace sea incorrecto.</p>
      <Link href="/catalogo" className={buttonVariants({ size: 'lg' })}>
        Ver catálogo
      </Link>
    </div>
  )
}
