import 'dotenv/config';

export const config = {
  port: parseInt(process.env['PORT'] ?? '8090', 10),

  jwt: {
    // Same secret used by auth-service (base64-encoded HMAC key)
    secret: process.env['JWT_SECRET'] ?? 'ewzqAN2z1bq7yYFcN3/KId4wbohavFXxHE7nnr82lZE=',
  },

  // Downstream microservice URLs
  services: {
    auth:         process.env['AUTH_SERVICE_URL']         ?? 'http://localhost:8081',
    company:      process.env['COMPANY_SERVICE_URL']      ?? 'http://localhost:8082',
    fleet:        process.env['FLEET_SERVICE_URL']        ?? 'http://localhost:8083',
    warehouse:    process.env['WAREHOUSE_SERVICE_URL']    ?? 'http://localhost:8084',
    product:      process.env['PRODUCT_SERVICE_URL']      ?? 'http://localhost:8085',
    inventory:    process.env['INVENTORY_SERVICE_URL']    ?? 'http://localhost:8086',
    order:        process.env['ORDER_SERVICE_URL']        ?? 'http://localhost:8087',
    notification: process.env['NOTIFICATION_SERVICE_URL'] ?? 'http://localhost:8088',
    ai:           process.env['AI_SERVICE_URL']           ?? 'http://localhost:8089',
    // WS upstream — port that notification-service binds for upgrades.
    notificationWs: process.env['NOTIFICATION_WS_URL']    ?? 'ws://localhost:9091',
  },

  cors: {
    // Mobile clients — allow all origins in dev; restrict in production
    origins: (process.env['CORS_ORIGINS'] ?? '*').split(','),
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,                  // requests per window
  },
} as const;
