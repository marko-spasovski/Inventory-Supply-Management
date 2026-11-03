// React Query key factory — single source of truth for all cache keys.
export const queryKeys = {
  // Auth
  me: ['me'] as const,

  // Warehouses
  warehouses:          ['warehouses'] as const,
  warehouseDetail:     (id: string) => ['warehouses', id] as const,
  warehouseSummary:    ['warehouses', 'summary'] as const,

  // Stock / Inventory
  stockAll:            ['stock'] as const,
  stockByWarehouse:    (warehouseId: string) => ['stock', warehouseId] as const,

  // Orders
  orders:              ['orders'] as const,
  orderDetail:         (id: string) => ['orders', id] as const,

  // Products
  products:            ['products'] as const,
  productDetail:       (id: string) => ['products', id] as const,

  // Categories
  categories:          ['categories'] as const,

  // Companies
  companies:           ['companies'] as const,
  companyDetail:       (id: string) => ['companies', id] as const,

  // Fleet
  drivers:             ['drivers'] as const,
  driverDetail:        (id: string) => ['drivers', id] as const,
  vehicles:            ['vehicles'] as const,
  vehicleDetail:       (id: string) => ['vehicles', id] as const,

  // Notifications
  notifications:       ['notifications'] as const,
  notificationsUnread: ['notifications', 'unread'] as const,
} as const;
