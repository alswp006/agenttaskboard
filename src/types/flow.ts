export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type HHmm = string; // /^([01]\d|2[0-3]):(00|30)$/ — 30분 단위

export type Trigger =
  | { type: 'manual' }
  | { type: 'daily'; time: HHmm }
  | { type: 'weekly'; days: Weekday[]; time: HHmm }; // days.length 1~7, 중복 없음

export type InputSource =
  | { type: 'text'; text: string }                            // 1~2000자
  | { type: 'google_sheet'; sheetUrl: string; range: string } // range: /^[A-Z]{1,3}[0-9]{1,5}:[A-Z]{1,3}[0-9]{1,5}$/
  | { type: 'news_keyword'; keyword: string };                // 1~20자

export type AiTask = 'summarize' | 'classify' | 'translate' | 'custom';
export interface AiStep {
  task: AiTask;
  instruction: string;                               // 0~500자. classify·custom은 1자 이상 필수
  targetLanguage: 'ko' | 'en' | 'ja' | 'zh' | null;  // translate일 때 필수, 그 외 null
}

export type Action =
  | { type: 'in_app' }
  | { type: 'slack_webhook'; webhookUrl: string }                  // /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9\/_-]+$/
  | { type: 'google_sheet_append'; sheetUrl: string; sheetName: string }; // sheetUrl: /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]+/, sheetName 1~50자
// 'kakao_talk' | 'naver_calendar' 은 MVP에서 "준비 중" 표시만 하고 타입에는 포함하지 않음

export interface FlowDraft {
  name: string;         // trim 후 1~30자
  input: InputSource;
  trigger: Trigger;
  aiStep: AiStep;
  actions: Action[];    // 1~3개, 배열 순서 = 실행 순서
}

export type RunStatus = 'success' | 'failed';

export interface Flow extends FlowDraft {
  id: string;                        // 'flow_xxxxxxxx'
  source: 'manual' | 'ai' | 'template';
  templateId: string | null;
  enabled: boolean;                  // 서버 스케줄 등록 여부 (manual 트리거면 항상 false)
  nextRunAt: string | null;          // ISO, 서버 응답값
  lastRunAt: string | null;          // ISO
  lastRunStatus: RunStatus | null;
  createdAt: string;                 // ISO
  updatedAt: string;                 // ISO
}
