/** /runs 진입 시 서버 동기화 + 월 한도 초과 시 예약 실행 중지 (SPEC F6 AC-1·AC-6·AC-7) */
import { useCallback, useEffect, useState } from 'react';
import { RUN_LIMIT } from '@/lib/types';
import { flowRepo } from '@/lib/repos/flowRepo';
import { usageRepo } from '@/lib/repos/usageRepo';
import { planRepo } from '@/lib/repos/planRepo';
import { syncService } from '@/services/syncService';
import { scheduleService } from '@/services/scheduleService';
import { useAppState } from '@/hooks/AppStateContext';
import { useAppToast } from '@/hooks/ToastProvider';

export type RunSyncStatus = 'syncing' | 'idle' | 'error';

const SYNC_FAILED_MESSAGE = '최신 실행 기록을 불러오지 못했어요';

export interface UseRunSyncResult {
  status: RunSyncStatus;
  retry: () => void;
  quotaExceeded: boolean;
  dismissQuotaExceeded: () => void;
}

// 동기화 후 월 한도를 넘겼으면 예약(스케줄) 트리거를 쓰는 활성 플로우를 모두 해제한다.
async function stopScheduledRunsIfOverQuota(): Promise<boolean> {
  const plan = planRepo.get();
  const limit = RUN_LIMIT[plan.tier];
  if (limit === null) return false;

  const usage = usageRepo.get();
  if (usage.runCount < limit) return false;

  const scheduled = flowRepo.list().filter((flow) => flow.enabled && flow.trigger.type !== 'manual');
  if (scheduled.length === 0) return false;

  await Promise.all(
    scheduled.map((flow) => scheduleService.disable(flow.id).catch(() => {})),
  );
  return true;
}

export function useRunSync(): UseRunSyncResult {
  const { runs, refresh } = useAppState();
  const { showToast } = useAppToast();
  const [status, setStatus] = useState<RunSyncStatus>('syncing');
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const sync = useCallback(async () => {
    const hadCache = runs.length > 0;
    setStatus('syncing');
    try {
      await syncService.sync();
      refresh();

      const stopped = await stopScheduledRunsIfOverQuota();
      if (stopped) {
        refresh();
        setQuotaExceeded(true);
      }

      setStatus('idle');
    } catch {
      setStatus('error');
      if (hadCache) {
        showToast(SYNC_FAILED_MESSAGE, 'top');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, showToast]);

  useEffect(() => {
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    retry: sync,
    quotaExceeded,
    dismissQuotaExceeded: () => setQuotaExceeded(false),
  };
}
