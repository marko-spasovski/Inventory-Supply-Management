// Order status domain model: the canonical set of states, their numeric
// ordinal mapping (mirrors order-service Domain/Enums/Status.cs), and the
// one-step transition flow. This is domain logic + runtime values, so it lives
// here rather than in @erp/api-types (which is types-only). DTOs that carry a
// status import the `OrderStatus` type from here.

export type OrderStatus = 'Requested' | 'Approved' | 'Delivered' | 'Closed' | 'Rejected';

// Mobile uses PUT /orders/:id/status { status: number }.
// Numeric mapping matches the C# enum ordinal: Requested=0 … Closed=3, Rejected=4.
export const ORDER_STATUS_VALUES: Record<OrderStatus, number> = {
  Requested: 0,
  Approved:  1,
  Delivered: 2,
  Closed:    3,
  Rejected:  4,
};

// Inverse map — backend serialises the enum as a number on responses, so the
// orders API normalises every response through this lookup.
export const ORDER_STATUS_NAMES: Record<number, OrderStatus> = {
  0: 'Requested',
  1: 'Approved',
  2: 'Delivered',
  3: 'Closed',
  4: 'Rejected',
};

// One-step forward transitions. A status with no entry is terminal.
// Requested → Approved → Delivered → Closed.
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  Requested: 'Approved',
  Approved:  'Delivered',
  Delivered: 'Closed',
};

export function nextStatus(status: OrderStatus): OrderStatus | null {
  return NEXT_STATUS[status] ?? null;
}

export function canAdvance(status: OrderStatus): boolean {
  return NEXT_STATUS[status] !== undefined;
}
