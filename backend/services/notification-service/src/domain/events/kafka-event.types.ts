export interface OrderCreatedPayload {
  orderId:     string;
  companyId:   string;
  companyName: string;
  warehouseId: string;
  status:      string;
  createdAt:   string;
}

export interface OrderStatusChangedPayload {
  orderId:   string;
  oldStatus: string;
  newStatus: string;
  changedAt: string;
}

export interface InventoryLowPayload {
  warehouseId:  string;
  capacityLeft: number;
  productId?:   string;  // present when emitted by inventory-service (per-product), absent for warehouse capacity events
}

export interface InventoryOutPayload {
  warehouseId: string;
  productId?:  string;
}


export type KafkaTopic =
  | 'order.created'
  | 'order.status.changed'
  | 'inventory.low'
  | 'inventory.out'

export type KafkaEvent =
  | { topic: 'order.created';        payload: OrderCreatedPayload }
  | { topic: 'order.status.changed'; payload: OrderStatusChangedPayload }
  | { topic: 'inventory.low';        payload: InventoryLowPayload }
  | { topic: 'inventory.out';        payload: InventoryOutPayload }