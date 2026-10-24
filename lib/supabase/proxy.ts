import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: { secure: process.env.NODE_ENV === 'production' },
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  // No ejecutar código entre createServerClient y getUser(): refresca la sesión.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Primera barrera: sin sesión no se entra a /admin. El rol de admin se verifica
  // en el layout del panel, en cada server action y, finalmente, en RLS.
  if (!user && request.nextUrl.pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`
    const redirect = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  return supabaseResponse
}
