import type { Action, AiTask, FlowDraft, Weekday } from '@/lib/types';

const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
};

const AI_TASK_LABEL: Record<AiTask, string> = {
  summarize: '요약',
  classify: '분류',
  translate: '번역',
  custom: '사용자 지정',
};

const LANGUAGE_LABEL: Record<'ko' | 'en' | 'ja' | 'zh', string> = {
  ko: '한국어',
  en: '영어',
  ja: '일본어',
  zh: '중국어',
};

const ACTION_LABEL: Record<Action['type'], string> = {
  in_app: '인앱 알림',
  slack_webhook: '슬랙 전송',
  google_sheet_append: '시트 저장',
};

function formatTrigger(draft: FlowDraft): string {
  const { trigger } = draft;
  if (trigger.type === 'manual') return '수동 실행';
  if (trigger.type === 'daily') return `매일 ${trigger.time}`;
  const days = trigger.days.map((day) => WEEKDAY_LABEL[day]).join('·');
  return `매주 ${days} ${trigger.time}`;
}

function formatAiStep(draft: FlowDraft): string {
  const { task, targetLanguage } = draft.aiStep;
  if (task === 'translate' && targetLanguage) {
    return `${AI_TASK_LABEL[task]} · ${LANGUAGE_LABEL[targetLanguage]}`;
  }
  return AI_TASK_LABEL[task];
}

function formatActions(draft: FlowDraft): string {
  const [first, ...rest] = draft.actions;
  if (!first) return '';
  const label = ACTION_LABEL[first.type];
  return rest.length > 0 ? `${label} 외 ${rest.length}개` : label;
}

// '매주 월·수 18:00 · 요약 · 슬랙 전송 외 1개' 형태의 한 줄 요약을 만든다.
export function format(draft: FlowDraft): string {
  return [formatTrigger(draft), formatAiStep(draft), formatActions(draft)].join(' · ');
}

// contract.ts의 formatDurationFn 구현체. 1분 미만은 '3.2초', 1분 이상은 '1분 20초'.
export function formatDuration(ms: number): string {
  const clampedMs = Math.max(0, ms);
  if (clampedMs < 60_000) {
    return `${(clampedMs / 1000).toFixed(1)}초`;
  }
  const minutes = Math.floor(clampedMs / 60_000);
  const seconds = Math.round((clampedMs % 60_000) / 1000);
  return `${minutes}분 ${seconds}초`;
}
