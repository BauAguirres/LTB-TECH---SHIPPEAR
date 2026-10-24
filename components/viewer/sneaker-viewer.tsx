'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Minus, Plus, RotateCcw, Rotate3d, ScanLine, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ModelViewerElement = HTMLElement & {
  cameraOrbit: string
  fieldOfView: string
  canActivateAR: boolean
  autoRotate: boolean
  activateAR: () => Promise<void>
  getCameraOrbit: () => { theta: number; phi: number; radius: number }
  jumpCameraToGoal: () => void
}

export type ViewerPerspective = { label: string; orbit: string }

export interface SneakerViewerProps {
  src: string
  alt: string
  poster?: string
  className?: string
  options?: {
    initialOrbit?: string
    autoRotate?: boolean
    enableAR?: boolean
    perspectives?: ViewerPerspective[]
  }
  loadingLabel?: string
  errorMessage?: string
}

const DEFAULT_PERSPECTIVES: ViewerPerspective[] = [
  { label: 'Lateral', orbit: '90deg 78deg auto' },
  { label: 'Frente', orbit: '0deg 78deg auto' },
  { label: 'Talón', orbit: '180deg 78deg auto' },
  { label: 'Arriba', orbit: '0deg 12deg auto' },
]

const DEFAULT_ORBIT = '35deg 70deg auto'
const ZOOM_STEP = 0.8

type LoadState = 'loading' | 'ready' | 'error'
type ARSupport = 'unknown' | 'supported' | 'unsupported'

