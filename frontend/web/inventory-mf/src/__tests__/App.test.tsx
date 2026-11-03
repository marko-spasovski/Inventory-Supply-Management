import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

describe('Inventory MF', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (typeof url === 'string' && url.startsWith('/api/inventory')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { id: 'i-1', productId: 'p-1', warehouseId: 'w-1', quantity: 50, minQuantity: 10, maxQuantity: 200 },
          ],
        });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    }));
  });

  it('renders Stock / Inventory heading', () => {
    render(<App />);
    expect(screen.getByText(/Stock \/ Inventory/i)).toBeInTheDocument();
  });

  it('fetches and shows inventory items', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('50')).toBeInTheDocument());
  });

  it('calls /api/inventory on mount', async () => {
    render(<App />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/inventory', expect.any(Object)));
  });

  it('shows warehouse filter dropdown', () => {
    render(<App />);
    expect(screen.getByText(/Warehouse:/i)).toBeInTheDocument();
  });
});
