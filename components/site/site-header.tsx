import Link from 'next/link'
import { Search } from 'lucide-react'
import { Logo } from '@/components/site/logo'
import { CartLink } from '@/components/site/cart-link'

function SearchForm({ className }: { className?: string }) {
  return (
    <form action="/catalogo" role="search" className={className}>
      <label htmlFor={`search-${className?.includes('md:hidden') ? 'm' : 'd'}`} className="sr-only">
        Buscar zapatillas
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={`search-${className?.includes('md:hidden') ? 'm' : 'd'}`}
          name="q"
          type="search"
          placeholder="Buscar por modelo o marca"
          className="h-10 w-full rounded-full border border-input bg-card pr-4 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </div>
    </form>
  )
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-6">
          <Logo />
          <nav aria-label="Principal" className="hidden items-center gap-5 text-sm font-medium md:flex">
            <Link href="/catalogo" className="text-muted-foreground transition-colors hover:text-foreground">
              Catálogo
            </Link>
            <Link href="/#como-funciona" className="text-muted-foreground transition-colors hover:text-foreground">
              Cómo funciona AR
            </Link>
          </nav>
          <SearchForm className="ml-auto hidden w-full max-w-sm md:block" />
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Link
              href="/catalogo"
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground md:hidden"
            >
              Catálogo
            </Link>
            <CartLink />
          </div>
        </div>
        <SearchForm className="md:hidden" />
      </div>
    </header>
  )
}
