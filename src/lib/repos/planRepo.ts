import type { PlanState } from '@/lib/types';
import { readEntity, writeEntity } from './shared';

const KEY = 'atb:plan';

const DEFAULT_PLAN: PlanState = { tier: 'free', purchasedAt: null, expiresAt: null };

export const planRepo = {
  get(): PlanState {
    return readEntity<PlanState>(KEY, DEFAULT_PLAN);
  },

  set(plan: PlanState): void {
    writeEntity(KEY, plan);
  },
};
