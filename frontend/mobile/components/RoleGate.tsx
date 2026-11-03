import React from 'react';
import { hasFeature, type FeatureKey } from '@erp/domain';
import { useRole } from '@/hooks/useRole';

interface Props {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Renders children only if the current user's role grants the requested feature.
// Never throws — renders fallback (or nothing) when access is denied.
export function RoleGate({ feature, children, fallback = null }: Props): React.ReactElement | null {
  const role = useRole();
  if (!hasFeature(role, feature)) return fallback as React.ReactElement | null;
  return <>{children}</>;
}
