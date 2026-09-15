/** 서버 실행 기록 동기화 — since 커서 → GET /api/runs → 중복 제거 → Flow.lastRun* 갱신 (SPEC F6 AC-1) */
import type { RunLog } from '@/lib/types';
import { flowRepo } from '@/lib/repos/flowRepo';
import { runRepo } from '@/lib/repos/runRepo';
import { usageRepo } from '@/lib/repos/usageRepo';
import { listRuns } from '@/api/endpoints';

export interface SyncResult {
  synced: number;
}

export const syncService = {
  async sync(since?: string): Promise<SyncResult> {
    const cursor = since ?? runRepo.getSyncMetadata().lastSyncedAt ?? new Date(0).toISOString();

    const { runs } = await listRuns(cursor, 100);

    const latestByFlow = new Map<string, RunLog>();
    let synced = 0;

    for (const run of runs) {
      const isNew = runRepo.get(run.id) === null;
      if (isNew) {
        runRepo.add(run);
        usageRepo.addRun();
        synced++;
      }

      const latest = latestByFlow.get(run.flowId);
      if (!latest || run.startedAt > latest.startedAt) {
        latestByFlow.set(run.flowId, run);
      }
    }

    for (const [flowId, latestRun] of latestByFlow) {
      if (flowRepo.get(flowId)) {
        flowRepo.patch(flowId, { lastRunAt: latestRun.startedAt, lastRunStatus: latestRun.status });
      }
    }

    // 100건이 꽉 찼다는 건 다음 페이지가 더 있다는 뜻 — 마지막 항목의 startedAt을 다음 커서로 저장
    if (runs.length === 100) {
      runRepo.setSyncMetadata({ lastSyncedAt: runs[runs.length - 1].startedAt });
    }

    return { synced };
  },
};

const RUN_POLL_INTERVAL_MS = 4000;

/**
 * Run 실시간 구독 (contract.ts subscribeToRunFn 계약) — 실행은 POST /api/runs 응답으로
 * 즉시 완료되므로(status는 항상 success|failed 확정값) 서버 푸시가 아니라, 스케줄 실행처럼
 * 다른 경로로 생긴 최신 기록을 반영하도록 주기적으로 syncService.sync()를 돌려 로컬
 * runRepo를 갱신하고, 대상 run이 새로 생기거나 바뀌면 콜백한다.
 */
export function subscribeToRun(runId: string, callback: (run: RunLog) => void): () => void {
  let lastSeen: string | null = null;
  let disposed = false;

  const notifyIfChanged = () => {
    const current = runRepo.get(runId);
    if (!current) return;
    const snapshot = JSON.stringify(current);
    if (snapshot !== lastSeen) {
      lastSeen = snapshot;
      callback(current);
    }
  };

  notifyIfChanged();

  const timer = setInterval(() => {
    if (disposed) return;
    syncService
      .sync()
      .catch(() => {
        // 동기화 실패는 조용히 무시 — 다음 폴링에서 재시도
      })
      .finally(() => {
        if (!disposed) notifyIfChanged();
      });
  }, RUN_POLL_INTERVAL_MS);

  return () => {
    disposed = true;
    clearInterval(timer);
  };
}
