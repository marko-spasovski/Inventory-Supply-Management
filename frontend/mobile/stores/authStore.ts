import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppRole } from '@erp/domain';
import { resolveRole } from '@erp/domain';

export interface AuthUser {
  id:    string;
  email: string;
  name:  string;
}

interface AuthState {
  token:        string | null;
  refreshToken: string | null;
  user:         AuthUser | null;
  role:         AppRole;
  isReady:      boolean;   // hydration complete

  setAuth: (token: string, user: AuthUser, rawRole: string, refreshToken?: string | null) => void;
  setAccessToken: (token: string) => void;
  clear:   () => void;
  setReady: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:        null,
      refreshToken: null,
      user:         null,
      role:         'WORKER',
      isReady:      false,

      setAuth: (token, user, rawRole, refreshToken) =>
        set({
          token,
          user,
          role: resolveRole(rawRole),
          // Only overwrite when explicitly provided. Refresh calls pass `null`
          // to preserve the existing refresh token.
          ...(refreshToken !== undefined ? { refreshToken } : {}),
        }),

      setAccessToken: (token) =>
        set({ token }),

      clear: () =>
        set({ token: null, refreshToken: null, user: null, role: 'WORKER' }),

      setReady: () =>
        set({ isReady: true }),
    }),
    {
      name:    'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist tokens + user + role — isReady is always false on boot.
      partialize: (state) => ({
        token:        state.token,
        refreshToken: state.refreshToken,
        user:         state.user,
        role:         state.role,
      }),
    },
  ),
);
