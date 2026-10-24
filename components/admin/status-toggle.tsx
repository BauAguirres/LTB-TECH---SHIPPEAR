'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { setProductStatus } from '@/lib/admin/product-actions'
import type { ProductStatus } from '@/lib/types'

export function StatusToggle({ id, name, status }: { id: string; name: string; status: ProductStatus }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const published = status === 'published'

  function toggle(next: boolean) {
    startTransition(async () => {
      const result = await setProductStatus(id, next ? 'published' : 'draft')
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(next ? `“${name}” publicado` : `“${name}” pasó a borrador`)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={published}
        disabled={pending}
        onCheckedChange={toggle}
        aria-label={published ? `Despublicar ${name}` : `Publicar ${name}`}
      />
      <span className="text-xs text-muted-foreground">
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-label="Guardando" /> : published ? 'Publicado' : 'Borrador'}
      </span>
    </div>
  )
}
