'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Check, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MAX_SIDE = 2048

interface CameraCaptureProps {
  open: boolean
  remaining: number
  onCapture: (file: File) => void
  onClose: () => void
  onUnavailable: () => void
}

export function CameraCapture({ open, remaining, onCapture, onClose, onUnavailable }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [taken, setTaken] = useState(0)
  const [flash, setFlash] = useState(false)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setReady(false)
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setTaken(0)

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        onUnavailable()
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1440 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => undefined)
          setReady(true)
        }
      } catch {
        if (!cancelled) onUnavailable()
      }
    }

    start()
    return () => {
      cancelled = true
      stopStream()
    }
  }, [open, onUnavailable, stopStream])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  function takePhoto() {
    const video = videoRef.current
    if (!video || !ready || !video.videoWidth || taken >= remaining) return
    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        onCapture(new File([blob], `captura-${Date.now()}.jpg`, { type: 'image/jpeg' }))
        setTaken((n) => n + 1)
        setFlash(true)
        window.setTimeout(() => setFlash(false), 120)
      },
      'image/jpeg',
      0.9,
    )
  }

  if (!open) return null

  const full = taken >= remaining

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cámara para digitalización 3D"
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <div className="relative min-h-0 flex-1 bg-black">
        <video ref={videoRef} playsInline muted autoPlay className="size-full object-contain" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Abriendo la cámara…
          </div>
        )}
        {flash && <div className="absolute inset-0 bg-foreground/60" aria-hidden="true" />}
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute top-4 right-4"
          onClick={onClose}
          aria-label="Cerrar la cámara"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p className="min-w-24 text-sm text-muted-foreground" aria-live="polite">
          {full ? 'Máximo alcanzado' : `${taken} ${taken === 1 ? 'foto' : 'fotos'}`}
        </p>
        <Button
          type="button"
          size="icon"
          className="size-16 rounded-full"
          onClick={takePhoto}
          disabled={!ready || full}
          aria-label="Sacar foto"
        >
          <Camera className="size-6" aria-hidden="true" />
        </Button>
        <Button type="button" variant="outline" className="min-w-24" onClick={onClose}>
          <Check className="size-4" aria-hidden="true" />
          Listo
        </Button>
      </div>
    </div>
  )
}
