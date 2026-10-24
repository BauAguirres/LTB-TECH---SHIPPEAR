import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/lib/cart/cart-context'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })

export const metadata: Metadata = {
  title: {
    default: 'SneakAR — Zapatillas en 3D y realidad aumentada',
    template: '%s · SneakAR',
  },
  description:
    'Explorá zapatillas de tus marcas favoritas en 3D y visualizalas en tu entorno real con realidad aumentada.',
}

export const viewport: Viewport = {
  themeColor: '#f5f6f8',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={`${inter.variable} ${spaceGrotesk.variable} bg-background`}>
      <body>
        <CartProvider>{children}</CartProvider>
        <Toaster position="bottom-center" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
