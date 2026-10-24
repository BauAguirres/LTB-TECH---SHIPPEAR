const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export function formatPrice(value: number): string {
  return arsFormatter.format(value)
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const COLOR_SWATCHES: Record<string, string> = {
  Blanco: '#f4f4f2',
  Negro: '#16171a',
  Rojo: '#c8312b',
  Verde: '#2f7a4b',
  'Verde oliva': '#6b6b3a',
  Azul: '#2847d8',
  'Azul marino': '#1d2a4d',
  Gris: '#9a9ea6',
  Beige: '#d9c8a9',
  Crema: '#efe6d2',
  Naranja: '#ea6a1f',
}

export function getSwatch(color: string): string {
  return COLOR_SWATCHES[color] ?? '#c4c7cc'
}
