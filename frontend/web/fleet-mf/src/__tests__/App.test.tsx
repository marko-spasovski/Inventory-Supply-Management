import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

describe('Fleet MF', () => {
  beforeEach(() => {
    localStorage.clear();
    // Tests assert English copy; the app default is Slovenian (covered in shell i18n tests).
    localStorage.setItem('erp_locale', 'en');
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      const driver = { id: 'd-1', name: 'Alice', phone: '555', email: 'a@x.com', vehicleId: 'v-1', companyId: 'c-1' };
      const vehicle = { id: 'v-1', registrationPlate: 'AB-123' };
      return Promise.resolve({
        ok: true,
        json: async () => url === '/api/drivers' ? [driver] : [vehicle],
      });
    }));
  });

  it('renders the Fleet heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Fleet' })).toBeInTheDocument();
  });

  it('loads drivers and vehicles', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    // AB-123 now appears twice — once in the driver's vehicle cell (resolved by lookup)
    // and once in the vehicle table.
    await waitFor(() => expect(screen.getAllByText('AB-123').length).toBeGreaterThanOrEqual(1));
  });

  it('shows Drivers and Vehicles subsections', () => {
    render(<App />);
    expect(screen.getByText('Drivers')).toBeInTheDocument();
    expect(screen.getByText('Vehicles')).toBeInTheDocument();
  });
});
