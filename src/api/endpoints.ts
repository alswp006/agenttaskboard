/** 외부 API 엔드포인트 5종 (SPEC API Contract 절 대응) */
import type { Flow, RunLog } from '@/lib/types';
import { apiClient, ApiError } from './client';
import {
  GenerateResponse,
  RunResponse,
  ListRunsResponse,
  PutScheduleResponse,
  DeleteScheduleResponse,
} from './contracts';

const GENERATE_TIMEOUT_MS = 20000;

function assertValid<T>(guard: { isValid: (v: unknown) => v is T }, data: unknown): T {
  if (!guard.isValid(data)) {
    throw new ApiError('INVALID_RESPONSE', '서버 응답을 처리하지 못했어요');
  }
  return data;
}

export async function generateFlow(prompt: string): Promise<GenerateResponse> {
  const data = await apiClient.post(
    '/api/flows/generate',
    { prompt },
    { timeoutMs: GENERATE_TIMEOUT_MS },
  );
  if (!GenerateResponse.isValid(data)) {
    throw new ApiError(
      'INVALID_RESPONSE',
      '아직 지원하지 않는 요청이에요. 언제·무엇을·어디로 보낼지 드러나게 다시 적어주세요',
      null,
      'UNSUPPORTED_REQUEST',
    );
  }
  return data;
}

export async function startRun(runId: string, flow: Flow, trigger: 'manual'): Promise<RunLog> {
  const data = await apiClient.post('/api/runs', { runId, flow, trigger });
  return assertValid(RunResponse, data).run;
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
  flow: Flow,
): Promise<PutScheduleResponse> {
  const data = await apiClient.put(`/api/schedules/${flowId}`, { flow, timezone: 'Asia/Seoul' });
  return assertValid(PutScheduleResponse, data);
}

export async function deleteSchedule(flowId: string): Promise<DeleteScheduleResponse> {
  const data = await apiClient.delete(`/api/schedules/${flowId}`);
  return assertValid(DeleteScheduleResponse, data);
}
