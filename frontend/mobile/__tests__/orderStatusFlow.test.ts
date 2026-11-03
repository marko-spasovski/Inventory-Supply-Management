import { NEXT_STATUS, nextStatus, canAdvance } from '@erp/domain';

describe('order status flow', () => {
  it('advances one step at a time through the full chain', () => {
    expect(nextStatus('Requested')).toBe('Approved');
    expect(nextStatus('Approved')).toBe('Delivered');
    expect(nextStatus('Delivered')).toBe('Closed');
  });

  it('treats Closed as terminal', () => {
    expect(nextStatus('Closed')).toBeNull();
    expect(canAdvance('Closed')).toBe(false);
  });

  it('canAdvance reflects map presence', () => {
    expect(canAdvance('Requested')).toBe(true);
    expect(canAdvance('Approved')).toBe(true);
    expect(canAdvance('Delivered')).toBe(true);
  });

  it('never skips a status (Requested cannot jump to Delivered)', () => {
    expect(NEXT_STATUS.Requested).toBe('Approved');
    expect(NEXT_STATUS.Requested).not.toBe('Delivered');
    expect(NEXT_STATUS.Requested).not.toBe('Closed');
  });
});
