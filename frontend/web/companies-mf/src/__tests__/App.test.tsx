import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

describe('Companies MF', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'c-1', name: 'Acme', email: 'a@x.com', phone: '555', contact: 'John' },
      ],
    }));
  });

  it('renders the heading and the company list after fetch', async () => {
    render(<App />);
    expect(screen.getByText('Companies')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Acme')).toBeInTheDocument());
  });

  it('calls /api/companies on mount', async () => {
    render(<App />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/companies', expect.any(Object)));
  });
});
