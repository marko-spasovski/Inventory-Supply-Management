import { axiosClient } from '@/lib/http/client';
import type { AuthResponse, LoginRequest, RegisterRequest } from '@erp/api-types';

export const authApi = {
  login: async (body: LoginRequest): Promise<{ response: AuthResponse; token: string; refreshToken: string | null }> => {
    const res = await axiosClient.post<AuthResponse>('/auth/login', body);
    const token: string = (res.headers['x-auth-token'] as string | undefined) ?? '';
    // Refresh token added when Gap 1 was closed; null if header isn't present
    // (older backend or non-CORS-exposed environment).
    const refreshToken: string | null = (res.headers['x-refresh-token'] as string | undefined) ?? null;
    return { response: res.data, token, refreshToken };
  },

  register: async (body: RegisterRequest): Promise<AuthResponse> => {
    const res = await axiosClient.post<AuthResponse>('/auth/register', body);
    return res.data;
  },

  // Exchange a refresh token for a new access token.
  // Returns the new access token string. Throws on 401/400.
  refresh: async (refreshToken: string): Promise<string> => {
    const res = await axiosClient.post<{ accessToken: string }>('/auth/refresh', { refreshToken });
    return res.data.accessToken;
  },

  logout: async (): Promise<void> => {
    await axiosClient.post('/auth/logout').catch(() => {
      // Best-effort; local state is cleared regardless.
    });
  },
};
