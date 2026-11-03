import { Pool } from 'pg';
import { config } from '../config/config';

export const pool = new Pool({
  host:     config.db.host,
  port:     config.db.port,
  database: config.db.database,
  user:     config.db.user,
  password: config.db.password,
  connectionTimeoutMillis: 5_000,
});

// An idle client that loses its connection (database restart, network blip) emits 'error' on the
// pool. Without a listener Node treats it as unhandled and the whole service exits, dropping any
// notification in flight. Log it and carry on: the pool reconnects on the next query, and /readyz
// reports 503 until the database answers again.
pool.on('error', (err) => {
  console.error(JSON.stringify({ level: 'ERROR', logger: 'pg-pool', message: 'idle client error', error: err.message }));
});

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id          UUID         PRIMARY KEY,
      category    VARCHAR(20)  NOT NULL,
      severity    VARCHAR(10)  NOT NULL,
      title       VARCHAR(200) NOT NULL,
      message     TEXT         NOT NULL,
      resource_id VARCHAR(100),
      read        BOOLEAN      NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
  `);
  // Push-notification scaffold: one row per (user, device token, platform).
  // PRIMARY KEY on token alone — if the same token re-registers we just
  // upsert the (user_id, platform, last_seen) triple.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS device_tokens (
      token       TEXT         PRIMARY KEY,
      user_id     VARCHAR(100) NOT NULL,
      user_email  VARCHAR(255) NOT NULL,
      platform    VARCHAR(20)  NOT NULL,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      last_seen   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS device_tokens_user_idx ON device_tokens(user_id);
  `);
  console.log('[DB] notifications + device_tokens tables ready');
}