import type { FlowDraft } from '@/lib/types';
import type { Flow as ContractFlow } from '@/lib/contract';

const HHMM_RE = /^([01]\d|2[0-3]):(00|30)$/;
const SLACK_WEBHOOK_RE = /^https:\/\/hooks\.slack\.com\/services\/.+/;
const GOOGLE_SHEET_URL_RE = /^https:\/\/docs\.google\.com\/spreadsheets\/.+/;
const SHEET_RANGE_RE = /^[A-Z]+\d+:[A-Z]+\d+$/;

export interface ValidateDraftResult {
  valid: boolean;
  errors: Record<string, string>;
}

// draft를 필드별로 검증한다. missingFields에 있는 에러 키는 결과에서 제외한다
// (템플릿처럼 사용자가 나중에 채울 필드를 미리 걸러내는 용도).
export function validateDraft(draft: FlowDraft, missingFields: string[] = []): ValidateDraftResult {
  const errors: Record<string, string> = {};

  const trimmedName = draft.name.trim();
  if (trimmedName.length === 0) {
    errors.name = '플로우 이름을 입력해주세요';
  } else if (trimmedName.length > 30) {
    errors.name = '이름은 30자 이내로 입력해주세요';
  }

  const { trigger } = draft;
  if (trigger.type === 'daily') {
    if (!HHMM_RE.test(trigger.time)) {
      errors['trigger.time'] = '실행 시간을 선택해주세요';
    }
  } else if (trigger.type === 'weekly') {
    const uniqueDays = new Set(trigger.days);
    if (trigger.days.length === 0 || uniqueDays.size !== trigger.days.length) {
      errors['trigger.days'] = '요일을 1개 이상 선택해주세요';
    }
    if (!HHMM_RE.test(trigger.time)) {
      errors['trigger.time'] = '실행 시간을 선택해주세요';
    }
  }

  const { input } = draft;
  if (input.type === 'text') {
    if (input.text.trim().length === 0) {
      errors['input.text'] = '처리할 텍스트를 입력해주세요';
    }
  } else if (input.type === 'google_sheet') {
    if (!GOOGLE_SHEET_URL_RE.test(input.sheetUrl)) {
      errors['input.sheetUrl'] = '구글 스프레드시트 주소 형식이 올바르지 않아요';
    }
    if (!SHEET_RANGE_RE.test(input.range)) {
      errors['input.range'] = '범위는 A1:D50 형식으로 입력해주세요';
    }
  } else if (input.type === 'news_keyword') {
    if (input.keyword.trim().length === 0) {
      errors['input.keyword'] = '뉴스 키워드를 입력해주세요';
    }
  }

  const { task, instruction, targetLanguage } = draft.aiStep;
  if (task === 'custom' && instruction.trim().length === 0) {
    errors['aiStep.instruction'] = 'AI에게 시킬 일을 입력해주세요';
  } else if (task === 'classify' && instruction.trim().length === 0) {
    errors['aiStep.instruction'] = '분류 기준을 입력해주세요';
  } else if (instruction.length > 500) {
    errors['aiStep.instruction'] = '지시문은 500자 이내로 입력해주세요';
  }
  if (task === 'translate' && !targetLanguage) {
    errors['aiStep.targetLanguage'] = '번역할 언어를 선택해주세요';
  }

  if (draft.actions.length === 0) {
    errors.actions = '액션을 1개 이상 추가해주세요';
  } else if (draft.actions.length > 3) {
    errors.actions = '액션은 3개까지 추가할 수 있어요';
  }

  draft.actions.forEach((action, i) => {
    if (action.type === 'slack_webhook') {
      if (!SLACK_WEBHOOK_RE.test(action.webhookUrl)) {
        errors[`actions.${i}.webhookUrl`] = '슬랙 Webhook 주소 형식이 올바르지 않아요';
      }
    } else if (action.type === 'google_sheet_append') {
      if (!GOOGLE_SHEET_URL_RE.test(action.sheetUrl)) {
        errors[`actions.${i}.sheetUrl`] = '구글 스프레드시트 주소 형식이 올바르지 않아요';
      }
      if (action.sheetName.trim().length === 0) {
        errors[`actions.${i}.sheetName`] = '시트 이름을 입력해주세요';
      }
    }
  });

  for (const field of missingFields) {
    delete errors[field];
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// contract.ts의 validateFlowFn 구현체. FlowDraft가 아닌 contract.ts의 제네릭 Flow
// 형태(trigger.type/config, actions[].type/config)를 그대로 검증한다.
export function validateFlow(
  flow: Omit<ContractFlow, 'id' | 'createdAt' | 'updatedAt'>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const trimmedName = flow.name.trim();
  if (trimmedName.length === 0) {
    errors.push('플로우 이름을 입력해주세요');
  } else if (trimmedName.length > 30) {
    errors.push('이름은 30자 이내로 입력해주세요');
  }

  if (!flow.trigger || flow.trigger.type.trim().length === 0) {
    errors.push('트리거 유형을 선택해주세요');
  }

  if (!Array.isArray(flow.actions) || flow.actions.length === 0) {
    errors.push('액션을 1개 이상 추가해주세요');
  } else if (flow.actions.length > 3) {
    errors.push('액션은 3개까지 추가할 수 있어요');
  } else {
    flow.actions.forEach((action, i) => {
      if (!action.type || action.type.trim().length === 0) {
        errors.push(`${i + 1}번째 액션 유형을 선택해주세요`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}
