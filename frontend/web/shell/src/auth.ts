/** Shared auth state via localStorage — readable by all micro-frontends */

export interface AuthUser {
  id:    string;
  email: string;
  name:  string;
  role:  'MANAGER' | 'WORKER';
}

const KEY = 'mf_user';

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setUser(user: AuthUser): void {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem(KEY);
}

export function isLoggedIn(): boolean {
  return getUser() !== null;
}
