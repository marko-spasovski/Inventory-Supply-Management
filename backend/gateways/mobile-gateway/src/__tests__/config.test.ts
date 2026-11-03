import { config } from '../config';

describe('config', () => {
  it('exposes a numeric port', () => {
    expect(typeof config.port).toBe('number');
    expect(Number.isInteger(config.port)).toBe(true);
  });

  it('exposes a non-empty JWT secret', () => {
    expect(typeof config.jwt.secret).toBe('string');
    expect(config.jwt.secret.length).toBeGreaterThan(0);
  });

  it('lists all expected downstream services', () => {
    const expected = [
      'auth', 'company', 'fleet', 'warehouse', 'product',
      'inventory', 'order', 'notification', 'ai', 'notificationWs',
    ];
    for (const key of expected) {
      expect(config.services).toHaveProperty(key);
      expect((config.services as Record<string, string>)[key]).toMatch(/^(http|ws)s?:\/\//);
    }
  });

  it('parses CORS origins into an array', () => {
    expect(Array.isArray(config.cors.origins)).toBe(true);
    expect(config.cors.origins.length).toBeGreaterThan(0);
  });

  it('has rate-limit settings', () => {
    expect(config.rateLimit.windowMs).toBeGreaterThan(0);
    expect(config.rateLimit.max).toBeGreaterThan(0);
  });
});
