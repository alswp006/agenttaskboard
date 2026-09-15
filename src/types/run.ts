import type { RunStatus } from '@/types/flow';

export type RunErrorCode =
  | 'AI_FAILED' | 'SLACK_WEBHOOK_FAILED' | 'SHEET_ACCESS_DENIED'
  | 'NEWS_FETCH_FAILED' | 'NETWORK_ERROR' | 'TIMEOUT';

export interface StepResult {
  stage: 'trigger' | 'ai' | 'action';
  label: string;              // 예: "구글 시트 A1:D50 읽기", "요약", "슬랙 전송"
  status: 'success' | 'failed' | 'skipped';
  message: string | null;     // 최대 200자
}

export interface RunLog {
  id: string;                        // 'run_xxxxxxxxxxxx' (클라이언트가 생성해 서버에 전달)
  flowId: string;
  flowName: string;                  // 실행 시점 스냅샷
  trigger: 'manual' | 'schedule';
  status: RunStatus;
  startedAt: string;                 // ISO
  finishedAt: string | null;         // ISO
  durationMs: number | null;
  aiOutput: string | null;           // 최대 4000자
  steps: StepResult[];               // 최대 5개 (trigger 1 + ai 1 + action 최대 3)
  errorCode: RunErrorCode | null;
  errorMessage: string | null;       // 최대 200자
}
