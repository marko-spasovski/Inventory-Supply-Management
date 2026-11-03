// All four spec roles. Backend (auth-service Role enum) issues all four since
// Gap 2 was closed.
export type AppRole = 'ADMIN' | 'MANAGER' | 'WORKER' | 'DRIVER';

// Backend role string is identical to AppRole now.
export type BackendRole = AppRole;

const ROLE_ALIAS: Record<string, AppRole> = {
  ADMIN:   'ADMIN',
  MANAGER: 'MANAGER',
  WORKER:  'WORKER',
  DRIVER:  'DRIVER',
};

// Maps raw JWT role string to AppRole. Falls back to WORKER on unknown values.
export function resolveRole(raw: string | undefined | null): AppRole {
  if (!raw) return 'WORKER';
  return ROLE_ALIAS[raw.toUpperCase()] ?? 'WORKER';
}

// Feature keys — one per spec feature.
export type FeatureKey =
  | 'AUTH'
  | 'PRODUCTS_READ'
  | 'PRODUCTS_WRITE'
  | 'CATEGORIES_READ'
  | 'CATEGORIES_WRITE'
  | 'WAREHOUSES_READ'
  | 'WAREHOUSES_WRITE'
  | 'INVENTORY_READ'
  | 'INVENTORY_WRITE'
  | 'ORDERS_READ'
  | 'ORDERS_WRITE'
  | 'ORDERS_STATUS_UPDATE'
  | 'NOTIFICATIONS'
  | 'SCANNER'
  | 'OFFLINE'
  | 'FLEET_READ'
  | 'FLEET_WRITE'
  | 'FLEET_SELF'
  | 'COMPANIES_READ'
  | 'COMPANIES_WRITE'
  | 'AI_ANALYSIS';

// Feature matrix — defined for all four spec roles.
// ADMIN→MANAGER and DRIVER→WORKER alias is in resolveRole so that
// removing the alias is a one-function change in this file only.
const FEATURE_MATRIX: Record<AppRole, ReadonlySet<FeatureKey>> = {
  ADMIN: new Set<FeatureKey>([
    'AUTH', 'PRODUCTS_READ', 'PRODUCTS_WRITE', 'CATEGORIES_READ', 'CATEGORIES_WRITE',
    'WAREHOUSES_READ', 'WAREHOUSES_WRITE', 'INVENTORY_READ', 'INVENTORY_WRITE',
    'ORDERS_READ', 'ORDERS_WRITE', 'ORDERS_STATUS_UPDATE', 'NOTIFICATIONS',
    'SCANNER', 'OFFLINE', 'FLEET_READ', 'FLEET_WRITE', 'FLEET_SELF',
    'COMPANIES_READ', 'COMPANIES_WRITE', 'AI_ANALYSIS',
  ]),
  MANAGER: new Set<FeatureKey>([
    'AUTH', 'PRODUCTS_READ', 'PRODUCTS_WRITE', 'CATEGORIES_READ', 'CATEGORIES_WRITE',
    'WAREHOUSES_READ', 'WAREHOUSES_WRITE', 'INVENTORY_READ', 'INVENTORY_WRITE',
    'ORDERS_READ', 'ORDERS_WRITE', 'ORDERS_STATUS_UPDATE', 'NOTIFICATIONS',
    'SCANNER', 'OFFLINE', 'FLEET_READ', 'FLEET_WRITE',
    'COMPANIES_READ', 'COMPANIES_WRITE', 'AI_ANALYSIS',
  ]),
  WORKER: new Set<FeatureKey>([
    'AUTH', 'PRODUCTS_READ', 'CATEGORIES_READ',
    'WAREHOUSES_READ',
    'INVENTORY_READ', 'INVENTORY_WRITE',
    'ORDERS_READ', 'ORDERS_STATUS_UPDATE',
    'NOTIFICATIONS', 'SCANNER', 'OFFLINE',
    'FLEET_READ', 'COMPANIES_READ',
  ]),
  DRIVER: new Set<FeatureKey>([
    'AUTH',
    'ORDERS_READ', 'ORDERS_STATUS_UPDATE',
    'NOTIFICATIONS',
    'FLEET_READ', 'FLEET_SELF',
  ]),
};

export function hasFeature(role: AppRole, feature: FeatureKey): boolean {
  // While backend only issues MANAGER/WORKER, resolve alias before matrix lookup.
  const effective: AppRole =
    role === 'ADMIN' ? 'ADMIN' :
    role === 'DRIVER' ? 'DRIVER' :
    role;
  return FEATURE_MATRIX[effective].has(feature);
}
