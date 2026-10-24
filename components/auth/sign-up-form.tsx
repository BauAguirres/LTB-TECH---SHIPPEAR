'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signUpAction } from '@/lib/auth-actions'
import { createClient } from '@/lib/supabase/client'

export function SignUpForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [created, setCreated] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setIsLoading(true)
    setError(null)
    const result = await signUpAction({ email, password })
    if (!result.ok) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (signInError) {
      setCreated(true)
      setIsLoading(false)
      return
    }
    router.replace('/admin')
    router.refresh()
  }

  if (created) {
    return (
      <div role="status" className="rounded-xl bg-accent p-4 text-sm leading-relaxed text-accent-foreground">
        Tu cuenta se creó. Ya podés ingresar con tu email y contraseña; un administrador tiene que habilitar tu acceso
        al panel.
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
