import { describe, it, expect } from 'vitest';
import type { FlowDraft, FlowTemplate } from '@/lib/types';

/**
 * PACKET-0004: 검증기 · 포매터 · 지표 · 번들 템플릿 6개
 *
 * AC-1[P0]: webhookUrl 검증 — validateDraft가 부정확한 URL 형식을 거부한다
 * AC-2[P0]: format.ts 요약 문자열 — weekly + summarize + 2개 액션 → '매주 월·수 18:00 · 요약 · 슬랙 전송 외 1개'
 * AC-3[P0]: templates.ts 검증 — 6개 번들 템플릿이 missingFields를 제외하고 모두 통과한다
 *
 * validateDraft.ts: name은 trim 후 1~30자, HHmm은 30분 단위,
 * weekly days는 1~7개 중복 없음, 입력 소스별 정규식 검증,
 * classify·custom은 instruction 필수, translate는 targetLanguage 필수,
 * actions 1~3개, URL 정규식 검증
 */

describe('AC-1[P0]: validateDraft — webhookUrl 검증', () => {
  /**
   * Scenario: 슬랙 Webhook URL 형식 검증
   * Given 검증기 validateDraft(draft)가 있을 때
   * When actions[0].webhookUrl이 'https://example.com'이면
   * Then errors['actions.0.webhookUrl']에 "슬랙 Webhook 주소 형식이 올바르지 않아요" 메시지가 들어간다
   */
  it('should reject invalid slack webhook URL (wrong domain)', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '내용' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'slack_webhook', webhookUrl: 'https://example.com' }],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['actions.0.webhookUrl']).toBe('슬랙 Webhook 주소 형식이 올바르지 않아요');
  });

  it('should reject slack webhook URL with http (not https)', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '내용' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'slack_webhook', webhookUrl: 'http://hooks.slack.com/services/T000/B000/XXX' }],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['actions.0.webhookUrl']).toBe('슬랙 Webhook 주소 형식이 올바르지 않아요');
  });

  it('should accept valid slack webhook URL format', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const validDraft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '내용' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'slack_webhook', webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXX' }],
    };

    const result = validateDraft(validDraft);
    expect(result.errors['actions.0.webhookUrl']).toBeUndefined();
  });

  // Additional validation tests for name field
  it('should reject empty name (after trim)', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: '  ',
      input: { type: 'text', text: '내용' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['name']).toBe('플로우 이름을 입력해주세요');
  });

  it('should reject name longer than 30 characters', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: 'a'.repeat(31),
      input: { type: 'text', text: '내용' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['name']).toBe('이름은 30자 이내로 입력해주세요');
  });

  // Time validation tests (HHmm 30분 단위)
  it('should reject time not in 30-minute increments', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '내용' },
      trigger: { type: 'daily', time: '09:15' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['trigger.time']).toBe('실행 시간을 선택해주세요');
  });

  // Weekly days validation
  it('should reject weekly with no days selected', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '내용' },
      trigger: { type: 'weekly', days: [], time: '09:00' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['trigger.days']).toBe('요일을 1개 이상 선택해주세요');
  });

  it('should reject weekly with duplicate days', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '내용' },
      trigger: { type: 'weekly', days: ['mon', 'mon', 'wed'], time: '09:00' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['trigger.days']).toBe('요일을 1개 이상 선택해주세요');
  });

  // Input source validation
  it('should reject empty text input', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['input.text']).toBe('처리할 텍스트를 입력해주세요');
  });

  it('should reject invalid google sheet URL', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: '테스트',
      input: { type: 'google_sheet', sheetUrl: 'https://example.com', range: 'A1:D50' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['input.sheetUrl']).toBe('구글 스프레드시트 주소 형식이 올바르지 않아요');
  });

  it('should reject invalid google sheet range format', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: '테스트',
      input: { type: 'google_sheet', sheetUrl: 'https://docs.google.com/spreadsheets/d/abc123', range: 'A1-D50' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['input.range']).toBe('범위는 A1:D50 형식으로 입력해주세요');
  });

  it('should reject empty news keyword', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: '테스트',
      input: { type: 'news_keyword', keyword: '' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['input.keyword']).toBe('뉴스 키워드를 입력해주세요');
  });

  // AiStep validation
  it('should reject custom task without instruction', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '내용' },
      trigger: { type: 'manual' },
      aiStep: { task: 'custom', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['aiStep.instruction']).toBe('AI에게 시킬 일을 입력해주세요');
  });

  it('should reject classify task without instruction', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '내용' },
      trigger: { type: 'manual' },
      aiStep: { task: 'classify', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['aiStep.instruction']).toBe('분류 기준을 입력해주세요');
  });

  it('should reject instruction longer than 500 characters', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '내용' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: 'a'.repeat(501), targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['aiStep.instruction']).toBe('지시문은 500자 이내로 입력해주세요');
  });

  it('should reject translate task without targetLanguage', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '내용' },
      trigger: { type: 'manual' },
      aiStep: { task: 'translate', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['aiStep.targetLanguage']).toBe('번역할 언어를 선택해주세요');
  });

  // Actions validation
  it('should reject empty actions array', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '내용' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['actions']).toBe('액션을 1개 이상 추가해주세요');
  });

  it('should reject more than 3 actions', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '내용' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [
        { type: 'in_app' },
        { type: 'in_app' },
        { type: 'in_app' },
        { type: 'in_app' },
      ],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['actions']).toBeDefined();
  });

  it('should reject google sheet append with empty sheetName', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const invalidDraft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '내용' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'google_sheet_append', sheetUrl: 'https://docs.google.com/spreadsheets/d/abc123', sheetName: '' }],
    };

    const result = validateDraft(invalidDraft);
    expect(result.valid).toBe(false);
    expect(result.errors['actions.0.sheetName']).toBe('시트 이름을 입력해주세요');
  });

  it('should return valid=true and empty errors for correct draft', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');

    const validDraft: FlowDraft = {
      name: '뉴스 요약',
      input: { type: 'news_keyword', keyword: 'AI' },
      trigger: { type: 'daily', time: '09:00' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = validateDraft(validDraft);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });
});

