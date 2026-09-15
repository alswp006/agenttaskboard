import type { FlowDraft } from '@/types/flow';

export type BuilderLocationState =
  | { draft: FlowDraft; source: 'ai' | 'template'; templateId: string | null; missingFields: string[] }
  | null;
export type GenerateLocationState = { prompt: string } | null;
export type GenerateResultLocationState = { prompt: string; draft: FlowDraft; missingFields: string[] } | null;
export type RunsLocationState = { filter: 'all' | 'success' | 'failed' } | null;
export type PlanLocationState = { reason: 'quota_exceeded' } | null;
