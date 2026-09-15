export type PlanTier = 'free' | 'starter' | 'pro';
export interface PlanState { tier: PlanTier; purchasedAt: string | null; expiresAt: string | null; }
export interface UsageState { month: string; runCount: number; } // month: 'YYYY-MM' (KST)
export const RUN_LIMIT: Record<PlanTier, number | null> = { free: 100, starter: 1000, pro: null }; // null = 무제한
