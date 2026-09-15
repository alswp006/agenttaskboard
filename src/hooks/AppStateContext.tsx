import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Flow, RunLog, PlanState, UsageState } from '@/lib/types';
import { flowRepo } from '@/lib/repos/flowRepo';
import { runRepo } from '@/lib/repos/runRepo';
import { usageRepo } from '@/lib/repos/usageRepo';
import { planRepo } from '@/lib/repos/planRepo';
import { clientRepo } from '@/lib/repos/clientRepo';
import { readSafeStorage } from '@/lib/safeStorage';

type CorruptionKey = 'flows' | 'usage' | 'plan';

interface AppState {
  flows: Flow[];
  runs: RunLog[];
  usage: UsageState;
  plan: PlanState;
  isFree: boolean;
  planExpiredOnBoot: boolean;
  consumeCorruption: (key: CorruptionKey) => boolean;
  refresh: () => void;
}

const AppStateCtx = createContext<AppState | null>(null);

const DEFAULT_PLAN: PlanState = { tier: 'free', purchasedAt: null, expiresAt: null };

function isPlanExpired(plan: PlanState): boolean {
  return plan.expiresAt !== null && new Date(plan.expiresAt).getTime() < Date.now();
}

// 만료된 이용권은 부팅 시 한 번만 free로 되돌리고, 그 사실을 소비자가 알 수 있게 반환한다.
function loadPlan(): { plan: PlanState; expiredOnBoot: boolean } {
  const current = planRepo.get();
  if (isPlanExpired(current)) {
    planRepo.set(DEFAULT_PLAN);
    return { plan: DEFAULT_PLAN, expiredOnBoot: true };
  }
  return { plan: current, expiredOnBoot: false };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  // clientId가 없으면 여기서 생성 — 첫 마운트 1회.
  useState(() => clientRepo.getClientId());

  const initialPlanRef = useRef<{ plan: PlanState; expiredOnBoot: boolean } | null>(null);
  if (initialPlanRef.current === null) {
    initialPlanRef.current = loadPlan();
  }

  const [flows, setFlows] = useState<Flow[]>(() => flowRepo.list());
  const [runs, setRuns] = useState<RunLog[]>(() => runRepo.list());
  const [usage, setUsage] = useState<UsageState>(() => usageRepo.get());
  const [plan, setPlan] = useState<PlanState>(() => initialPlanRef.current!.plan);
  const planExpiredOnBoot = initialPlanRef.current.expiredOnBoot;

  // 부팅 시 각 엔티티가 손상 복구됐는지 1회 기록 — repo는 내부적으로 복구하고 알려주지 않으므로
  // 같은 키를 직접 한 번 더 읽어 corrupted 플래그만 뽑아둔다.
  const corruptedRef = useRef<Record<CorruptionKey, boolean>>({
    flows: readSafeStorage('atb:flows', []).corrupted,
    usage: readSafeStorage('atb:usage', null).corrupted,
    plan: readSafeStorage('atb:plan', null).corrupted,
  });

  const consumeCorruption = useCallback((key: CorruptionKey) => {
    const value = corruptedRef.current[key];
    corruptedRef.current[key] = false;
    return value;
  }, []);

  const refresh = useCallback(() => {
    setFlows(flowRepo.list());
    setRuns(runRepo.list());
    setUsage(usageRepo.get());
    setPlan(planRepo.get());
  }, []);

  const value = useMemo<AppState>(
    () => ({
      flows,
      runs,
      usage,
      plan,
      isFree: plan.tier === 'free',
      planExpiredOnBoot,
      consumeCorruption,
      refresh,
    }),
    [flows, runs, usage, plan, planExpiredOnBoot, consumeCorruption, refresh],
  );

  return <AppStateCtx.Provider value={value}>{children}</AppStateCtx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateCtx);
  if (!ctx) {
    throw new Error('useAppState는 AppStateProvider 안에서만 사용할 수 있어요');
  }
  return ctx;
}
