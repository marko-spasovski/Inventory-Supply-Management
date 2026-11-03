import { test, expect } from '@playwright/test';

/**
 * Lightweight smoke test that the stack is reachable. Runs first to give a
 * clear failure message before the full critical-flow tries (and fails in a
 * confusing way) if the gateway is down.
 */
test('mobile-gateway /health is reachable and returns ok', async ({ request }) => {
  const res = await request.get('/health');
  expect(res.ok(), `gateway /health returned ${res.status()}`).toBeTruthy();
  const body = await res.json() as { status: string; service: string };
  expect(body.status).toBe('ok');
  expect(body.service).toBe('mobile-gateway');
});
