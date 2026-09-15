import type { RunLog } from '@/lib/types';
import type { Run as ContractRun } from '@/lib/contract';
import { getKSTDayWindow } from '@/lib/time';

export interface SuccessRateResult {
  successCount: number;
  totalCount: number;
  successRate: number;
}

// KST 기준 최근 7일 내 시작된 실행들의 성공률을 계산한다.
export function calculateSuccessRateLastWeek(runs: RunLog[]): SuccessRateResult {
  const { start, end } = getKSTDayWindow(new Date(), 7);
  const startMs = start.getTime();
  const endMs = end.getTime();

  const recent = runs.filter((run) => {
    const startedAtMs = new Date(run.startedAt).getTime();
    return startedAtMs >= startMs && startedAtMs < endMs;
  });

  const successCount = recent.filter((run) => run.status === 'success').length;
  const totalCount = recent.length;
  const successRate = totalCount === 0 ? 0 : successCount / totalCount;

  return { successCount, totalCount, successRate };
}

// contract.ts의 calculateMetricsFn 구현체. contract.ts의 제네릭 Run(status/startedAt/
// completedAt)을 대상으로 전체 건수·성공률·평균 소요시간·마지막 실행 시각을 계산한다.
export function calculateMetrics(runs: ContractRun[]): {
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  lastRun?: string;
} {
  const totalRuns = runs.length;
  if (totalRuns === 0) {
    return { totalRuns: 0, successRate: 0, avgDuration: 0 };
  }

  const successCount = runs.filter((run) => run.status === 'success').length;
  const successRate = successCount / totalRuns;

  const durations = runs
    .filter((run) => run.completedAt)
    .map((run) => new Date(run.completedAt as string).getTime() - new Date(run.startedAt).getTime())
    .filter((duration) => Number.isFinite(duration) && duration >= 0);
  const avgDuration =
    durations.length === 0 ? 0 : durations.reduce((sum, duration) => sum + duration, 0) / durations.length;

  const lastRun = runs.reduce<string | undefined>((latest, run) => {
    if (!latest || new Date(run.startedAt).getTime() > new Date(latest).getTime()) {
      return run.startedAt;
    }
    return latest;
  }, undefined);

  return { totalRuns, successRate, avgDuration, lastRun };
}
