import { createNotification, Notification } from '../domain/entites/notification.entity';

describe('createNotification', () => {
  it('returns a notification with an id, default read=false, and a Date createdAt', () => {
    const n = createNotification({
      category: 'ORDER',
      severity: 'info',
      title: 'Hi',
      message: 'There',
      resourceId: 'order-1',
    });

    expect(n.id).toEqual(expect.any(String));
    expect(n.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(n.read).toBe(false);
    expect(n.createdAt).toBeInstanceOf(Date);
  });

  it('copies input params verbatim', () => {
    const n = createNotification({
      category: 'INVENTORY',
      severity: 'warning',
      title: 'Low stock',
      message: 'Warehouse W1 low',
      resourceId: 'w1',
    });

    expect(n.category).toBe('INVENTORY');
    expect(n.severity).toBe('warning');
    expect(n.title).toBe('Low stock');
    expect(n.message).toBe('Warehouse W1 low');
    expect(n.resourceId).toBe('w1');
  });

  it('assigns unique ids on each call', () => {
    const a = createNotification({ category: 'ORDER', severity: 'info', title: 't', message: 'm', resourceId: null });
    const b = createNotification({ category: 'ORDER', severity: 'info', title: 't', message: 'm', resourceId: null });
    expect(a.id).not.toBe(b.id);
  });

  it('accepts null resourceId', () => {
    const n: Notification = createNotification({
      category: 'WAREHOUSE',
      severity: 'success',
      title: 't', message: 'm', resourceId: null,
    });
    expect(n.resourceId).toBeNull();
  });
});
