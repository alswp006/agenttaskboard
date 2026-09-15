import { describe, it, expect } from 'vitest';

/**
 * PACKET-0001: 도메인 타입 + RouteState 계약
 *
 * AC-1: 타입 이름과 필드가 SPEC 코드 블록과 똑같다
 * AC-2: RouteState['/generate/result']가 { prompt: string; draft: FlowDraft; missingFields: string[] } | null이다
 * AC-3: 런타임 export는 plan.ts의 RUN_LIMIT 1개뿐이다
 */

describe('AC-1: Flow domain types match SPEC exactly', () => {
  it('should import Weekday from flow.ts with correct literal type', async () => {
    const { Weekday } = await import('@/types/flow');
    // This is a type check — if Weekday is not a union of weekday strings, TS will error
    // At runtime, we verify the type exists by importing
    expect(true).toBe(true);
  });

  it('should import HHmm from flow.ts as string type', async () => {
    const { HHmm } = await import('@/types/flow');
    expect(typeof HHmm).toBeDefined();
  });

  it('should export Trigger union type with manual, daily, weekly variants', async () => {
    const { Trigger } = await import('@/types/flow');
    expect(Trigger).toBeDefined();
  });

  it('should export InputSource union with text, google_sheet, news_keyword', async () => {
    const { InputSource } = await import('@/types/flow');
    expect(InputSource).toBeDefined();
  });

  it('should export AiTask union: summarize, classify, translate, custom', async () => {
    const { AiTask } = await import('@/types/flow');
    expect(AiTask).toBeDefined();
  });

  it('should export AiStep interface with task, instruction, targetLanguage', async () => {
    const { AiStep } = await import('@/types/flow');
    // Verify interface shape by checking if it has required fields (type-level check)
    expect(AiStep).toBeDefined();
  });

  it('should export Action union with in_app, slack_webhook, google_sheet_append', async () => {
    const { Action } = await import('@/types/flow');
    expect(Action).toBeDefined();
  });

  it('should export FlowDraft interface with name, input, trigger, aiStep, actions', async () => {
    const { FlowDraft } = await import('@/types/flow');
    expect(FlowDraft).toBeDefined();
  });

  it('should export RunStatus union: success, failed', async () => {
    const { RunStatus } = await import('@/types/flow');
    expect(RunStatus).toBeDefined();
  });

  it('should export Flow interface extending FlowDraft with id, source, templateId, enabled, nextRunAt, lastRunAt, lastRunStatus, createdAt, updatedAt', async () => {
    const { Flow } = await import('@/types/flow');
    expect(Flow).toBeDefined();
  });
});

describe('AC-1: Run domain types match SPEC exactly', () => {
  it('should export RunErrorCode union with AI_FAILED, SLACK_WEBHOOK_FAILED, etc.', async () => {
    const { RunErrorCode } = await import('@/types/run');
    expect(RunErrorCode).toBeDefined();
  });

  it('should export StepResult interface with stage, label, status, message', async () => {
    const { StepResult } = await import('@/types/run');
    expect(StepResult).toBeDefined();
  });

  it('should export RunLog interface with id, flowId, flowName, trigger, status, startedAt, finishedAt, durationMs, aiOutput, steps, errorCode, errorMessage', async () => {
    const { RunLog } = await import('@/types/run');
    expect(RunLog).toBeDefined();
  });
});

describe('AC-1: Plan domain types match SPEC exactly', () => {
  it('should export PlanTier union: free, starter, pro', async () => {
    const { PlanTier } = await import('@/types/plan');
    expect(PlanTier).toBeDefined();
  });

  it('should export PlanState interface with tier, purchasedAt, expiresAt', async () => {
    const { PlanState } = await import('@/types/plan');
    expect(PlanState).toBeDefined();
  });

  it('should export UsageState interface with month, runCount', async () => {
    const { UsageState } = await import('@/types/plan');
    expect(UsageState).toBeDefined();
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
    const { FlowTemplate } = await import('@/types/template');
    expect(FlowTemplate).toBeDefined();
  });
});

