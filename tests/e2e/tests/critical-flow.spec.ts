import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Critical-path E2E test against the mobile-gateway:
 *
 *   1. Register a fresh user
 *   2. Log in → receive JWT
 *   3. Create a warehouse
 *   4. Create a category & product
 *   5. Add stock for the product into the warehouse
 *   6. Read the stock back and assert it matches
 *
 * Each step is an API call through the mobile-gateway, so the test exercises
 * gateway-routing, JWT auth, and 4 downstream services end-to-end.
 *
 * Run prerequisites:
 *   docker compose up -d           (or your equivalent local stack)
 *   npx playwright install         (first time only)
 *   npm test
 *
 * If the stack is not running, the test fails fast at the first call with a
 * connection error — that's expected; the assertions don't try to fake state.
 */

const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

async function register(api: APIRequestContext, email: string, password: string) {
  const res = await api.post('/auth/register', {
    data: { name: 'E2E User', email, password, role: 'manager' },
  });
  expect(res.status(), `register: ${await res.text()}`).toBe(201);
}

async function login(api: APIRequestContext, email: string, password: string): Promise<string> {
  const res = await api.post('/auth/login', { data: { email, password } });
  expect(res.ok(), `login: ${await res.text()}`).toBeTruthy();
  const token = res.headers()['x-auth-token'];
  expect(token, 'login should return X-Auth-Token header').toBeTruthy();
  return token;
}

test.describe('Critical flow: register → login → stock CRUD', () => {
  test('manager onboards a warehouse, a product, and stock', async ({ request }) => {
    const email = uniqueEmail();
    const password = 'Sup3rSecret!';

    await test.step('register a fresh manager', async () => {
      await register(request, email, password);
    });

    let token: string;
    await test.step('log in and capture JWT', async () => {
      token = await login(request, email, password);
    });

    const authHeaders = { Authorization: `Bearer ${token!}` };

    let warehouseId: string;
    await test.step('create a warehouse', async () => {
      const res = await request.post('/warehouses', {
        headers: authHeaders,
        data: {
          name: `E2E Warehouse ${Date.now()}`,
          country: 'SLOVENIA',
          city: 'LJUBLJANA',
          totalCapacity: 1000,
        },
      });
      expect(res.ok(), `create warehouse: ${await res.text()}`).toBeTruthy();
      const body = await res.json() as { id: string };
      warehouseId = body.id;
      expect(warehouseId).toBeTruthy();
    });

    let categoryId: string;
    await test.step('create a product category', async () => {
      const res = await request.post('/categories', {
        headers: authHeaders,
        data: { name: `E2E Cat ${Date.now()}`, description: 'E2E test category' },
      });
      // /categories returns 200 with no body in the current product-service impl
      expect(res.ok()).toBeTruthy();
      // Fetch back via list to get an id
      const listRes = await request.get('/categories', { headers: authHeaders });
      const list = await listRes.json() as Array<{ id: string; name: string }>;
      const created = list.find((c) => c.name.startsWith('E2E Cat'));
      expect(created).toBeTruthy();
      categoryId = created!.id;
    });

    let productId: string;
    await test.step('create a product in the category', async () => {
      const sku = `E2E-SKU-${Date.now()}`;
      const res = await request.post('/products', {
        headers: authHeaders,
        data: {
          name: 'E2E Widget',
          SKU: sku,
          description: 'Test product',
          weight: 0.5,
          categoryId,
        },
      });
      expect(res.ok()).toBeTruthy();

      const lookup = await request.get(`/products/by-sku?sku=${encodeURIComponent(sku)}`, {
        headers: authHeaders,
      });
      expect(lookup.ok()).toBeTruthy();
      const product = await lookup.json() as { id: string };
      productId = product.id;
    });

    await test.step('add 100 units of stock', async () => {
      const res = await request.post('/stock', {
        headers: authHeaders,
        data: { productId, warehouseId: warehouseId!, quantity: 100 },
      });
      expect(res.ok(), `add stock: ${await res.text()}`).toBeTruthy();
    });

    await test.step('verify stock by warehouse returns 100 units', async () => {
      const res = await request.get(`/stock/${warehouseId!}`, { headers: authHeaders });
      expect(res.ok()).toBeTruthy();
      const list = await res.json() as Array<{ productId: string; quantity: number }>;
      const ours = list.find((i) => i.productId === productId);
      expect(ours).toBeTruthy();
      expect(ours!.quantity).toBe(100);
    });
  });
});
