/**
 * usePlan — subscription plan gate hook.
 *
 * Usage:
 *   const { plan, isBasic, isFree } = usePlan();
 *   if (!isBasic) return <UpgradePrompt />;
 */

import { useAuthStore } from '../store/authStore';

export function usePlan() {
  const plan = useAuthStore((s) => s.plan);

  return {
    plan,
    isFree: plan === 'FREE',
    isBasic: plan === 'BASIC',
  };
}
