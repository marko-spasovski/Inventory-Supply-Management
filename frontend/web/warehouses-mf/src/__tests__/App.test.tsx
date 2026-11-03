import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

describe('Warehouses MF', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'w-1', name: 'Main', country: 'SLOVENIA', city: 'LJUBLJANA', totalCapacity: 1000, usedCapacity: 100 },
      ],
    }));
  });

  it('renders the Warehouses heading', () => {
    render(<App />);
    expect(screen.getByText('Warehouses')).toBeInTheDocument();
  });

  it('loads warehouses from API and shows them', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Main')).toBeInTheDocument());
  });

  it('calls /api/warehouses on mount', async () => {
    render(<App />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/warehouses', expect.any(Object)));
  });
});
