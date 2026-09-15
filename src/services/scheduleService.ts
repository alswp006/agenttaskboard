/** 스케줄 등록·해제 — manual 트리거는 PUT 대신 DELETE로 정리, 실패 시 enabled 유지 (SPEC F5 AC-5~7) */
import type { Flow } from '@/lib/types';
import { RUN_LIMIT } from '@/lib/types';
import { flowRepo } from '@/lib/repos/flowRepo';
import { usageRepo } from '@/lib/repos/usageRepo';
import { planRepo } from '@/lib/repos/planRepo';
import { ERROR_CODES } from '@/lib/errors';
import { ApiError } from '@/api/client';
import { updateSchedule, deleteSchedule } from '@/api/endpoints';

export const scheduleService = {
  async enable(flowId: string): Promise<Flow> {
    const flow = flowRepo.get(flowId);
    if (!flow) throw new Error('플로우를 찾을 수 없어요');

    // manual 트리거는 스케줄이 없다 — 등록(PUT) 대신 해제(DELETE)로 정리한다
    if (flow.trigger.type === 'manual') {
      return scheduleService.disable(flowId);
    }

    const plan = planRepo.get();
    const limit = RUN_LIMIT[plan.tier];
    const usage = usageRepo.get();
    if (limit !== null && usage.runCount >= limit) {
      throw new ApiError('QUOTA_EXCEEDED', ERROR_CODES.QUOTA_EXCEEDED);
    }

    const response = await updateSchedule(flowId, flow.trigger);
    return flowRepo.patch(flowId, { enabled: true, nextRunAt: response.nextRunAt });
  },

  async disable(flowId: string): Promise<{ success: boolean } & Flow> {
    const flow = flowRepo.get(flowId);
    if (!flow) throw new Error('플로우를 찾을 수 없어요');

    try {
      await deleteSchedule(flowId);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NOT_FOUND') {
        // 404는 이미 꺼진 것으로 간주 — enabled:false 정리를 계속한다
      } else if (err instanceof ApiError) {
        throw new ApiError(err.code, `스케줄 설정을 변경할 수 없습니다: ${err.message}`, err.status);
      } else {
        throw err;
      }
    }

    const updated = flowRepo.patch(flowId, { enabled: false, nextRunAt: null });
    return { success: true, ...updated };
  },
};
