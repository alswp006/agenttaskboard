import { describe, it, expect } from 'vitest';
import type { FlowDraft } from '@/lib/types';
import type { Flow, Run } from '@/lib/contract';
import { validateDraft, validateFlow } from '@/lib/validateDraft';
import { formatDuration } from '@/lib/format';
import { calculateMetrics } from '@/lib/metrics';

/**
 * 포괄적인 AC 검증은 src/__tests__/packet-0004.test.ts에 있다.
 * 여기는 DoD가 지정한 co-located 테스트 파일 — validateDraft 핵심 동작만 다룬다.
 */
describe('validateDraft', () => {
  it('rejects a non-slack webhook URL', () => {
    const draft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '내용' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'slack_webhook', webhookUrl: 'https://example.com' }],
    };

    const result = validateDraft(draft);
    expect(result.valid).toBe(false);
    expect(result.errors['actions.0.webhookUrl']).toBe('슬랙 Webhook 주소 형식이 올바르지 않아요');
  });

  it('accepts a valid draft with no errors', () => {
    const draft: FlowDraft = {
      name: '뉴스 요약',
      input: { type: 'news_keyword', keyword: 'AI' },
      trigger: { type: 'daily', time: '09:00' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = validateDraft(draft);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('ignores errors for fields listed in missingFields', () => {
    const draft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '내용' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'slack_webhook', webhookUrl: '' }],
    };

    const result = validateDraft(draft, ['actions.0.webhookUrl']);
    expect(result.valid).toBe(true);
  });

  it('rejects weekly trigger with duplicate days', () => {
    const draft: FlowDraft = {
      name: '테스트',
      input: { type: 'text', text: '내용' },
      trigger: { type: 'weekly', days: ['mon', 'mon'], time: '09:00' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
    };

    const result = validateDraft(draft);
    expect(result.valid).toBe(false);
    expect(result.errors['trigger.days']).toBe('요일을 1개 이상 선택해주세요');
  });
});

describe('validateFlow (contract.ts)', () => {
  it('accepts a valid flow', () => {
    const flow: Omit<Flow, 'id' | 'createdAt' | 'updatedAt'> = {
      name: '테스트 플로우',
      trigger: { type: 'daily', config: { time: '09:00' } },
      actions: [{ id: 'a1', type: 'slack', config: {}, enabled: true }],
      enabled: true,
    };

    const result = validateFlow(flow);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects an empty name and an empty actions array', () => {
    const flow: Omit<Flow, 'id' | 'createdAt' | 'updatedAt'> = {
      name: '  ',
      trigger: { type: 'daily', config: {} },
      actions: [],
      enabled: true,
    };

    const result = validateFlow(flow);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('플로우 이름을 입력해주세요');
    expect(result.errors).toContain('액션을 1개 이상 추가해주세요');
  });
});

describe('formatDuration (contract.ts)', () => {
  it('formats sub-minute durations as seconds with one decimal', () => {
    expect(formatDuration(3200)).toBe('3.2초');
  });

  it('formats durations of a minute or more as minutes and seconds', () => {
    expect(formatDuration(80_000)).toBe('1분 20초');
  });
});

describe('calculateMetrics (contract.ts)', () => {
  it('returns zeroed metrics for an empty run list', () => {
    const result = calculateMetrics([]);
    expect(result).toEqual({ totalRuns: 0, successRate: 0, avgDuration: 0 });
  });

  it('computes success rate, average duration, and the latest run', () => {
    const runs: Run[] = [
      {
        id: 'r1',
        flowId: 'f1',
        status: 'success',
        startedAt: '2026-09-01T00:00:00.000Z',
        completedAt: '2026-09-01T00:00:02.000Z',
        logs: [],
      },
      {
        id: 'r2',
        flowId: 'f1',
        status: 'failed',
        startedAt: '2026-09-02T00:00:00.000Z',
        completedAt: '2026-09-02T00:00:04.000Z',
        logs: [],
      },
    ];

    const result = calculateMetrics(runs);
    expect(result.totalRuns).toBe(2);
    expect(result.successRate).toBe(0.5);
    expect(result.avgDuration).toBe(3000);
    expect(result.lastRun).toBe('2026-09-02T00:00:00.000Z');
  });
});
