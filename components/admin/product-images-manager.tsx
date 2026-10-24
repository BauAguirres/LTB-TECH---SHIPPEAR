'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Panel } from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'
import { deleteProductImage, uploadProductImage } from '@/lib/admin/product-actions'
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/lib/storage'
import type { ProductImage } from '@/lib/types'

export function ProductImagesManager({ productId, images }: { productId: string; images: ProductImage[] }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, startUpload] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleFile(file: File | undefined) {
    if (!file) return
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      toast.error('Formato no permitido. Usá JPG, PNG o WebP.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('La imagen supera los 5 MB.')
      return
    }
    const formData = new FormData()
    formData.set('productId', productId)
    formData.set('file', file)
    startUpload(async () => {
      const result = await uploadProductImage(formData)
      if (inputRef.current) inputRef.current.value = ''
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Imagen subida')
      router.refresh()
    })
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const result = await deleteProductImage(id)
    setDeletingId(null)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Imagen eliminada')
    router.refresh()
  }

  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Fotos del catálogo</h2>
          <p className="text-sm text-muted-foreground">JPG, PNG o WebP de hasta 5 MB. La primera es la portada.</p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
          {uploading ? 'Subiendo…' : 'Subir foto'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          className="sr-only"
          aria-label="Elegir foto del producto"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {images.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Este producto todavía no tiene fotos.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image, i) => (
            <li key={image.id} className="relative overflow-hidden rounded-xl border border-border bg-muted">
              <div className="relative aspect-square">
                <Image src={image.url} alt={image.alt_text} fill sizes="200px" className="object-cover" />
              </div>
              {i === 0 && (
                <span className="absolute top-2 left-2 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  Portada
                </span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(image.id)}
                disabled={deletingId === image.id}
                aria-label={`Eliminar foto ${i + 1}`}
                className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground hover:text-destructive disabled:opacity-50"
              >
                {deletingId === image.id ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