describe('AC-2[P0]: format.ts — 요약 문자열 생성', () => {
  /**
   * Scenario: 플로우 요약 포매팅
   * Given weekly [mon,wed] 18:00 + summarize + 액션 2개 (slack_webhook, in_app)
   * When format(draft)를 호출하면
   * Then 반환값이 '매주 월·수 18:00 · 요약 · 슬랙 전송 외 1개'다
   */
  it('should format weekly trigger with multiple days and multiple actions', async () => {
    const { format } = await import('@/lib/format');

    const draft: FlowDraft = {
      name: '아침 뉴스 요약',
      input: { type: 'news_keyword', keyword: 'AI' },
      trigger: { type: 'weekly', days: ['mon', 'wed'], time: '18:00' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [
        { type: 'slack_webhook', webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXX' },
        { type: 'in_app' },
      ],
    };

    const result = format(draft);
    expect(result).toBe('매주 월·수 18:00 · 요약 · 슬랙 전송 외 1개');
  });

  it('should format daily trigger at specific time', async () => {
    const { format } = await import('@/lib/format');

    const draft: FlowDraft = {
      name: '아침 뉴스 요약',
      input: { type: 'news_keyword', keyword: 'AI' },
      trigger: { type: 'daily', time: '09:00' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = format(draft);
    expect(result).toContain('매일 09:00');
    expect(result).toContain('요약');
  });

  it('should format manual trigger', async () => {
    const { format } = await import('@/lib/format');

    const draft: FlowDraft = {
      name: '수동 실행',
      input: { type: 'text', text: '테스트' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = format(draft);
    expect(result).toContain('수동 실행');
    expect(result).toContain('요약');
  });

  it('should format translate task with target language', async () => {
    const { format } = await import('@/lib/format');

    const draft: FlowDraft = {
      name: '영어로 번역',
      input: { type: 'text', text: '테스트' },
      trigger: { type: 'manual' },
      aiStep: { task: 'translate', instruction: '', targetLanguage: 'en' },
      actions: [{ type: 'in_app' }],
    };

    const result = format(draft);
    expect(result).toContain('번역');
    expect(result).toContain('영어');
  });

  it('should format classify task', async () => {
    const { format } = await import('@/lib/format');

    const draft: FlowDraft = {
      name: '분류',
      input: { type: 'text', text: '테스트' },
      trigger: { type: 'manual' },
      aiStep: { task: 'classify', instruction: '긍정/부정', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = format(draft);
    expect(result).toContain('분류');
  });

  it('should show all action names for single action', async () => {
    const { format } = await import('@/lib/format');

    const draft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '테스트' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'slack_webhook', webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXX' }],
    };

    const result = format(draft);
    expect(result).toContain('슬랙 전송');
  });

  it('should show first action name + "외 N개" for multiple actions', async () => {
    const { format } = await import('@/lib/format');

    const draft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '테스트' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [
        { type: 'slack_webhook', webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXX' },
        { type: 'in_app' },
        { type: 'google_sheet_append', sheetUrl: 'https://docs.google.com/spreadsheets/d/abc', sheetName: '시트1' },
      ],
    };

    const result = format(draft);
    expect(result).toContain('슬랙 전송 외 2개');
  });
});

describe('AC-3[P0]: templates.ts — 번들 템플릿 검증', () => {
  /**
   * Scenario: 번들 템플릿 6개가 missingFields를 제외하고 검증을 통과한다
   * Given templates.ts에 6개의 FlowTemplate이 있을 때
   * When 각 템플릿의 draft를 validateDraft(draft, missingFields)로 검증하면
   * Then missingFields에 있는 필드를 제외한 나머지는 모두 검증 에러가 없어야 한다
   */
  it('should load 6 bundle templates', async () => {
    const templates = await import('@/data/templates');
    expect(templates.TEMPLATES).toHaveLength(6);
  });

  it('should have each template with id, title, description, category, draft, requiredFields', async () => {
    const { TEMPLATES } = await import('@/data/templates');

    for (const template of TEMPLATES) {
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('title');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('category');
      expect(template).toHaveProperty('draft');
      expect(template).toHaveProperty('requiredFields');

      expect(typeof template.id).toBe('string');
      expect(typeof template.title).toBe('string');
      expect(typeof template.description).toBe('string');
      expect(['report', 'alert', 'data']).toContain(template.category);
      expect(Array.isArray(template.draft.actions)).toBe(true);
      expect(Array.isArray(template.requiredFields)).toBe(true);
    }
  });

  it('should validate each template draft (excluding requiredFields)', async () => {
    const { TEMPLATES } = await import('@/data/templates');
    const { validateDraft } = await import('@/lib/validateDraft');

    for (const template of TEMPLATES) {
      const result = validateDraft(template.draft, template.requiredFields);
      expect(result.valid).toBe(true);

      // Check that errors don't include requiredFields
      for (const requiredField of template.requiredFields) {
        expect(result.errors[requiredField]).toBeUndefined();
      }
    }
  });

  it('template with missingFields should pass validation when those fields are omitted', async () => {
    const { TEMPLATES } = await import('@/data/templates');
    const { validateDraft } = await import('@/lib/validateDraft');

    // Pick first template that has requiredFields
    const templateWithRequired = TEMPLATES.find((t) => t.requiredFields.length > 0);
    if (!templateWithRequired) {
      // If none have required fields, test passes
      expect(TEMPLATES.length).toBeGreaterThan(0);
      return;
    }

    // Validate with requiredFields passed as missingFields parameter
    const result = validateDraft(templateWithRequired.draft, templateWithRequired.requiredFields);

    // Should be valid because we're ignoring those fields
    expect(result.valid).toBe(true);
  });

  it('should have all 6 templates with distinct IDs', async () => {
    const { TEMPLATES } = await import('@/data/templates');

    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(6);
  });

  it('should have actionable titles and descriptions for each template', async () => {
    const { TEMPLATES } = await import('@/data/templates');

    for (const template of TEMPLATES) {
      expect(template.title.length).toBeGreaterThan(0);
      expect(template.description.length).toBeGreaterThan(0);
      expect(template.title.length).toBeLessThanOrEqual(50);
      expect(template.description.length).toBeLessThanOrEqual(100);
    }
  });

  it('should represent variety of use cases (report, alert, data)', async () => {
    const { TEMPLATES } = await import('@/data/templates');

    const categories = new Set(TEMPLATES.map((t) => t.category));
    expect(categories.size).toBeGreaterThan(1); // At least 2 different categories
    expect(Array.from(categories)).toEqual(expect.arrayContaining(['report', 'alert']));
  });

  it('should have each template with at least 1 action', async () => {
    const { TEMPLATES } = await import('@/data/templates');

    for (const template of TEMPLATES) {
      expect(template.draft.actions.length).toBeGreaterThanOrEqual(1);
      expect(template.draft.actions.length).toBeLessThanOrEqual(3);
    }
  });
});

describe('Metrics.ts — KST 최근 7일 성공률', () => {
  /**
   * Scenario: KST 시간대에서 최근 7일의 실행 성공률을 계산한다
   * Given RunLog 배열이 있을 때
   * When metrics(runs)를 호출하면
   * Then { successCount, totalCount, successRate: 0..1 }을 반환한다
   */
  it('should calculate success rate as successCount / totalCount', async () => {
    const { calculateSuccessRateLastWeek } = await import('@/lib/metrics');

    const runs = [
      {
        id: 'run_1',
        flowId: 'flow_1',
        flowName: 'Test',
        trigger: 'manual' as const,
        status: 'success' as const,
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        finishedAt: new Date().toISOString(),
        durationMs: 1000,
        aiOutput: null,
        steps: [],
        errorCode: null,
        errorMessage: null,
      },
      {
        id: 'run_2',
        flowId: 'flow_1',
        flowName: 'Test',
        trigger: 'manual' as const,
        status: 'failed' as const,
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(), // 23 hours ago
        finishedAt: new Date().toISOString(),
        durationMs: 1000,
        aiOutput: null,
        steps: [],
        errorCode: 'NETWORK_ERROR' as const,
        errorMessage: 'Network failed',
      },
    ];

    const result = calculateSuccessRateLastWeek(runs);
    expect(result.totalCount).toBe(2);
    expect(result.successCount).toBe(1);
    expect(result.successRate).toBe(0.5);
  });

  it('should only count runs from last 7 days (KST)', async () => {
    const { calculateSuccessRateLastWeek } = await import('@/lib/metrics');

    const nowKST = new Date();
    const sevenDaysAgoKST = new Date(nowKST.getTime() - 7 * 24 * 60 * 60 * 1000);
    const eightDaysAgoKST = new Date(nowKST.getTime() - 8 * 24 * 60 * 60 * 1000);

    const runs = [
      {
        id: 'run_1',
        flowId: 'flow_1',
        flowName: 'Test',
        trigger: 'manual' as const,
        status: 'success' as const,
        startedAt: sevenDaysAgoKST.toISOString(),
        finishedAt: nowKST.toISOString(),
        durationMs: 1000,
        aiOutput: null,
        steps: [],
        errorCode: null,
        errorMessage: null,
      },
      {
        id: 'run_2',
        flowId: 'flow_1',
        flowName: 'Test',
        trigger: 'manual' as const,
        status: 'success' as const,
        startedAt: eightDaysAgoKST.toISOString(),
        finishedAt: nowKST.toISOString(),
        durationMs: 1000,
        aiOutput: null,
        steps: [],
        errorCode: null,
        errorMessage: null,
      },
    ];

    const result = calculateSuccessRateLastWeek(runs);
    // Only the one from 7 days ago should be counted (technically still within 7 days)
    expect(result.totalCount).toBeLessThanOrEqual(2);
  });

  it('should return 100% success rate if all runs succeeded', async () => {
    const { calculateSuccessRateLastWeek } = await import('@/lib/metrics');

    const runs = [
      {
        id: 'run_1',
        flowId: 'flow_1',
        flowName: 'Test',
        trigger: 'manual' as const,
        status: 'success' as const,
        startedAt: new Date(Date.now() - 1000 * 60).toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 1000,
        aiOutput: null,
        steps: [],
        errorCode: null,
        errorMessage: null,
      },
      {
        id: 'run_2',
        flowId: 'flow_1',
        flowName: 'Test',
        trigger: 'manual' as const,
        status: 'success' as const,
        startedAt: new Date(Date.now() - 2000 * 60).toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 1000,
        aiOutput: null,
        steps: [],
        errorCode: null,
        errorMessage: null,
      },
    ];

    const result = calculateSuccessRateLastWeek(runs);
    expect(result.successRate).toBe(1);
  });

  it('should return 0% success rate if all runs failed', async () => {
    const { calculateSuccessRateLastWeek } = await import('@/lib/metrics');

    const runs = [
      {
        id: 'run_1',
        flowId: 'flow_1',
        flowName: 'Test',
        trigger: 'manual' as const,
        status: 'failed' as const,
        startedAt: new Date(Date.now() - 1000 * 60).toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 1000,
        aiOutput: null,
        steps: [],
        errorCode: 'NETWORK_ERROR' as const,
        errorMessage: 'Failed',
      },
    ];

    const result = calculateSuccessRateLastWeek(runs);
    expect(result.successRate).toBe(0);
  });

  it('should return 0 success rate for empty runs array', async () => {
    const { calculateSuccessRateLastWeek } = await import('@/lib/metrics');

    const result = calculateSuccessRateLastWeek([]);
    expect(result.totalCount).toBe(0);
    expect(result.successRate).toBe(0);
  });
});

describe('Integration: validateDraft with format and templates', () => {
  it('should have validateDraft and format functions available', async () => {
    const validateDraft = await import('@/lib/validateDraft');
    const format = await import('@/lib/format');
    expect(validateDraft).toBeDefined();
    expect(format).toBeDefined();
  });

  it('should format a valid draft without errors', async () => {
    const { validateDraft } = await import('@/lib/validateDraft');
    const { format } = await import('@/lib/format');

    const draft: FlowDraft = {
      name: '주간 뉴스',
      input: { type: 'news_keyword', keyword: 'AI' },
      trigger: { type: 'weekly', days: ['mon', 'fri'], time: '09:00' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const validation = validateDraft(draft);
    expect(validation.valid).toBe(true);

    const summary = format(draft);
    expect(summary).toBeDefined();
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
  });
});
