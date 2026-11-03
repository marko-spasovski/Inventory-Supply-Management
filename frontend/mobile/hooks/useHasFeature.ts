import { hasFeature, type FeatureKey } from '@erp/domain';
import { useRole } from '@/hooks/useRole';

// Returns true if the current user's role grants access to the given feature.
export function useHasFeature(feature: FeatureKey): boolean {
  const role = useRole();
  return hasFeature(role, feature);
}
