import type { MetadataRoute } from 'next'
import { getPublicSiteUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  const base = getPublicSiteUrl()
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/auth', '/carrito', '/pedido', '/login', '/registro'] },
    sitemap: `${base}/sitemap.xml`,
  }
}
