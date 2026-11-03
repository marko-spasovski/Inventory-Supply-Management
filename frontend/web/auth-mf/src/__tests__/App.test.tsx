import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('Auth MF — login form', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders email and password inputs', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/you@example/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^register$/i })).toBeInTheDocument();
  });

  it('shows register tab with role select', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /^register$/i }));
    expect(screen.getByText(/create a new account/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('WORKER');
  });

  it('shows heading and subtitle', () => {
    render(<App />);
    expect(screen.getByText('Inventory System')).toBeInTheDocument();
    expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
  });

  it('calls onLogin and stores user when login succeeds', async () => {
    const user = { id: 'u-1', email: 'a@x.com', name: 'Alice', role: 'MANAGER' as const };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => user,
    }));

    const onLogin = vi.fn();
    render(<App onLogin={onLogin} />);

    await userEvent.type(screen.getByPlaceholderText(/you@example/i), 'a@x.com');
    await userEvent.type(screen.getByPlaceholderText(/••••/), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(user));
    expect(JSON.parse(localStorage.getItem('mf_user')!)).toEqual(user);
  });

  it('shows error message when login fails with body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Wrong creds' }),
    }));

    render(<App />);
    await userEvent.type(screen.getByPlaceholderText(/you@example/i), 'a@x.com');
    await userEvent.type(screen.getByPlaceholderText(/••••/), 'bad');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Wrong creds')).toBeInTheDocument();
  });

  it('shows generic error when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    render(<App />);
    await userEvent.type(screen.getByPlaceholderText(/you@example/i), 'a@x.com');
    await userEvent.type(screen.getByPlaceholderText(/••••/), 'pw');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });

  it('disables submit button while loading', async () => {
    // Never-resolving fetch to keep loading state
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));

    render(<App />);
    await userEvent.type(screen.getByPlaceholderText(/you@example/i), 'a@x.com');
    await userEvent.type(screen.getByPlaceholderText(/••••/), 'pw');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });
});