export function SneakerViewer({
  src,
  alt,
  poster,
  className,
  options,
  loadingLabel = 'Cargando modelo 3D',
  errorMessage = 'No pudimos cargar el modelo 3D. Revisá tu conexión e intentá de nuevo.',
}: SneakerViewerProps) {
  const initialOrbit = options?.initialOrbit ?? DEFAULT_ORBIT
  const perspectives = options?.perspectives ?? DEFAULT_PERSPECTIVES
  const enableAR = options?.enableAR ?? true

  const viewerRef = useRef<ModelViewerElement | null>(null)
  const [libraryReady, setLibraryReady] = useState(false)
  const [state, setState] = useState<LoadState>('loading')
  const [progress, setProgress] = useState(0)
  const [arSupport, setArSupport] = useState<ARSupport>('unknown')
  const [activePerspective, setActivePerspective] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [arStatus, setArStatus] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    import('@google/model-viewer')
      .then(() => {
        if (!cancelled) setLibraryReady(true)
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!libraryReady || !viewer) return

    const onProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ totalProgress: number }>).detail
      setProgress(Math.round((detail?.totalProgress ?? 0) * 100))
    }
    const onLoad = () => {
      setState('ready')
      setArSupport(viewer.canActivateAR ? 'supported' : 'unsupported')
    }
    const onError = () => setState('error')
    const onArStatus = (event: Event) => {
      const status = (event as CustomEvent<{ status: string }>).detail?.status
      if (status === 'failed') setArStatus('No se pudo iniciar la realidad aumentada en este dispositivo.')
      else if (status === 'session-started') setArStatus(null)
    }
    const onCameraChange = (event: Event) => {
      const source = (event as CustomEvent<{ source: string }>).detail?.source
      if (source === 'user-interaction') setActivePerspective(null)
    }

    viewer.addEventListener('progress', onProgress)
    viewer.addEventListener('load', onLoad)
    viewer.addEventListener('error', onError)
    viewer.addEventListener('ar-status', onArStatus)
    viewer.addEventListener('camera-change', onCameraChange)
    return () => {
      viewer.removeEventListener('progress', onProgress)
      viewer.removeEventListener('load', onLoad)
      viewer.removeEventListener('error', onError)
      viewer.removeEventListener('ar-status', onArStatus)
      viewer.removeEventListener('camera-change', onCameraChange)
    }
  }, [libraryReady, attempt])

  const setOrbit = useCallback((orbit: string) => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.autoRotate = false
    viewer.cameraOrbit = orbit
  }, [])

  const zoom = useCallback((factor: number) => {
    const viewer = viewerRef.current
    if (!viewer) return
    const { theta, phi, radius } = viewer.getCameraOrbit()
    viewer.cameraOrbit = `${theta}rad ${phi}rad ${radius * factor}m`
  }, [])

  const resetView = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.autoRotate = false
    viewer.cameraOrbit = initialOrbit
    viewer.fieldOfView = 'auto'
    setActivePerspective(null)
  }, [initialOrbit])

  const launchAR = useCallback(async () => {
    const viewer = viewerRef.current
    if (!viewer) return
    setArStatus(null)
    try {
      await viewer.activateAR()
    } catch {
      setArStatus('No se pudo iniciar la realidad aumentada en este dispositivo.')
    }
  }, [])

  const retry = () => {
    setState('loading')
    setProgress(0)
    setArSupport('unknown')
    setAttempt((n) => n + 1)
  }

  const isReady = state === 'ready'

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-card">
        {libraryReady && state !== 'error' && (
          <model-viewer
            key={attempt}
            ref={viewerRef as React.Ref<HTMLElement>}
            src={src}
            alt={alt}
            poster={poster}
            loading="eager"
            camera-controls
            touch-action="pan-y"
            camera-orbit={initialOrbit}
            min-camera-orbit="auto 5deg auto"
            max-camera-orbit="auto 175deg auto"
            interaction-prompt="auto"
            shadow-intensity="1"
            shadow-softness="0.8"
            exposure="1"
            auto-rotate={options?.autoRotate ?? true}
            rotation-per-second="18deg"
            interpolation-decay="120"
            ar={enableAR}
            ar-modes="webxr scene-viewer quick-look"
            ar-placement="floor"
            ar-scale="auto"
            className="size-full bg-card"
          >
            <div slot="progress-bar" />
            <button slot="ar-button" type="button" hidden aria-hidden="true" tabIndex={-1} />
          </model-viewer>
        )}

        {state === 'loading' && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute inset-x-6 bottom-6 flex flex-col gap-2 rounded-2xl bg-card/90 p-4 shadow-sm backdrop-blur"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{loadingLabel}</span>
              <span className="font-mono tabular-nums text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {state === 'error' && (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center"
          >
            <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
            <p className="max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">{errorMessage}</p>
            <Button variant="outline" onClick={retry}>
              Reintentar
            </Button>
          </div>
        )}

        {isReady && (
          <div className="absolute right-3 top-3 flex flex-col gap-2">
            <Button size="icon" variant="secondary" onClick={() => zoom(ZOOM_STEP)} aria-label="Acercar">
              <Plus aria-hidden="true" />
            </Button>
            <Button size="icon" variant="secondary" onClick={() => zoom(1 / ZOOM_STEP)} aria-label="Alejar">
              <Minus aria-hidden="true" />
            </Button>
            <Button size="icon" variant="secondary" onClick={resetView} aria-label="Reiniciar vista">
              <RotateCcw aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      {isReady && (
        <div className="flex flex-col gap-3">
          <div role="group" aria-label="Cambiar perspectiva" className="flex flex-wrap gap-2">
            {perspectives.map((p) => (
              <Button
                key={p.label}
                size="sm"
                variant={activePerspective === p.label ? 'default' : 'outline'}
                aria-pressed={activePerspective === p.label}
                onClick={() => {
                  setOrbit(p.orbit)
                  setActivePerspective(p.label)
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {enableAR && arSupport === 'supported' && (
            <Button size="lg" onClick={launchAR} className="w-full">
              <ScanLine aria-hidden="true" />
              Ver en tu espacio
            </Button>
          )}

          {enableAR && arSupport === 'unsupported' && (
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
              <Smartphone className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Realidad aumentada no disponible en este navegador.</span>{' '}
                Podés seguir explorando la zapatilla en 3D: arrastrá para rotar, pellizcá o usá la rueda para hacer
                zoom. Para verla en tu espacio, abrí esta página desde un teléfono Android con ARCore o un iPhone.
              </p>
            </div>
          )}

          {arStatus && (
            <p role="alert" className="text-sm text-destructive">
              {arStatus}
            </p>
          )}

          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Rotate3d className="size-4" aria-hidden="true" />
            Arrastrá para rotar · Rueda o pellizco para zoom · Dos dedos para mover
          </p>
        </div>
      )}
    </div>
  )
}
