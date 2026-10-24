import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Rotate3d, Smartphone } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function Corner({ className }: { className: string }) {
  return <span aria-hidden="true" className={cn('absolute size-8 border-primary', className)} />
}

export function Hero() {
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-10 pb-16 md:px-6 lg:grid-cols-2 lg:pt-16">
      <div className="flex animate-rise flex-col gap-6">
        <p className="flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          <Rotate3d className="size-3.5" aria-hidden="true" />
          Zapatillas en 3D y realidad aumentada
        </p>
        <h1 className="font-display text-5xl leading-none font-bold text-balance md:text-7xl">
          Girala, acercala. <span className="text-primary">Ponela en tu piso.</span>
        </h1>
        <p className="max-w-lg text-lg leading-relaxed text-pretty text-muted-foreground">
          Explorá cada zapatilla desde todos los ángulos y, desde tu celular, ubicala en tu entorno real
          antes de comprarla.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/catalogo" className={cn(buttonVariants({ size: 'lg' }), 'h-12 rounded-full px-6 text-base')}>
            Explorar productos
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="#como-funciona"
            className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'h-12 rounded-full px-6 text-base')}
          >
            <Smartphone className="size-4" aria-hidden="true" />
            Cómo funciona AR
          </Link>
        </div>
      </div>

      <div className="relative animate-rise [animation-delay:120ms]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-card">
          <Image
            src="/images/hero-sneaker.png"
            alt="Zapatilla de running blanca y azul eléctrico flotando sobre fondo claro"
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
          <Corner className="top-5 left-5 rounded-tl-lg border-t-2 border-l-2" />
          <Corner className="top-5 right-5 rounded-tr-lg border-t-2 border-r-2" />
          <Corner className="bottom-5 left-5 rounded-bl-lg border-b-2 border-l-2" />
          <Corner className="right-5 bottom-5 rounded-br-lg border-r-2 border-b-2" />
        </div>
      </div>
    </section>
  )
}
