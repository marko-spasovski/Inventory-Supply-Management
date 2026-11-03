import { Router, Request, Response } from 'express';
import type { Pool } from 'pg';

// Push-notification scaffold.
//
// Mobile clients (Expo) call `POST /notifications/device-tokens` whenever
// expo-notifications grants permission and returns a push token. We store
// the (user, token, platform) row so a future "fan out" job can iterate
// every device for a given user and post to Expo's push API.
//
// The actual APNS/FCM/Expo-push send is NOT wired here — it would be a
// follow-up: a Kafka consumer that fans out notifications to every device
// row, calling Expo's https://exp.host/--/api/v2/push/send endpoint.
export function createDeviceTokenRouter(pool: Pool): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    const token    = (req.body?.token ?? '').toString().trim();
    const platform = (req.body?.platform ?? '').toString().trim().toLowerCase();
    const userId   = (req.headers['x-user-id']    as string | undefined) ?? '';
    const email    = (req.headers['x-user-email'] as string | undefined) ?? '';

    if (!token || !platform) {
      res.status(400).json({ error: 'Bad Request', message: '`token` and `platform` are required.' });
      return;
    }
    if (!['ios', 'android', 'web'].includes(platform)) {
      res.status(400).json({ error: 'Bad Request', message: '`platform` must be ios | android | web.' });
      return;
    }
    if (!userId || !email) {
      res.status(401).json({ error: 'Unauthorized', message: 'X-User-Id / X-User-Email missing — gateway not in front?' });
      return;
    }

    try {
      await pool.query(
        `INSERT INTO device_tokens (token, user_id, user_email, platform, created_at, last_seen)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (token) DO UPDATE SET
           user_id    = EXCLUDED.user_id,
           user_email = EXCLUDED.user_email,
           platform   = EXCLUDED.platform,
           last_seen  = NOW();`,
        [token, userId, email, platform],
      );
      res.status(201).json({ status: 'registered' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[device-tokens] insert failed:', message);
      res.status(500).json({ error: 'Internal Server Error', message });
    }
  });

  router.delete('/:token', async (req: Request, res: Response) => {
    const token = req.params['token'];
    try {
      const result = await pool.query('DELETE FROM device_tokens WHERE token = $1', [token]);
      res.status(204).send();
      console.log(`[device-tokens] removed ${result.rowCount} row(s) for token ${token.slice(0, 12)}…`);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
    }
  });

  return router;
}
