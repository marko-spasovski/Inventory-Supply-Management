import express from 'express';
import request from 'supertest';
import type { Pool } from 'pg';
import { createDeviceTokenRouter } from '../presentation/http/device-token.router';

function makePool(queryImpl: jest.Mock): Pool {
  return { query: queryImpl } as unknown as Pool;
}

function makeApp(pool: Pool): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/device-tokens', createDeviceTokenRouter(pool));
  return app;
}

describe('DeviceTokenRouter', () => {
  describe('POST /device-tokens', () => {
    it('returns 400 when token missing', async () => {
      const res = await request(makeApp(makePool(jest.fn())))
        .post('/device-tokens')
        .set('X-User-Id', 'u-1')
        .set('X-User-Email', 'a@x.com')
        .send({ platform: 'ios' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when platform missing', async () => {
      const res = await request(makeApp(makePool(jest.fn())))
        .post('/device-tokens')
        .set('X-User-Id', 'u-1')
        .set('X-User-Email', 'a@x.com')
        .send({ token: 'tok' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when platform is invalid', async () => {
      const res = await request(makeApp(makePool(jest.fn())))
        .post('/device-tokens')
        .set('X-User-Id', 'u-1')
        .set('X-User-Email', 'a@x.com')
        .send({ token: 'tok', platform: 'windows' });
      expect(res.status).toBe(400);
    });

    it('returns 401 when user headers missing', async () => {
      const res = await request(makeApp(makePool(jest.fn())))
        .post('/device-tokens')
        .send({ token: 'tok', platform: 'ios' });
      expect(res.status).toBe(401);
    });

    it('returns 201 and inserts when all params present', async () => {
      const query = jest.fn().mockResolvedValue({ rowCount: 1 });
      const res = await request(makeApp(makePool(query)))
        .post('/device-tokens')
        .set('X-User-Id', 'u-1')
        .set('X-User-Email', 'a@x.com')
        .send({ token: 'expo-token', platform: 'ios' });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('registered');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO device_tokens'),
        ['expo-token', 'u-1', 'a@x.com', 'ios'],
      );
    });

    it('returns 500 when DB query throws', async () => {
      const query = jest.fn().mockRejectedValue(new Error('connection lost'));
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(makeApp(makePool(query)))
        .post('/device-tokens')
        .set('X-User-Id', 'u-1')
        .set('X-User-Email', 'a@x.com')
        .send({ token: 'tok', platform: 'android' });

      expect(res.status).toBe(500);
      errSpy.mockRestore();
    });

    it('lower-cases platform input', async () => {
      const query = jest.fn().mockResolvedValue({ rowCount: 1 });
      const res = await request(makeApp(makePool(query)))
        .post('/device-tokens')
        .set('X-User-Id', 'u-1')
        .set('X-User-Email', 'a@x.com')
        .send({ token: 'tok', platform: 'IOS' });

      expect(res.status).toBe(201);
      expect(query).toHaveBeenCalledWith(expect.any(String),
        expect.arrayContaining(['ios']));
    });
  });

  describe('DELETE /device-tokens/:token', () => {
    it('returns 204', async () => {
      const query = jest.fn().mockResolvedValue({ rowCount: 1 });
      // The handler logs on success; silence it.
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const res = await request(makeApp(makePool(query)))
        .delete('/device-tokens/some-token');

      expect(res.status).toBe(204);
      expect(query).toHaveBeenCalledWith(
        'DELETE FROM device_tokens WHERE token = $1',
        ['some-token'],
      );
      logSpy.mockRestore();
    });

    it('returns 500 when DB query throws', async () => {
      const query = jest.fn().mockRejectedValue(new Error('boom'));
      const res = await request(makeApp(makePool(query)))
        .delete('/device-tokens/x');
      expect(res.status).toBe(500);
    });
  });
});