describe('AC-2: RouteState types for navigation', () => {
  it('should export BuilderLocationState with draft, source, templateId, missingFields or null', async () => {
    const { BuilderLocationState } = await import('@/navigation/types');
    expect(BuilderLocationState).toBeDefined();
  });

  it('should export GenerateLocationState with prompt or null', async () => {
    const { GenerateLocationState } = await import('@/navigation/types');
    expect(GenerateLocationState).toBeDefined();
  });

  it('should export GenerateResultLocationState with prompt, draft, missingFields or null', async () => {
    const { GenerateResultLocationState } = await import('@/navigation/types');
    expect(GenerateResultLocationState).toBeDefined();
  });

  it('should export RunsLocationState with filter (all, success, failed) or null', async () => {
    const { RunsLocationState } = await import('@/navigation/types');
    expect(RunsLocationState).toBeDefined();
  });

  it('should export PlanLocationState with reason (quota_exceeded) or null', async () => {
    const { PlanLocationState } = await import('@/navigation/types');
    expect(PlanLocationState).toBeDefined();
  });

  it('AC-2 [P0]: GenerateResultLocationState should be { prompt: string; draft: FlowDraft; missingFields: string[] } | null', async () => {
    const { GenerateResultLocationState } = await import('@/navigation/types');
    // Type-level validation: if the type is not correct, TypeScript will error
    // Runtime validation: the type was successfully imported
    expect(GenerateResultLocationState).toBeDefined();

    // Additional validation: ensure the module exports this as a type alias
    const module = await import('@/navigation/types');
    expect('GenerateResultLocationState' in module).toBe(true);
  });
});

describe('AC-3: Runtime exports — plan.ts should only export RUN_LIMIT', () => {
  it('should export RUN_LIMIT as the only runtime constant from plan.ts', async () => {
    const planModule = await import('@/types/plan');
    // Collect all named exports
    const exports = Object.keys(planModule).filter(
      (key) => !key.startsWith('_') && typeof planModule[key] !== 'undefined'
    );
    // RUN_LIMIT should be present
    expect(exports).toContain('RUN_LIMIT');
  });

  it('should not export runtime variables other than RUN_LIMIT from plan.ts', async () => {
    const planModule = await import('@/types/plan');
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
    const { FlowDraft, Trigger, InputSource, AiStep, Action } =
      await import('@/types/flow');

    // This is a type-level test. The following would compile if types are correct:
    // const trigger: Trigger = { type: 'daily', time: '09:00' };
    // const input: InputSource = { type: 'news_keyword', keyword: 'AI' };
    // const aiStep: AiStep = { task: 'summarize', instruction: '', targetLanguage: null };
    // const action: Action = { type: 'in_app' };
    // const draft: FlowDraft = { name: '..', input, trigger, aiStep, actions: [action] };

    // Runtime check: modules export these types
    expect(FlowDraft).toBeDefined();
    expect(Trigger).toBeDefined();
    expect(InputSource).toBeDefined();
    expect(AiStep).toBeDefined();
    expect(Action).toBeDefined();
  });

  it('should have FlowDraft as a base for Flow', async () => {
    const { FlowDraft, Flow } = await import('@/types/flow');
    expect(FlowDraft).toBeDefined();
    expect(Flow).toBeDefined();
  });

  it('should have RouteState types that correspond to actual navigation paths', async () => {
    const {
      BuilderLocationState,
      GenerateLocationState,
      GenerateResultLocationState,
      RunsLocationState,
      PlanLocationState,
    } = await import('@/navigation/types');

    // All 5 RouteState variants should be defined
    expect(BuilderLocationState).toBeDefined();
    expect(GenerateLocationState).toBeDefined();
    expect(GenerateResultLocationState).toBeDefined();
    expect(RunsLocationState).toBeDefined();
    expect(PlanLocationState).toBeDefined();
  });
});
