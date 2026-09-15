/** 플로우 즉시 실행 — 한도 확인 → POST /api/runs → 로그 저장 → 사용량·Flow 갱신 (SPEC F5 AC-1~4) */
import type { RunLog } from '@/lib/types';
import { RUN_LIMIT } from '@/lib/types';
import { flowRepo } from '@/lib/repos/flowRepo';
import { runRepo } from '@/lib/repos/runRepo';
import { usageRepo } from '@/lib/repos/usageRepo';
import { planRepo } from '@/lib/repos/planRepo';
import { generateRunId } from '@/lib/time';
import { ERROR_CODES } from '@/lib/errors';
import { ApiError } from '@/api/client';
import { startRun } from '@/api/endpoints';

export const runService = {
  async runNow(flowId: string): Promise<RunLog> {
    const plan = planRepo.get();
    const limit = RUN_LIMIT[plan.tier];
    const usage = usageRepo.get();
    if (limit !== null && usage.runCount >= limit) {
      throw new ApiError('QUOTA_EXCEEDED', ERROR_CODES.QUOTA_EXCEEDED);
    }

    const flow = flowRepo.get(flowId);
    if (!flow) throw new Error('플로우를 찾을 수 없어요');

    const run = await startRun(generateRunId(), flow, 'manual');

    runRepo.add(run);
    usageRepo.addRun();
    flowRepo.patch(flowId, { lastRunAt: run.startedAt, lastRunStatus: run.status });

    return run;
  },
};

/** 플로우 즉시 실행 — runService.runNow의 별칭 export (contract.ts executeFlowFn 계약) */
export async function executeFlow(flowId: string): Promise<RunLog> {
  return runService.runNow(flowId);
}
