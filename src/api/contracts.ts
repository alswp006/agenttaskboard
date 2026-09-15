/** API Contract 타입 — 외부 API 요청/응답 형태 (SPEC API Contract 절 대응) */
import type { Flow, FlowDraft, RunLog } from '@/lib/types';

function isValidTriggerType(v: unknown): boolean {
  return v === 'manual' || v === 'daily' || v === 'weekly';
}

export interface GenerateResponse {
  draft: FlowDraft;
  missingFields: string[];
}
export const GenerateResponse = {
  isValid: (v: unknown): v is GenerateResponse =>
    !!v &&
    typeof v === 'object' &&
    !!(v as any).draft &&
    typeof (v as any).draft === 'object' &&
    Array.isArray((v as any).draft.actions) &&
    (v as any).draft.actions.length > 0 &&
    isValidTriggerType((v as any).draft.trigger?.type) &&
    Array.isArray((v as any).missingFields),
};

export interface RunRequest {
  runId: string;
  flow: Flow;
  trigger: 'manual';
}

export interface RunResponse {
  run: RunLog;
}
export const RunResponse = {
  isValid: (v: unknown): v is RunResponse =>
    !!v &&
    typeof v === 'object' &&
    !!(v as any).run &&
    typeof (v as any).run === 'object' &&
    typeof (v as any).run.id === 'string' &&
    typeof (v as any).run.status === 'string',
};

export interface ListRunsResponse {
  runs: RunLog[];
  total: number;
}
export const ListRunsResponse = {
  isValid: (v: unknown): v is ListRunsResponse =>
    !!v &&
    typeof v === 'object' &&
    Array.isArray((v as any).runs) &&
    typeof (v as any).total === 'number',
};

/** PUT /api/schedules/:flowId 요청 */
export interface PutScheduleRequest {
  flow: Flow;
  timezone: 'Asia/Seoul';
}

export interface PutScheduleResponse {
  flowId: string;
  nextRunAt: string;
}
export const PutScheduleResponse = {
  isValid: (v: unknown): v is PutScheduleResponse =>
    !!v &&
    typeof v === 'object' &&
    typeof (v as any).flowId === 'string' &&
    typeof (v as any).nextRunAt === 'string',
};

export interface DeleteScheduleResponse {
  flowId: string;
  deleted: true;
}
export const DeleteScheduleResponse = {
  isValid: (v: unknown): v is DeleteScheduleResponse =>
    !!v &&
    typeof v === 'object' &&
    typeof (v as any).flowId === 'string' &&
    (v as any).deleted === true,
};
