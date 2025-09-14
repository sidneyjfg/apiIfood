// src/modules/orders/utils/orderGuards.ts
export function canDispatchByLocalState(order: {
  status?: string | null;
  last_event_code?: string | null;
}) {
  // Estados aceitáveis para despachar
  const okStatus = new Set(['CONFIRMED', 'READY']);
  const okEvents = new Set(['CFM', 'READY']); // (use 'RDP' se você usar esse code para "ready to pickup")

  if (!order) return false;
  if (order.status && okStatus.has(order.status.toUpperCase())) return true;
  if (order.last_event_code && okEvents.has(order.last_event_code.toUpperCase())) return true;

  return false;
}
