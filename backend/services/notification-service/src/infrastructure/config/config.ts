import dotenv from 'dotenv';
dotenv.config();

// The signing secret shared with auth-service (finding R03: it used to fall back to a value committed
// in source). Required outside unit tests, where Jest sets NODE_ENV=test.
function requireJwtSecret(): string {
  const value = process.env['JWT_SECRET'];
  if (value && value.length >= 32) return value;
  if (process.env['NODE_ENV'] === 'test') return 'test-only-signing-secret-not-used-anywhere-else';
  throw new Error('JWT_SECRET must be set (at least 32 characters)');
}

export const config = {
  http: {
    port: parseInt(process.env['PORT'] ?? '8080', 10),
  },
  ws: {
    port:        parseInt(process.env['WS_PORT'] ?? '9091', 10),
    // Same secret as auth-service uses to sign tokens. Raw UTF-8 bytes —
    // the issuer (auth-service JwtService.java) uses Keys.hmacShaKeyFor(secret.getBytes()).
    jwtSecret:   requireJwtSecret(),
    // When true (default), WS connections without a valid JWT are rejected.
    // Disable only for local development without auth wiring.
    requireAuth: (process.env['WS_REQUIRE_AUTH'] ?? 'true') !== 'false',
  },
  kafka: {
    brokers:  (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(','),
    groupId:  process.env['KAFKA_GROUP_ID']  ?? 'notification-service-group',
    clientId: process.env['KAFKA_CLIENT_ID'] ?? 'notification-service',
    topics: {
      orderCreated:       process.env['KAFKA_TOPIC_ORDER_CREATED']        ?? 'order.created',
      orderStatusChanged: process.env['KAFKA_TOPIC_ORDER_STATUS_CHANGED'] ?? 'order.status.changed',
      inventoryLow:       process.env['KAFKA_TOPIC_INVENTORY_LOW']        ?? 'inventory.low',
      inventoryOut:       process.env['KAFKA_TOPIC_INVENTORY_OUT']        ?? 'inventory.out',
      warehouseCapacity:  process.env['KAFKA_TOPIC_WAREHOUSE_CAPACITY']   ?? 'warehouse.capacity',
    },
  },
  db: {
    host:     process.env['DB_HOST']     ?? 'localhost',
    port:     parseInt(process.env['DB_PORT'] ?? '5439', 10),
    database: process.env['DB_NAME']     ?? 'notifications',
    user:     process.env['DB_USER']     ?? 'administrator',
    password: process.env['DB_PASSWORD'] ?? 'administrator123',
  },
} as const;
