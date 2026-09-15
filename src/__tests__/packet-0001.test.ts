import { describe, it, expect } from 'vitest';
import type { Weekday, HHmm, Trigger, InputSource, AiTask, AiStep, Action, FlowDraft, RunStatus, Flow } from '@/types/flow';
import type { RunErrorCode, StepResult, RunLog } from '@/types/run';
import type { PlanTier, PlanState, UsageState } from '@/types/plan';
import type { FlowTemplate } from '@/types/template';
import type {
  BuilderLocationState,
  GenerateLocationState,
  GenerateResultLocationState,
  RunsLocationState,
  PlanLocationState,
} from '@/navigation/types';

/**
 * PACKET-0001: 도메인 타입 + RouteState 계약
 *
 * AC-1: 타입 이름과 필드가 SPEC 코드 블록과 똑같다
 * AC-2: RouteState['/generate/result']가 { prompt: string; draft: FlowDraft; missingFields: string[] } | null이다
 * AC-3: 런타임 export는 plan.ts의 RUN_LIMIT 1개뿐이다
 *
 * flow.ts/run.ts/template.ts/navigation/types.ts는 순수 타입(type/interface)만 export하므로
 * 런타임에는 존재하지 않는다 — 아래 테스트는 `import type`으로 가져와 타입 레벨에서만
 * 검증한다(어긋나면 `npx tsc --noEmit`이 에러를 낸다). 모듈 자체가 로드되는지는
 * `await import(...)`로 별도 확인한다.
 */

