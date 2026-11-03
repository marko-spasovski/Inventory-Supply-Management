import { resolveRole, hasFeature } from '@erp/domain';

describe('resolveRole', () => {
  it('maps known backend roles', () => {
    expect(resolveRole('MANAGER')).toBe('MANAGER');
    expect(resolveRole('WORKER')).toBe('WORKER');
  });

  it('accepts spec-only roles via alias', () => {
    expect(resolveRole('ADMIN')).toBe('ADMIN');
    expect(resolveRole('DRIVER')).toBe('DRIVER');
  });

  it('is case-insensitive', () => {
    expect(resolveRole('manager')).toBe('MANAGER');
    expect(resolveRole('Driver')).toBe('DRIVER');
  });

  it('falls back to WORKER on unknown / missing values', () => {
    expect(resolveRole(undefined)).toBe('WORKER');
    expect(resolveRole(null)).toBe('WORKER');
    expect(resolveRole('')).toBe('WORKER');
    expect(resolveRole('SUPERHERO')).toBe('WORKER');
  });
});

describe('hasFeature', () => {
  it('ADMIN gets every feature', () => {
    expect(hasFeature('ADMIN', 'PRODUCTS_WRITE')).toBe(true);
    expect(hasFeature('ADMIN', 'FLEET_WRITE')).toBe(true);
    expect(hasFeature('ADMIN', 'AI_ANALYSIS')).toBe(true);
  });

  it('MANAGER gets writes but not driver self-view', () => {
    expect(hasFeature('MANAGER', 'INVENTORY_WRITE')).toBe(true);
    expect(hasFeature('MANAGER', 'ORDERS_WRITE')).toBe(true);
    expect(hasFeature('MANAGER', 'FLEET_SELF')).toBe(false);
  });

  it('WORKER can read inventory + scan but not write products', () => {
    expect(hasFeature('WORKER', 'INVENTORY_READ')).toBe(true);
    expect(hasFeature('WORKER', 'INVENTORY_WRITE')).toBe(true);
    expect(hasFeature('WORKER', 'SCANNER')).toBe(true);
    expect(hasFeature('WORKER', 'PRODUCTS_WRITE')).toBe(false);
    expect(hasFeature('WORKER', 'AI_ANALYSIS')).toBe(false);
  });

  it('DRIVER is restricted to orders + own fleet + notifications', () => {
    expect(hasFeature('DRIVER', 'ORDERS_READ')).toBe(true);
    expect(hasFeature('DRIVER', 'ORDERS_STATUS_UPDATE')).toBe(true);
    expect(hasFeature('DRIVER', 'FLEET_SELF')).toBe(true);
    expect(hasFeature('DRIVER', 'NOTIFICATIONS')).toBe(true);
    expect(hasFeature('DRIVER', 'INVENTORY_READ')).toBe(false);
    expect(hasFeature('DRIVER', 'PRODUCTS_READ')).toBe(false);
  });

  it('AUTH is granted to every role', () => {
    (['ADMIN', 'MANAGER', 'WORKER', 'DRIVER'] as const).forEach((r) => {
      expect(hasFeature(r, 'AUTH')).toBe(true);
    });
  });
});
