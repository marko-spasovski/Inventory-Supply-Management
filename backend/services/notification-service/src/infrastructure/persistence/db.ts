import { Pool } from 'pg';
import { config } from '../config/config';

export const pool = new Pool({
  host:     config.db.host,
  port:     config.db.port,
  database: config.db.database,
  user:     config.db.user,
  password: config.db.password,
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