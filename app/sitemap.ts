import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getPublicSiteUrl } from '@/lib/site-url'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getPublicSiteUrl()
  const pages = ['', '/catalogo', '/envios-y-devoluciones', '/terminos', '/privacidad', '/arrepentimiento'].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.5,
  }))

  // Cliente anónimo sin cookies: el sitemap no depende de la request y RLS solo expone productos publicados.
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
  const { data } = await supabase.from('products').select('slug, updated_at').eq('status', 'published')

  return [
    ...pages,
    ...(data ?? []).map((p) => ({
      url: `${base}/producto/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
