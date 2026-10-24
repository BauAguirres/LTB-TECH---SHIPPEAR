export type OrderStatus = 'pending' | 'paid' | 'preparing' | 'shipped' | 'ready_for_pickup' | 'fulfilled' | 'cancelled'
export type PaymentStatus = 'pending' | 'in_process' | 'approved' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back'

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pendiente de pago',
  paid: 'Pagado',
  preparing: 'En preparación',
  shipped: 'Enviado',
  ready_for_pickup: 'Listo para retirar',
  fulfilled: 'Entregado',
  cancelled: 'Cancelado',
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  in_process: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
  refunded: 'Devuelto',
  charged_back: 'Contracargo',
}

/** Estados a los que el admin puede mover un pedido pagado, según el método de entrega. */
export function nextStatuses(method: 'delivery' | 'pickup' | null): OrderStatus[] {
  return method === 'pickup'
    ? ['paid', 'preparing', 'ready_for_pickup', 'fulfilled']
    : ['paid', 'preparing', 'shipped', 'fulfilled']
}

export function orderNumber(id: string): string {
  return id.slice(0, 8).toUpperCase()
}
