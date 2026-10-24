export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  updated?: string
  children: React.ReactNode
}) {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-10 md:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold text-balance">{title}</h1>
        {updated && <p className="text-sm text-muted-foreground">Última actualización: {updated}</p>}
      </header>
      <div className="flex flex-col gap-4 leading-relaxed text-pretty [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted-foreground [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:text-muted-foreground">
        {children}
      </div>
    </article>
  )
}
