import type { ApiError } from '@erp/api-types';

export function formatApiError(err: unknown): string {
  if (err && typeof err === 'object') {
    // axios error with response body
    const axiosErr = err as { response?: { data?: unknown; status?: number } };
    if (axiosErr.response?.data) {
      const data = axiosErr.response.data as Partial<ApiError>;
      if (data.message) return data.message;
      if (data.error)   return data.error;
      if (typeof data === 'string') return data;
    }
    // network / timeout
    const netErr = err as { message?: string };
    if (netErr.message) return netErr.message;
  }
  if (typeof err === 'string') return err;
  return 'Prišlo je do neznane napake.';
}
