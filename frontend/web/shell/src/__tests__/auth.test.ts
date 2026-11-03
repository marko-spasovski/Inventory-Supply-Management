import { describe, it, expect, beforeEach } from 'vitest';
import { getUser, setUser, clearUser, isLoggedIn, AuthUser } from '../auth';

describe('shell auth helpers', () => {
  beforeEach(() => localStorage.clear());

  const sample: AuthUser = { id: 'u-1', email: 'a@x.com', name: 'Alice', role: 'MANAGER' };

  it('getUser returns null when nothing stored', () => {
    expect(getUser()).toBeNull();
  });

  it('setUser persists then getUser retrieves', () => {
    setUser(sample);
    expect(getUser()).toEqual(sample);
  });

  it('clearUser removes the stored user', () => {
    setUser(sample);
    clearUser();
    expect(getUser()).toBeNull();
  });

  it('isLoggedIn reflects presence of user', () => {
    expect(isLoggedIn()).toBe(false);
    setUser(sample);
    expect(isLoggedIn()).toBe(true);
  });

  it('getUser returns null on malformed JSON', () => {
    localStorage.setItem('mf_user', '{not-json');
    expect(getUser()).toBeNull();
  });
});
