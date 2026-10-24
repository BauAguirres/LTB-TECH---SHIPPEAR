'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

function signUpErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }
  if (code === 'weak_password') return 'La contraseña es muy débil. Usá al menos 8 caracteres combinando letras y números.'
  if (code === 'email_address_invalid') return 'Ese email no es válido.'
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429)
    return 'Se alcanzó el límite de envíos. Esperá unos minutos y volvé a probar.'
  return 'No pudimos crear la cuenta. Intentá de nuevo.'
}

export function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setIsLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
      },
    })
    setIsLoading(false)
    if (error) {
      setError(signUpErrorMessage(error))
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div role="status" className="rounded-xl bg-accent p-4 text-sm leading-relaxed text-accent-foreground">
        Te enviamos un email para confirmar la cuenta. Después de confirmarla, un administrador tiene que habilitar tu
        acceso al panel.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={isLoading || !email || !password}>
        {isLoading ? 'Creando cuenta…' : 'Crear cuenta'}
      </Button>
    </form>
  )
}
