import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface SessionInfo {
  userId: string
  email: string | null
  isAdmin: boolean
}

/** Lee la sesión validada con el servidor de Auth y consulta el rol en la base. */
export async function getSession(): Promise<SessionInfo | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: isAdmin, error } = await supabase.rpc('is_admin')
  if (error) console.error('[auth] is_admin failed:', error.message)

  return { userId: user.id, email: user.email ?? null, isAdmin: isAdmin === true }
}

/** Protege páginas del panel: redirige si no hay sesión o si el usuario no es admin. */
export async function requireAdmin(): Promise<SessionInfo> {
  const session = await getSession()
  if (!session) redirect('/login?next=/admin')
  if (!session.isAdmin) redirect('/login?error=forbidden')
  return session
}

/** Para server actions: devuelve el cliente autenticado o un error, sin redirigir. */
export async function getAdminClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase: null, error: 'Tu sesión expiró. Volvé a iniciar sesión.' } as const

  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (isAdmin !== true) return { supabase: null, error: 'No tenés permisos de administrador.' } as const

  return { supabase, error: null } as const
}
