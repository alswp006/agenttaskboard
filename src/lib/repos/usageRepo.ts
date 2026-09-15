import type { UsageState } from '@/lib/types';
import { getKSTMonth } from '@/lib/time';
import { readEntity, writeEntity } from './shared';

const KEY = 'atb:usage';

function currentMonth(): string {
  return getKSTMonth(new Date());
}

function isUsageState(v: unknown): v is UsageState {
  return typeof v === 'object' && v !== null && typeof (v as UsageState).month === 'string';
}

export const usageRepo = {
  get(): UsageState {
    const month = currentMonth();
    const usage = readEntity<UsageState>(KEY, { month, runCount: 0 }, isUsageState);

    if (usage.month !== month) {
      const reset: UsageState = { month, runCount: 0 };
      writeEntity(KEY, reset);
      return reset;
    }

    return usage;
  },

  addRun(): UsageState {
    const usage = usageRepo.get();
    const updated: UsageState = { month: usage.month, runCount: usage.runCount + 1 };
    writeEntity(KEY, updated);
    return updated;
  },
};
