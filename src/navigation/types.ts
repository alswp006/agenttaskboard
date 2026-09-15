import type { FlowDraft } from '@/types/flow';

export type BuilderLocationState =
  | { draft: FlowDraft; source: 'ai' | 'template'; templateId: string | null; missingFields: string[] }
  | null;
export type GenerateLocationState = { prompt: string } | null;
export type GenerateResultLocationState = { prompt: string; draft: FlowDraft; missingFields: string[] } | null;
export type RunsLocationState = { filter: 'all' | 'success' | 'failed' } | null;
export type PlanLocationState = { reason: 'quota_exceeded' } | null;

/** 경로별 navigate() state 계약 — 화면 패킷은 이 맵으로 자기 경로의 state 타입을 찾는다 */
export type RouteState = {
  '/flows/new': BuilderLocationState;
  '/generate': GenerateLocationState;
  '/generate/result': GenerateResultLocationState;
  '/runs': RunsLocationState;
  '/plan': PlanLocationState;
};
