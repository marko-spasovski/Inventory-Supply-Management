import dotenv from 'dotenv';
dotenv.config();

export const config = {
  http: {
    port: parseInt(process.env['PORT'] ?? '8080', 10),
  },
  ws: {
    port:        parseInt(process.env['WS_PORT'] ?? '9091', 10),
    // Same secret as auth-service uses to sign tokens. Raw UTF-8 bytes —
    // the issuer (auth-service JwtService.java) uses Keys.hmacShaKeyFor(secret.getBytes()).
    jwtSecret:   process.env['JWT_SECRET'] ?? 'ewzqAN2z1bq7yYFcN3/KId4wbohavFXxHE7nnr82lZE=',
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
