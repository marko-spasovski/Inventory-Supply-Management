import 'dotenv/config';
import express from 'express';
import { catchError } from 'rxjs';

import { config } from './infrastructure/config/config';
import { initDb, pool } from './infrastructure/persistence/db';
import { KafkaConsumerStream } from './infrastructure/kafka/kafka-consumer.stream';
import { WsServer } from './infrastructure/websocket/ws-server';
import { WsBroadcaster } from './infrastructure/websocket/ws-broadcaster';
import { PgNotificationRepository } from './infrastructure/persistence/notification.repository.impl';
import { ProcessKafkaEventUseCase } from './application/use-cases/process-kafka-event.usecase';
import { createNotificationRouter } from './presentation/http/notification.router';
import { createDeviceTokenRouter }  from './presentation/http/device-token.router';

async function bootstrap(): Promise<void> {
  try {
    console.log('[Main] Starting database initialization...');
    await initDb();
    console.log('[Main] Database initialized successfully');

    console.log('[Main] Building dependency graph...');
    const repository  = new PgNotificationRepository(pool);
    const wsServer    = new WsServer();
    const broadcaster = new WsBroadcaster(wsServer.clients$);
    const kafkaStream = new KafkaConsumerStream();
    const useCase     = new ProcessKafkaEventUseCase(repository, broadcaster);
    console.log('[Main] Dependency graph ready');

    console.log('[Main] Wiring Kafka pipeline...');
    useCase
        .execute(kafkaStream.messages$)
        .pipe(
            catchError((err, caught) => {
              console.error('[Pipeline] recoverable error:', err.message);
              return caught; // continue stream
            }),
        )
        .subscribe({
          next: n => console.log(`[Pipeline] ✓ [${n.severity}] ${n.title}`),
          error: err => console.error('[Pipeline] fatal error:', err),
        });
    console.log('[Main] Kafka pipeline wired');

    console.log('[Main] Connecting Kafka...');
    await kafkaStream.connect();
    console.log('[Main] Kafka connected');

    console.log('[Main] Starting HTTP server...');
    const app = express();
    app.use(express.json());
    app.use('/notifications', createNotificationRouter(repository));
    app.use('/notifications/device-tokens', createDeviceTokenRouter(pool));
    app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'notification-service' }));

    app.listen(8088, () => console.log(`[HTTP] listening on port 8088`));

    console.log('[Main] WebSocket server is starting...');
    // WsServer is already started in constructor
    console.log('[Main] WebSocket server ready');

    // 6. Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`[Main] ${signal} — shutting down gracefully`);
      await kafkaStream.disconnect();
      wsServer.close();
      await pool.end();
      process.exit(0);
    };
    process.on('SIGINT',  () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    console.log('[Main] Bootstrap complete, service running...');
  } catch (err) {
    console.error('[Main] bootstrap failed:', err);
    process.exit(1);
  }
}

bootstrap();