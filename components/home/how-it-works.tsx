import { Camera, Footprints, Rotate3d } from 'lucide-react'

const steps = [
  {
    icon: Rotate3d,
    title: 'Explorala en 3D',
    text: 'En la ficha del producto podés rotar, acercar y alejar el modelo para verlo desde cualquier ángulo.',
  },
  {
    icon: Camera,
    title: 'Activá la cámara',
    text: 'Tocá “Ver en tu espacio”. La cámara se solicita solo en ese momento, nunca antes.',
  },
  {
    icon: Footprints,
    title: 'Ubicala en tu piso',
    text: 'La zapatilla aparece a escala sobre una superficie real. Muestra el producto en tu entorno; no es un probador en el pie.',
  },
]

export function HowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto max-w-7xl scroll-mt-24 px-4 md:px-6">
      <div className="flex flex-col gap-10 rounded-3xl bg-foreground p-8 text-background md:p-12">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 className="font-display text-3xl font-bold text-balance md:text-4xl">
            Cómo funciona la realidad aumentada
          </h2>
          <p className="leading-relaxed text-background/70">
            Funciona en celulares y tablets compatibles con AR (ARCore en Android, Quick Look en iOS). Si tu
            dispositivo no la admite, podés seguir explorando el modelo en 3D.
          </p>
        </div>
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.title} className="flex flex-col gap-3 rounded-2xl border border-background/15 p-6">
              <step.icon className="size-6 text-primary" aria-hidden="true" />
              <h3 className="font-display text-xl font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-background/70">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
