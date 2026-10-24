// Datos temporales de la Fase 1. Precios y stock ficticios, solo para demostración.
// En la Fase 2 este archivo se usa como semilla idempotente para Supabase.

import type { ProductStatus, ProductVariant, ProductWithRelations } from '@/lib/types'

const TIMESTAMP = '2026-10-01T12:00:00.000Z'

interface Seed {
  id: string
  name: string
  slug: string
  brand: string
  description: string
  price: number
  status: ProductStatus
  image: string
  sizes: string[]
  colors: string[]
}

const seeds: Seed[] = [
  {
    id: 'p-street-runner',
    name: 'Street Runner 90',
    slug: 'street-runner-90',
    brand: 'Nike',
    description:
      'Silueta retro de running con cámara de aire visible y capellada de cuero sintético. Amortiguación cómoda para todo el día.',
    price: 189999,
    status: 'published',
    image: '/images/products/street-runner.png',
    sizes: ['38', '39', '40', '41', '42', '43'],
    colors: ['Blanco', 'Rojo'],
  },
  {
    id: 'p-court-classic',
    name: 'Court Classic',
    slug: 'court-classic',
    brand: 'Adidas',
    description:
      'Clásico de tenis en cuero blanco con talón en contraste. Suela de goma plana y plantilla acolchada.',
    price: 149999,
    status: 'published',
    image: '/images/products/court-classic.png',
    sizes: ['37', '38', '39', '40', '41', '42', '44'],
    colors: ['Blanco', 'Verde'],
  },
  {
    id: 'p-velocity-knit',
    name: 'Velocity Knit',
    slug: 'velocity-knit',
    brand: 'Puma',
    description:
      'Running de alto rendimiento con capellada tejida transpirable y mediasuela de espuma reactiva.',
    price: 214999,
    status: 'published',
    image: '/images/products/velocity-knit.png',
    sizes: ['39', '40', '41', '42', '43', '44'],
    colors: ['Azul', 'Negro'],
  },
  {
    id: 'p-heritage-suede',
    name: 'Heritage 574',
    slug: 'heritage-574',
    brand: 'New Balance',
    description:
      'Combinación de gamuza y malla con detalles en azul marino. Un ícono lifestyle con soporte estable.',
    price: 199999,
    status: 'published',
    image: '/images/products/heritage-suede.png',
    sizes: ['38', '39', '40', '41', '42', '43', '44'],
    colors: ['Gris', 'Azul marino'],
  },
  {
    id: 'p-skate-low',
    name: 'Skate Low',
    slug: 'skate-low',
    brand: 'Vans',
    description:
      'Zapatilla de skate en lona resistente con suela vulcanizada de alto agarre y costuras reforzadas.',
    price: 99999,
    status: 'published',
    image: '/images/products/skate-low.png',
    sizes: ['36', '37', '38', '39', '40', '41', '42'],
    colors: ['Negro'],
  },
  {
    id: 'p-canvas-hi',
    name: 'Canvas Hi',
    slug: 'canvas-hi',
    brand: 'Converse',
    description:
      'Bota de lona con puntera de goma y ojales metálicos. Un básico atemporal para cualquier look.',
    price: 109999,
    status: 'published',
    image: '/images/products/canvas-hi.png',
    sizes: ['35', '36', '37', '38', '39', '40', '41'],
    colors: ['Crema', 'Negro'],
  },
  {
    id: 'p-trail-pro',
    name: 'Trail Pro GTX',
    slug: 'trail-pro-gtx',
    brand: 'Salomon',
    description:
      'Trail running con suela de tacos agresivos y protección en puntera. Pensada para terrenos técnicos.',
    price: 259999,
    status: 'published',
    image: '/images/products/trail-pro.png',
    sizes: ['39', '40', '41', '42', '43', '44', '45'],
    colors: ['Naranja', 'Verde oliva'],
  },
  {
    id: 'p-club-retro',
    name: 'Club Retro',
    slug: 'club-retro',
    brand: 'Reebok',
    description:
      'Estética vintage en cuero crema con suela de tono envejecido. Comodidad clásica de los 80.',
    price: 139999,
    status: 'published',
    image: '/images/products/club-retro.png',
    sizes: ['37', '38', '39', '40', '41', '42'],
    colors: ['Crema', 'Beige'],
  },
  {
    id: 'p-court-low',
    name: 'Court Low 1',
    slug: 'court-low-1',
    brand: 'Nike',
    description:
      'Inspirada en el básquet, con cuero blanco y paneles azules. Cuello acolchado y suela de pivote.',
    price: 229999,
    status: 'published',
    image: '/images/products/court-low.png',
    sizes: ['39', '40', '41', '42', '43', '44'],
    colors: ['Blanco', 'Azul'],
  },
  {
    id: 'p-cloud-runner',
    name: 'Cloud Runner',
    slug: 'cloud-runner',
    brand: 'Adidas',
    description:
      'Total black con mediasuela de máxima amortiguación. Borrador pendiente de revisión antes de publicar.',
    price: 179999,
    status: 'draft',
    image: '/images/products/cloud-runner.png',
    sizes: ['39', '40', '41', '42', '43'],
    colors: ['Negro'],
  },
]

function buildVariants(seed: Seed, seedIndex: number): ProductVariant[] {
  const variants: ProductVariant[] = []
  seed.colors.forEach((color, colorIndex) => {
    seed.sizes.forEach((size, sizeIndex) => {
      // Stock determinístico con algunas variantes agotadas para probar la disponibilidad.
      const stock = (seedIndex * 5 + colorIndex * 3 + sizeIndex * 7) % 9
      variants.push({
        id: `${seed.id}-${colorIndex}-${size}`,
        product_id: seed.id,
        size,
        color,
        sku: `${seed.slug.toUpperCase().slice(0, 8)}-${color.slice(0, 3).toUpperCase()}-${size}`,
        stock,
        created_at: TIMESTAMP,
        updated_at: TIMESTAMP,
      })
    })
  })
  return variants
}

export const temporaryCatalog: ProductWithRelations[] = seeds.map((seed, index) => ({
  id: seed.id,
  name: seed.name,
  slug: seed.slug,
  brand: seed.brand,
  description: seed.description,
  price: seed.price,
  status: seed.status,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  variants: buildVariants(seed, index),
  images: [
    {
      id: `${seed.id}-img-0`,
      product_id: seed.id,
      storage_path: seed.image,
      alt_text: `${seed.brand} ${seed.name}, vista lateral`,
      sort_order: 0,
      created_at: TIMESTAMP,
    },
  ],
  model: null,
}))
