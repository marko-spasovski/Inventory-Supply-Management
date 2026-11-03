import { useAuthStore } from '@/stores/authStore';
import type { AppRole } from '@erp/domain';

// Returns the authenticated user's resolved role.
export function useRole(): AppRole {
  return useAuthStore((s) => s.role);
}
