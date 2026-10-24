/**
 * Modelo genérico de demostración. No reproduce ninguna zapatilla de marca:
 * se usa solo para mostrar cómo funciona el visor 3D y la realidad aumentada
 * mientras un producto no tiene su propio modelo digitalizado.
 */
export const DEMO_SNEAKER_MODEL = {
  src: '/models/generic-sneaker.glb',
  alt: 'Modelo 3D genérico de una zapatilla deportiva',
  attribution: {
    label: 'Materials Variants Shoe — Shopify, CC BY 4.0',
    href: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/MaterialsVariantsShoe',
  },
} as const
