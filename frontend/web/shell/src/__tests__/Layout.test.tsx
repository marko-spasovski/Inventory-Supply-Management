import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import { AuthUser } from '../auth';

const user: AuthUser = { id: 'u-1', email: 'a@x.com', name: 'Alice', role: 'MANAGER' };

function renderLayout(onLogout = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/warehouses']}>
      <Layout user={user} onLogout={onLogout}>
        <p>Page content</p>
      </Layout>
    </MemoryRouter>,
  );
  return { onLogout };
}

describe('shell Layout', () => {
  it('renders user info in sidebar', () => {
    renderLayout();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('a@x.com')).toBeInTheDocument();
    expect(screen.getByText('MANAGER')).toBeInTheDocument();
  });

  it('renders all 6 nav links', () => {
    renderLayout();
    // "Warehouses" also appears in the header for the /warehouses route, so use getAllByText.
    for (const label of ['Warehouses', 'Stock', 'Orders', 'Companies', 'Fleet', 'Products']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('shows notifications bell in header', () => {
    renderLayout();
    expect(screen.getByTitle('Notifications')).toBeInTheDocument();
  });

  it('renders the children content', () => {
    renderLayout();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('calls onLogout when Logout clicked', async () => {
    const onLogout = vi.fn();
    render(
      <MemoryRouter>
        <Layout user={user} onLogout={onLogout}>x</Layout>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(onLogout).toHaveBeenCalled();
  });
});
