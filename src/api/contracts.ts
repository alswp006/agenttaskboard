/** API Contract 타입 — 외부 API 요청/응답 형태 (SPEC API Contract 절 대응) */
import type { Flow, RunLog, Trigger } from '@/lib/types';

export interface GenerateResponse extends Flow {}
export const GenerateResponse = {
  isValid: (v: unknown): v is GenerateResponse =>
    !!v &&
    typeof v === 'object' &&
    typeof (v as any).id === 'string' &&
    typeof (v as any).name === 'string',
};

export interface RunRequest {
  flowId: string;
  trigger: 'manual' | 'schedule';
}

export interface RunResponse extends RunLog {}
export const RunResponse = {
  isValid: (v: unknown): v is RunResponse =>
    !!v &&
    typeof v === 'object' &&
    typeof (v as any).id === 'string' &&
    typeof (v as any).status === 'string',
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

/** PUT /api/schedules/:flowId 요청 — Trigger 계약 재사용 */
export type PutScheduleRequest = Trigger;

export interface PutScheduleResponse {
  nextRunAt: string;
}
export const PutScheduleResponse = {
  isValid: (v: unknown): v is PutScheduleResponse =>
    !!v && typeof v === 'object' && typeof (v as any).nextRunAt === 'string',
};

export interface DeleteScheduleResponse {
  success: boolean;
}
export const DeleteScheduleResponse = {
  isValid: (v: unknown): v is DeleteScheduleResponse =>
    !!v && typeof v === 'object' && typeof (v as any).success === 'boolean',
};
