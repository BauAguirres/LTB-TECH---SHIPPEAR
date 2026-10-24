'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export type SignUpResult = { ok: true } | { ok: false; error: string }

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * Crea la cuenta con la API de administración y la deja confirmada, sin enviar emails.
 * El SMTP integrado de Supabase tiene un tope de envíos por hora y bloqueaba los registros.
 * La cuenta nueva no tiene permisos: solo el primer usuario queda como admin (trigger en la base).
 */
export async function signUpAction(input: { email: string; password: string }): Promise<SignUpResult> {
  const email = String(input.email ?? '').trim().toLowerCase()
  const password = String(input.password ?? '')

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return { ok: false, error: 'Ese email no es válido.' }
  if (password.length < 8 || password.length > 72) {
    return { ok: false, error: 'La contraseña debe tener entre 8 y 72 caracteres.' }
  }

  try {
    const supabase = createServiceClient()
    const { error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) {
      if (error.code === 'weak_password') {
        return { ok: false, error: 'La contraseña es muy débil. Usá al menos 8 caracteres combinando letras y números.' }
      }
      console.error('[auth] signUp failed:', error.code, error.message)
      return { ok: false, error: 'No pudimos crear la cuenta. Si ya tenés una, ingresá desde «Ingresar».' }
    }
    return { ok: true }
  } catch (error) {
    console.error('[auth] signUp unexpected error:', error instanceof Error ? error.message : error)
    return { ok: false, error: 'No pudimos crear la cuenta. Intentá de nuevo en unos minutos.' }
  }
}
