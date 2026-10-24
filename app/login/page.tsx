import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/auth/auth-shell'
import { LoginForm } from '@/components/auth/login-form'
import { Button, buttonVariants } from '@/components/ui/button'
import { getSession } from '@/lib/auth'
import { signOut } from '@/lib/auth-actions'

export const metadata: Metadata = {
  title: 'Ingresar al panel',
  robots: { index: false },
}

function safeNext(value: string | string[] | undefined) {
  const next = typeof value === 'string' ? value : '/admin'
  return next.startsWith('/') && !next.startsWith('//') ? next : '/admin'
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const next = safeNext(params.next)
  const session = await getSession()

  if (session?.isAdmin) redirect(next)

  if (session) {
    return (
      <AuthShell
        title="Acceso no autorizado"
        description={`Iniciaste sesión como ${session.email ?? 'usuario'}, pero esta cuenta no tiene permisos de administrador.`}
      >
        <div className="flex flex-col gap-3">
          <form action={signOut}>
            <Button type="submit" variant="outline" size="lg" className="w-full">
              Cerrar sesión
            </Button>
          </form>
          <Link href="/" className={buttonVariants({ variant: 'ghost' })}>
            Volver a la tienda
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Panel de administración"
      description="Ingresá con tu cuenta autorizada para gestionar el catálogo."
      footer={
        <>
          {'¿No tenés cuenta? '}
          <Link href="/registro" className="font-medium text-foreground underline underline-offset-4">
            Crear una
          </Link>
        </>
      }
    >
      {params.error === 'callback' && (
        <p role="alert" className="text-sm text-destructive">
          El enlace de confirmación no es válido o expiró.
        </p>
      )}
      <LoginForm next={next} />
    </AuthShell>
  )
}
