'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Panel } from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const MIN_PHOTOS = 8
const MAX_PHOTOS = 40
const MAX_BYTES = 15 * 1024 * 1024

interface Photo {
  id: string
  url: string
  name: string
}

const tips = [
  'Fondo liso y buena luz difusa, sin sombras duras.',
  'Girá alrededor de la zapatilla tomando una foto cada 15–20°.',
  'Repetí la vuelta desde un ángulo más alto y otro más bajo.',
  'Incluí la suela y los detalles de la puntera y el talón.',
]

export function PhotoCapture({ products }: { products: { value: string; label: string }[] }) {
  const [productId, setProductId] = useState<string | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef(photos)
  photosRef.current = photos

  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  function addFiles(files: FileList | null) {
    if (!files) return
    const accepted: Photo[] = []
    let rejected = 0
    for (const file of files) {
      if (!file.type.startsWith('image/') || file.size > MAX_BYTES) {
        rejected++
        continue
      }
      accepted.push({ id: crypto.randomUUID(), url: URL.createObjectURL(file), name: file.name })
    }
    setPhotos((list) => {
      const room = MAX_PHOTOS - list.length
      accepted.slice(room).forEach((p) => URL.revokeObjectURL(p.url))
      return [...list, ...accepted.slice(0, room)]
    })
    if (rejected) toast.error(`${rejected} archivo(s) descartados: solo imágenes de hasta 15 MB.`)
  }

  function removePhoto(id: string) {
    setPhotos((list) => {
      const target = list.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return list.filter((p) => p.id !== id)
    })
  }

  const ready = !!productId && photos.length >= MIN_PHOTOS

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-5">
        <Panel className="flex flex-col gap-3">
          <label className="text-sm font-medium" id="product-label">
            Producto a digitalizar
          </label>
          <Select items={products} value={productId} onValueChange={(v) => setProductId(v as string | null)}>
            <SelectTrigger aria-labelledby="product-label" className="w-full bg-background">
              <SelectValue placeholder="Elegí un producto" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Panel>

        <Panel className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">
              Fotos <span className="text-muted-foreground">({photos.length}/{MAX_PHOTOS})</span>
            </h2>
            <div className="flex gap-2">
              <Button type="button" onClick={() => cameraRef.current?.click()} disabled={photos.length >= MAX_PHOTOS}>
                <Camera className="size-4" aria-hidden="true" />
                Tomar fotos
              </Button>
              <Button type="button" variant="outline" onClick={() => galleryRef.current?.click()} disabled={photos.length >= MAX_PHOTOS}>
                <ImagePlus className="size-4" aria-hidden="true" />
                Subir
              </Button>
            </div>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, (photos.length / MIN_PHOTOS) * 100)}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {photos.length >= MIN_PHOTOS
              ? 'Ya tenés las fotos mínimas. Más fotos mejoran la calidad del modelo.'
              : `Faltan ${MIN_PHOTOS - photos.length} fotos para el mínimo recomendado (${MIN_PHOTOS}).`}
          </p>

          {photos.length > 0 ? (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {photos.map((photo, i) => (
                <li key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob previews */}
                  <img src={photo.url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    aria-label={`Quitar foto ${i + 1}`}
                    className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-foreground/80 text-background"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
              <Camera className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Desde el celular, “Tomar fotos” abre la cámara trasera.</p>
            </div>
          )}
        </Panel>

        <div className="flex flex-col items-end gap-2">
          <Button
            size="lg"
            disabled={!ready}
            onClick={() =>
              toast.info('Fotos listas para procesar', {
                description: 'La generación del modelo 3D se conecta en la Fase 4.',
              })
            }
          >
            Generar modelo 3D
          </Button>
          {!productId && <p className="text-xs text-muted-foreground">Elegí un producto para continuar.</p>}
        </div>
      </div>

      <Panel className="flex flex-col gap-3 xl:sticky xl:top-6 xl:self-start">
        <h2 className="font-display text-lg font-semibold">Consejos de captura</h2>
        <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
          {tips.map((tip) => (
            <li key={tip} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {tip}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Las fotos quedan solo en este dispositivo hasta la Fase 3.</p>
      </Panel>
    </div>
  )
}
