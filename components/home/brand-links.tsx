import Link from 'next/link'

export function BrandLinks({ brands }: { brands: { name: string; count: number }[] }) {
  return (
    <section aria-labelledby="marcas" className="mx-auto max-w-7xl px-4 md:px-6">
      <h2 id="marcas" className="mb-5 font-display text-2xl font-bold">
        Comprar por marca
      </h2>
      <ul className="flex flex-wrap gap-2">
        {brands.map((brand) => (
          <li key={brand.name}>
            <Link
              href={`/catalogo?marca=${encodeURIComponent(brand.name)}`}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 font-display font-semibold transition-colors hover:border-primary hover:text-primary"
            >
              {brand.name}
              <span className="text-xs font-normal text-muted-foreground">{brand.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