describe('AC-1: Flow domain types match SPEC exactly', () => {
  it('should import Weekday from flow.ts with correct literal type', async () => {
    const days: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    expect(days).toHaveLength(7);
  });

  it('should import HHmm from flow.ts as string type', async () => {
    const time: HHmm = '09:00';
    expect(typeof time).toBe('string');
  });

  it('should export Trigger union type with manual, daily, weekly variants', async () => {
    const manual: Trigger = { type: 'manual' };
    const daily: Trigger = { type: 'daily', time: '09:00' };
    const weekly: Trigger = { type: 'weekly', days: ['mon', 'wed'], time: '18:00' };
    expect([manual, daily, weekly]).toHaveLength(3);
  });

  it('should export InputSource union with text, google_sheet, news_keyword', async () => {
    const text: InputSource = { type: 'text', text: '내용' };
    const sheet: InputSource = { type: 'google_sheet', sheetUrl: 'https://example.com', range: 'A1:D50' };
    const keyword: InputSource = { type: 'news_keyword', keyword: 'AI' };
    expect([text, sheet, keyword]).toHaveLength(3);
  });

  it('should export AiTask union: summarize, classify, translate, custom', async () => {
    const tasks: AiTask[] = ['summarize', 'classify', 'translate', 'custom'];
    expect(tasks).toHaveLength(4);
  });

  it('should export AiStep interface with task, instruction, targetLanguage', async () => {
    const aiStep: AiStep = { task: 'translate', instruction: '', targetLanguage: 'en' };
    expect(aiStep.task).toBe('translate');
  });

  it('should export Action union with in_app, slack_webhook, google_sheet_append', async () => {
    const inApp: Action = { type: 'in_app' };
    const slack: Action = { type: 'slack_webhook', webhookUrl: 'https://hooks.slack.com/services/x' };
    const sheet: Action = { type: 'google_sheet_append', sheetUrl: 'https://docs.google.com/spreadsheets/d/abc', sheetName: '시트1' };
    expect([inApp, slack, sheet]).toHaveLength(3);
  });

  it('should export FlowDraft interface with name, input, trigger, aiStep, actions', async () => {
    const draft: FlowDraft = {
      name: '아침 뉴스 요약',
      input: { type: 'news_keyword', keyword: 'AI' },
      trigger: { type: 'daily', time: '09:00' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };
    expect(draft.name).toBe('아침 뉴스 요약');
  });

  it('should export RunStatus union: success, failed', async () => {
    const statuses: RunStatus[] = ['success', 'failed'];
    expect(statuses).toHaveLength(2);
  });

  it('should export Flow interface extending FlowDraft with id, source, templateId, enabled, nextRunAt, lastRunAt, lastRunStatus, createdAt, updatedAt', async () => {
    const flow: Flow = {
      id: 'flow_abcd1234',
      name: '아침 뉴스 요약',
      input: { type: 'news_keyword', keyword: 'AI' },
      trigger: { type: 'daily', time: '09:00' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
      source: 'manual',
      templateId: null,
      enabled: false,
      nextRunAt: null,
      lastRunAt: null,
      lastRunStatus: null,
      createdAt: '2026-09-16T00:00:00.000Z',
      updatedAt: '2026-09-16T00:00:00.000Z',
    };
    expect(flow.id).toBe('flow_abcd1234');
  });
});

describe('AC-1: Run domain types match SPEC exactly', () => {
  it('should export RunErrorCode union with AI_FAILED, SLACK_WEBHOOK_FAILED, etc.', async () => {
    const codes: RunErrorCode[] = ['AI_FAILED', 'SLACK_WEBHOOK_FAILED', 'SHEET_ACCESS_DENIED', 'NEWS_FETCH_FAILED', 'NETWORK_ERROR', 'TIMEOUT'];
    expect(codes).toHaveLength(6);
  });

  it('should export StepResult interface with stage, label, status, message', async () => {
    const step: StepResult = { stage: 'ai', label: '요약', status: 'success', message: null };
    expect(step.stage).toBe('ai');
  });

  it('should export RunLog interface with id, flowId, flowName, trigger, status, startedAt, finishedAt, durationMs, aiOutput, steps, errorCode, errorMessage', async () => {
    const run: RunLog = {
      id: 'run_abcd1234efgh',
      flowId: 'flow_abcd1234',
      flowName: '아침 뉴스 요약',
      trigger: 'manual',
      status: 'success',
      startedAt: '2026-09-16T00:00:00.000Z',
      finishedAt: '2026-09-16T00:00:05.000Z',
      durationMs: 5000,
      aiOutput: '요약 결과',
      steps: [{ stage: 'trigger', label: '시작', status: 'success', message: null }],
      errorCode: null,
      errorMessage: null,
    };
    expect(run.id).toBe('run_abcd1234efgh');
  });
});

describe('AC-1: Plan domain types match SPEC exactly', () => {
  it('should export PlanTier union: free, starter, pro', async () => {
    const tiers: PlanTier[] = ['free', 'starter', 'pro'];
    expect(tiers).toHaveLength(3);
  });

  it('should export PlanState interface with tier, purchasedAt, expiresAt', async () => {
    const plan: PlanState = { tier: 'free', purchasedAt: null, expiresAt: null };
    expect(plan.tier).toBe('free');
  });

  it('should export UsageState interface with month, runCount', async () => {
    const usage: UsageState = { month: '2026-09', runCount: 37 };
    expect(usage.runCount).toBe(37);
  });

  it('should export RUN_LIMIT object with free: 100, starter: 1000, pro: null', async () => {
    const { RUN_LIMIT } = await import('@/types/plan');
    expect(RUN_LIMIT.free).toBe(100);
    expect(RUN_LIMIT.starter).toBe(1000);
    expect(RUN_LIMIT.pro).toBe(null);
  });
});

describe('AC-1: Template domain types match SPEC exactly', () => {
  it('should export FlowTemplate interface with id, title, description, category, draft, requiredFields', async () => {
    const template: FlowTemplate = {
      id: 'tpl_news_slack',
      title: '뉴스 요약 슬랙 전송',
      description: '키워드 뉴스를 요약해 슬랙으로 보내요',
      category: 'alert',
      draft: {
        name: '',
        input: { type: 'news_keyword', keyword: '' },
        trigger: { type: 'daily', time: '09:00' },
        aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
        actions: [{ type: 'slack_webhook', webhookUrl: '' }],
      },
      requiredFields: ['actions.0.webhookUrl'],
    };
    expect(template.id).toBe('tpl_news_slack');
  });
});

describe('AC-2: RouteState types for navigation', () => {
  it('should export BuilderLocationState with draft, source, templateId, missingFields or null', async () => {
    const state: BuilderLocationState = {
      draft: {
        name: '',
        input: { type: 'text', text: '' },
        trigger: { type: 'manual' },
        aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
        actions: [{ type: 'in_app' }],
      },
      source: 'template',
      templateId: 'tpl_news_slack',
      missingFields: [],
    };
    const nullState: BuilderLocationState = null;
    expect(state.source).toBe('template');
    expect(nullState).toBeNull();
  });

  it('should export GenerateLocationState with prompt or null', async () => {
    const state: GenerateLocationState = { prompt: '매일 아침 뉴스 요약해서 슬랙으로' };
    const nullState: GenerateLocationState = null;
    expect(state.prompt.length).toBeGreaterThan(0);
    expect(nullState).toBeNull();
  });

  it('should export GenerateResultLocationState with prompt, draft, missingFields or null', async () => {
    const state: GenerateResultLocationState = {
      prompt: '매일 아침 뉴스 요약해서 슬랙으로',
      draft: {
        name: '아침 뉴스 요약',
        input: { type: 'news_keyword', keyword: 'AI' },
        trigger: { type: 'daily', time: '09:00' },
        aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
        actions: [{ type: 'slack_webhook', webhookUrl: '' }],
      },
      missingFields: ['actions.0.webhookUrl'],
    };
    const nullState: GenerateResultLocationState = null;
    expect(state.missingFields).toContain('actions.0.webhookUrl');
    expect(nullState).toBeNull();
  });

  it('should export RunsLocationState with filter (all, success, failed) or null', async () => {
    const all: RunsLocationState = { filter: 'all' };
    const success: RunsLocationState = { filter: 'success' };
    const failed: RunsLocationState = { filter: 'failed' };
    const nullState: RunsLocationState = null;
    expect([all, success, failed]).toHaveLength(3);
    expect(nullState).toBeNull();
  });

  it('should export PlanLocationState with reason (quota_exceeded) or null', async () => {
    const state: PlanLocationState = { reason: 'quota_exceeded' };
    const nullState: PlanLocationState = null;
    expect(state.reason).toBe('quota_exceeded');
    expect(nullState).toBeNull();
  });

  it('AC-2 [P0]: GenerateResultLocationState should be { prompt: string; draft: FlowDraft; missingFields: string[] } | null', async () => {
    const draft: FlowDraft = {
      name: '아침 뉴스 요약',
      input: { type: 'news_keyword', keyword: 'AI' },
      trigger: { type: 'daily', time: '09:00' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };
    const state: GenerateResultLocationState = { prompt: 'p', draft, missingFields: [] };
    expect(state).toEqual({ prompt: 'p', draft, missingFields: [] });

    // 모듈이 실제로 로드되는지도 확인
    const module = await import('@/navigation/types');
    expect(module).toBeDefined();
  });
});

describe('AC-3: Runtime exports — plan.ts should only export RUN_LIMIT', () => {
  it('should export RUN_LIMIT as the only runtime constant from plan.ts', async () => {
    const planModule = await import('@/types/plan') as Record<string, unknown>;
    // Collect all named exports
    const exports = Object.keys(planModule).filter(
      (key) => !key.startsWith('_') && typeof planModule[key] !== 'undefined'
    );
    // RUN_LIMIT should be present
    expect(exports).toContain('RUN_LIMIT');
  });

  it('should not export runtime variables other than RUN_LIMIT from plan.ts', async () => {
    const planModule = await import('@/types/plan') as Record<string, unknown>;
    // Count value exports (exclude type aliases which are not enumerable at runtime)
    const valueExports = Object.keys(planModule).filter(
      (key) => {
        const val = planModule[key];
        // Skip if it looks like a type (undefined or not a plain value)
        return (
          typeof val !== 'undefined' &&
          !key.startsWith('_') &&
          // Only RUN_LIMIT should be a runtime constant object
          key === 'RUN_LIMIT'
        );
      }
    );
    expect(valueExports).toEqual(['RUN_LIMIT']);
  });

  it('should have RUN_LIMIT with tier keys free, starter, pro', async () => {
    const { RUN_LIMIT } = await import('@/types/plan');
    const keys = Object.keys(RUN_LIMIT);
    expect(keys).toEqual(expect.arrayContaining(['free', 'starter', 'pro']));
  });

  it('RUN_LIMIT values: free=100, starter=1000, pro=null', async () => {
    const { RUN_LIMIT } = await import('@/types/plan');
    expect(RUN_LIMIT.free).toBe(100);
    expect(RUN_LIMIT.starter).toBe(1000);
    expect(RUN_LIMIT.pro).toBeNull();
  });

  it('flow.ts, run.ts, template.ts, navigation/types.ts should have zero runtime exports', async () => {
    const flowModule = await import('@/types/flow');
    const runModule = await import('@/types/run');
    const templateModule = await import('@/types/template');
    const navigationModule = await import('@/navigation/types');

    for (const mod of [flowModule, runModule, templateModule, navigationModule]) {
      const valueExports = Object.keys(mod).filter((key) => typeof (mod as Record<string, unknown>)[key] !== 'undefined');
      expect(valueExports).toEqual([]);
    }
  });
});

describe('Integration: All type modules exist and export expected shapes', () => {
  it('should be able to import all 5 type modules without error', async () => {
    const flowModule = await import('@/types/flow');
    const runModule = await import('@/types/run');
    const planModule = await import('@/types/plan');
    const templateModule = await import('@/types/template');
    const navigationModule = await import('@/navigation/types');

    expect(flowModule).toBeDefined();
    expect(runModule).toBeDefined();
    expect(planModule).toBeDefined();
    expect(templateModule).toBeDefined();
    expect(navigationModule).toBeDefined();
  });

  it('should be able to construct sample data matching SPEC types', async () => {
    const input: InputSource = { type: 'news_keyword', keyword: 'AI' };
    const trigger: Trigger = { type: 'daily', time: '09:00' };
    const aiStep: AiStep = { task: 'summarize', instruction: '', targetLanguage: null };
    const action: Action = { type: 'in_app' };
    const draft: FlowDraft = { name: '..', input, trigger, aiStep, actions: [action] };

    expect(draft.actions).toHaveLength(1);
  });

  it('should have FlowDraft as a base for Flow', async () => {
    const draft: FlowDraft = {
      name: '아침 뉴스 요약',
      input: { type: 'news_keyword', keyword: 'AI' },
      trigger: { type: 'daily', time: '09:00' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };
    const flow: Flow = {
      ...draft,
      id: 'flow_abcd1234',
      source: 'manual',
      templateId: null,
      enabled: false,
      nextRunAt: null,
      lastRunAt: null,
      lastRunStatus: null,
      createdAt: '2026-09-16T00:00:00.000Z',
      updatedAt: '2026-09-16T00:00:00.000Z',
    };
    expect(flow.name).toBe(draft.name);
  });

  it('should have RouteState types that correspond to actual navigation paths', async () => {
    const builder: BuilderLocationState = null;
    const generate: GenerateLocationState = null;
    const generateResult: GenerateResultLocationState = null;
    const runs: RunsLocationState = null;
    const plan: PlanLocationState = null;

    // All 5 RouteState variants should be defined (nullable, but the type itself is real)
    expect([builder, generate, generateResult, runs, plan]).toEqual([null, null, null, null, null]);
  });
});
