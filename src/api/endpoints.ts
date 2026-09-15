/** 외부 API 엔드포인트 5종 (SPEC API Contract 절 대응) */
import type { Flow, RunLog } from '@/lib/types';
import { apiClient, ApiError } from './client';
import {
  GenerateResponse,
  RunResponse,
  ListRunsResponse,
  PutScheduleResponse,
  DeleteScheduleResponse,
  type RunRequest,
  type PutScheduleRequest,
} from './contracts';

function assertValid<T>(guard: { isValid: (v: unknown) => v is T }, data: unknown): T {
  if (!guard.isValid(data)) {
    throw new ApiError('INVALID_RESPONSE', '서버 응답을 처리하지 못했어요');
  }
  return data;
}

export async function generateFlow(prompt: string): Promise<Flow> {
  const data = await apiClient.post('/api/flows/generate', { prompt });
  return assertValid(GenerateResponse, data);
}

export async function startRun(
  flowId: string,
  trigger: RunRequest['trigger'],
): Promise<RunLog> {
  const data = await apiClient.post('/api/runs', { flowId, trigger });
  return assertValid(RunResponse, data);
}

export async function listRuns(
  since: string,
  limit = 100,
): Promise<ListRunsResponse> {
  const params = new URLSearchParams({ since, limit: String(limit) });
  const data = await apiClient.get(`/api/runs?${params.toString()}`);
  return assertValid(ListRunsResponse, data);
}

export async function updateSchedule(
  flowId: string,
  trigger: PutScheduleRequest,
): Promise<PutScheduleResponse> {
  const data = await apiClient.put(`/api/schedules/${flowId}`, trigger);
  return assertValid(PutScheduleResponse, data);
}

export async function deleteSchedule(flowId: string): Promise<DeleteScheduleResponse> {
  const data = await apiClient.delete(`/api/schedules/${flowId}`);
  return assertValid(DeleteScheduleResponse, data);
}
