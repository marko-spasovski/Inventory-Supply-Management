import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

describe('Products MF', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      const product = { id: 'p-1', name: 'Widget', sku: 'SKU-1', description: 'd', weight: 1, categoryId: 'cat-1' };
      const category = { id: 'cat-1', name: 'Electronics', description: 'd' };
      return Promise.resolve({
        ok: true,
        json: async () => url.includes('/categories') ? [category] : [product],
      });
    }));
  });

  it('renders Products heading', () => {
    render(<App />);
    // Two headings: Categories and Products. Use getAllByText.
    const headings = screen.getAllByText('Products');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('loads products from API', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Widget')).toBeInTheDocument());
  });
});
