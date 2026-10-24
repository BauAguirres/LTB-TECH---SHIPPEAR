import type { DetailedHTMLProps, HTMLAttributes } from 'react'

type ModelViewerAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  src?: string
  alt?: string
  poster?: string
  loading?: 'auto' | 'lazy' | 'eager'
  reveal?: 'auto' | 'manual'
  ar?: boolean
  'ar-modes'?: string
  'ar-placement'?: 'floor' | 'wall'
  'ar-scale'?: 'auto' | 'fixed'
  'camera-controls'?: boolean
  'touch-action'?: string
  'camera-orbit'?: string
  'min-camera-orbit'?: string
  'max-camera-orbit'?: string
  'field-of-view'?: string
  'interaction-prompt'?: 'auto' | 'none'
  'shadow-intensity'?: string
  'shadow-softness'?: string
  exposure?: string
  'environment-image'?: string
  'auto-rotate'?: boolean
  'rotation-per-second'?: string
  'interpolation-decay'?: string
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerAttributes
    }
  }
}
