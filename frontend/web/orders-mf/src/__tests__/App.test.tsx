import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

describe('Orders MF', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'o-1', productId: 'p-1', companyId: 'c-1', warehouseId: 'w-1', driverId: 'd-1', quantity: 10, status: 'Requested' },
      ],
    }));
  });

  it('renders the Orders heading', () => {
    render(<App />);
    expect(screen.getByText('Orders')).toBeInTheDocument();
  });

  it('fetches orders on mount', async () => {
    render(<App />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });
});
