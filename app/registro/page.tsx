import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/components/auth/auth-shell'
import { SignUpForm } from '@/components/auth/sign-up-form'

export const metadata: Metadata = {
  title: 'Crear cuenta',
  robots: { index: false },
}

export default function RegistroPage() {
  return (
    <AuthShell
      title="Crear cuenta"
      description="Las cuentas nuevas no tienen acceso al panel hasta que un administrador las habilite."
      footer={
        <>
          {'¿Ya tenés cuenta? '}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Ingresar
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  )
}
