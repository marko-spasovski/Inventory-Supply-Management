import axios, { type AxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '@/stores/authStore';

// ── Base URL resolution ────────────────────────────────────────────────────
// Mobile-gateway runs on port 8090 (compose.yaml / config.ts).
// Override with EXPO_PUBLIC_API_URL in .env for physical device.
const DEFAULT_HOSTS: Record<string, string> = {
  android: 'http://10.0.2.2:8090',
  ios:     'http://localhost:8090',
  web:     'http://localhost:8090',
};

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_HOSTS[Platform.OS] ?? 'http://localhost:8090';

// Gap 7 closed: mobile-gateway now proxies WS upgrades at `/ws`, so the WS URL
// uses the same host:port as the REST API. Falls back to the legacy direct
// 9091 wire if EXPO_PUBLIC_WS_URL still points there.
export const WS_URL =
  process.env.EXPO_PUBLIC_WS_URL ??
  `${BASE_URL.replace(/^http/, 'ws')}/ws`;

// ── Axios instance ─────────────────────────────────────────────────────────
export const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    // Skip ngrok's free-tier browser warning interstitial when the gateway is
    // tunneled via ngrok during physical-device dev. Harmless when BASE_URL is
    // a direct LAN address.
    'ngrok-skip-browser-warning': '1',
  },
});

// ── Request interceptor — attach Bearer token ──────────────────────────────
axiosClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ── 401 → refresh → retry ─────────────────────────────────────────────────
// auth-service exposes POST /auth/refresh (Gap 1 closed). On a 401 from any
// non-auth endpoint we try to exchange the stored refresh token once, then
// retry the original request. If the refresh itself fails we fall back to
// clearing local auth and letting the root layout's guard bounce to login.
//
// Concurrent 401s are de-duplicated via a single in-flight refresh promise so
// we never trigger two parallel refresh calls for the same expired access
// token.
let refreshInFlight: Promise<string | null> | null = null;

type RetryConfig = AxiosRequestConfig & { _retriedAfterRefresh?: boolean };

async function attemptRefresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  // Lazy import to break the circular dependency between this module and
  // lib/api/auth (which depends on axiosClient).
  refreshInFlight = (async () => {
    try {
      const { authApi } = await import('@/lib/api/auth');
      const newAccess = await authApi.refresh(refreshToken);
      useAuthStore.getState().setAccessToken(newAccess);
      return newAccess;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

axiosClient.interceptors.response.use(
  (res) => res,
  async (err: unknown) => {
    if (!axios.isAxiosError(err) || err.response?.status !== 401) {
      return Promise.reject(err);
    }
    const config = err.config as RetryConfig | undefined;
    // Don't try to refresh the refresh call itself or repeat for the same request.
    if (!config || config._retriedAfterRefresh || (config.url ?? '').startsWith('/auth/')) {
      useAuthStore.getState().clear();
      return Promise.reject(err);
    }

    const newAccess = await attemptRefresh();
    if (!newAccess) {
      useAuthStore.getState().clear();
      return Promise.reject(err);
    }

    config._retriedAfterRefresh = true;
    config.headers = { ...(config.headers ?? {}), Authorization: `Bearer ${newAccess}` };
    return axiosClient.request(config);
  },
);
