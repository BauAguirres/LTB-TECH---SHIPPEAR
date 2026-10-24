'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { Box, Eye, EyeOff, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Panel } from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'
import { SneakerViewer } from '@/components/viewer/sneaker-viewer'
import { deleteProductModel, registerProductModel } from '@/lib/admin/model-actions'
import { MODELS_BUCKET } from '@/lib/digitization/config'
import { createClient } from '@/lib/supabase/client'
import type { ProductModel } from '@/lib/types'

const MAX_GLB_BYTES = 50 * 1024 * 1024
const ALL_COLORS = '__all__'

async function isGlbFile(file: File) {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer())
  return String.fromCharCode(...head) === 'glTF'
}

export function ProductModelsManager({
  productId,
  productLabel,
  colors,
  models,
}: {
  productId: string
  productLabel: string
  colors: string[]
  models: ProductModel[]
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [color, setColor] = useState<string>(ALL_COLORS)
  const [uploading, startUpload] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)

  function resetInput() {
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleFile(file: File | undefined) {
    if (!file) return
    startUpload(async () => {
      if (!file.name.toLowerCase().endsWith('.glb')) {
        toast.error('Formato no permitido. Subí un archivo .glb (glTF binario).')
        return resetInput()
      }
      if (file.size > MAX_GLB_BYTES) {
        toast.error('El modelo supera los 50 MB.')
        return resetInput()
      }
      if (!(await isGlbFile(file))) {
        toast.error('El archivo no es un GLB válido.')
        return resetInput()
      }

      const path = `products/${productId}/manual-${crypto.randomUUID()}.glb`
      const supabase = createClient()
      const { error: uploadError } = await supabase.storage
        .from(MODELS_BUCKET)
        .upload(path, file, { contentType: 'model/gltf-binary', upsert: false })
      if (uploadError) {
        toast.error('No se pudo subir el archivo. Verificá tu sesión e intentá de nuevo.')
        return resetInput()
      }

      const result = await registerProductModel({
        productId,
        color: color === ALL_COLORS ? null : color,
        path,
      })
      resetInput()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Modelo 3D publicado')
      router.refresh()
    })
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const result = await deleteProductModel(id)
    setDeletingId(null)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    if (previewId === id) setPreviewId(null)
    toast.success('Modelo eliminado')
    router.refresh()
  }

  const preview = models.find((m) => m.id === previewId)

  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-lg font-semibold">Modelos 3D y realidad aumentada</h2>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          Subí un archivo GLB (glTF 2.0, hasta 50 MB). Podés asignarlo a un color o a todos. Si hay varios para el
          mismo color, se usa el más reciente. También podés generarlos desde fotos en Digitalización 3D.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="model-color" className="text-sm font-medium">
            Color del modelo
          </label>
          <select
            id="model-color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={uploading}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value={ALL_COLORS}>Todos los colores</option>
            {colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
          {uploading ? 'Subiendo y verificando…' : 'Subir modelo GLB'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".glb,model/gltf-binary"
          className="sr-only"
          aria-label="Elegir archivo GLB"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {models.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Este producto todavía no tiene modelo 3D. En la tienda se muestra el aviso de «Modelo no disponible» y la AR
          queda deshabilitada.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {models.map((model) => (
            <li key={model.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="flex items-center gap-3">
                <Box className="size-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">{model.color ?? 'Todos los colores'}</p>
                  <p className="text-xs text-muted-foreground">
                    {model.provider === 'meshy' ? 'Generado desde fotos' : 'Subido manualmente'} ·{' '}
                    {new Date(model.updated_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-pressed={previewId === model.id}
                  onClick={() => setPreviewId(previewId === model.id ? null : model.id)}
                >
                  {previewId === model.id ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  {previewId === model.id ? 'Ocultar' : 'Vista previa'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={deletingId === model.id}
                  onClick={() => handleDelete(model.id)}
                  aria-label={`Eliminar modelo ${model.color ?? 'de todos los colores'}`}
                >
                  {deletingId === model.id ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 aria-hidden="true" />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {preview?.glb_url && (
        <div className="mx-auto w-full max-w-md">
          <SneakerViewer
            key={preview.glb_url}
            src={preview.glb_url}
            alt={`Vista previa del modelo 3D de ${productLabel}`}
            options={{ enableAR: false }}
          />
        </div>
      )}
    </Panel>
  )
}
