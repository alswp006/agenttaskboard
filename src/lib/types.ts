/** Domain Types — Shared across all layers */

// Common types
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type HHmm = string; // /^([01]\d|2[0-3]):(00|30)$/ — 30분 단위

export type Trigger =
  | { type: 'manual' }
  | { type: 'daily'; time: HHmm }
  | { type: 'weekly'; days: Weekday[]; time: HHmm };

export type InputSource =
  | { type: 'text'; text: string }
  | { type: 'google_sheet'; sheetUrl: string; range: string }
  | { type: 'news_keyword'; keyword: string };

export type AiTask = 'summarize' | 'classify' | 'translate' | 'custom';

export interface AiStep {
  task: AiTask;
  instruction: string;
  targetLanguage: 'ko' | 'en' | 'ja' | 'zh' | null;
}

export type Action =
  | { type: 'in_app' }
  | { type: 'slack_webhook'; webhookUrl: string }
  | { type: 'google_sheet_append'; sheetUrl: string; sheetName: string };

export interface FlowDraft {
  name: string;
  input: InputSource;
  trigger: Trigger;
  aiStep: AiStep;
  actions: Action[];
}

export type RunStatus = 'success' | 'failed';

export interface Flow extends FlowDraft {
  id: string;
  source: 'manual' | 'ai' | 'template';
  templateId: string | null;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: RunStatus | null;
  createdAt: string;
  updatedAt: string;
}

export type RunErrorCode =
  | 'AI_FAILED'
  | 'SLACK_WEBHOOK_FAILED'
  | 'SHEET_ACCESS_DENIED'
  | 'NEWS_FETCH_FAILED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT';

export interface StepResult {
  stage: 'trigger' | 'ai' | 'action';
  label: string;
  status: 'success' | 'failed' | 'skipped';
  message: string | null;
}

export interface RunLog {
  id: string;
  flowId: string;
  flowName: string;
  trigger: 'manual' | 'schedule';
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  aiOutput: string | null;
  steps: StepResult[];
  errorCode: RunErrorCode | null;
  errorMessage: string | null;
}

export type PlanTier = 'free' | 'starter' | 'pro';

export interface PlanState {
  tier: PlanTier;
  purchasedAt: string | null;
  expiresAt: string | null;
}

export interface UsageState {
  month: string; // 'YYYY-MM' (KST)
  runCount: number;
}

export const RUN_LIMIT: Record<PlanTier, number | null> = {
  free: 100,
  starter: 1000,
  pro: null,
};

export interface FlowTemplate {
  id: string;
  title: string;
  description: string;
  category: 'report' | 'alert' | 'data';
  draft: FlowDraft;
  requiredFields: string[];
}
