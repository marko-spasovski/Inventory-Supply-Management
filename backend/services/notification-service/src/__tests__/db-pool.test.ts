import { pool } from '../infrastructure/persistence/db';

describe('database pool', () => {
  afterAll(async () => { await pool.end(); });

  it('survives an idle-client error instead of crashing the process', () => {
    // A pool with no 'error' listener rethrows, which terminates Node.
    expect(pool.listenerCount('error')).toBeGreaterThan(0);
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => pool.emit('error', new Error('terminating connection due to administrator command'))).not.toThrow();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
