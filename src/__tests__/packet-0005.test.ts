import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Flow, FlowDraft, RunLog } from '@/lib/types';

/**
 * PACKET-0005: API 계약 타입 + 클라이언트 + 엔드포인트
 *
 * AC-1[P0]: fetch가 TypeError를 던지면 code 'NETWORK_ERROR', 메시지 '네트워크 연결을 확인해주세요'로 reject된다
 * AC-2[P0]: 429 응답이면 '잠시 후 다시 시도해주세요' 메시지로 reject된다
 * AC-3[P0]: 모든 요청 헤더에 X-Client-Id가 atb:clientId 값으로 들어 있다
 *
 * 5개 엔드포인트:
 * - POST /api/flows/generate {prompt} → GenerateResponse
 * - POST /api/runs {RunRequest} → RunResponse
 * - GET /api/runs?since&limit=100 → ListRunsResponse
 * - PUT /api/schedules/:flowId {PutScheduleRequest} → {nextRunAt}
 * - DELETE /api/schedules/:flowId → DeleteScheduleResponse
 *
 * 에러: 400, 409, 429, 500, NETWORK, TIMEOUT
 */

describe('AC-1[P0]: fetch TypeError → NETWORK_ERROR', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should catch fetch TypeError and return NETWORK_ERROR with correct message', async () => {
    const { apiClient } = await import('@/api/client');

    // Mock fetch to throw TypeError (network failure)
    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

    try {
      await apiClient.post('/api/flows/generate', { prompt: 'test' });
      expect.fail('should have thrown');
    } catch (error: any) {
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('네트워크 연결을 확인해주세요');
    }
  });

  it('should handle connection refused as NETWORK_ERROR', async () => {
    const { apiClient } = await import('@/api/client');

    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Network request failed'));

    try {
      await apiClient.post('/api/runs', { flowId: 'flow_1', trigger: 'manual' });
      expect.fail('should have thrown');
    } catch (error: any) {
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('네트워크 연결을 확인해주세요');
    }
  });
});

describe('AC-2[P0]: 429 응답 → RATE_LIMITED', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should catch 429 response and return RATE_LIMITED with correct message', async () => {
    const { apiClient } = await import('@/api/client');

    const mockResponse = {
      ok: false,
      status: 429,
      json: vi.fn().mockResolvedValueOnce({ error: 'Too Many Requests' }),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    try {
      await apiClient.post('/api/flows/generate', { prompt: 'test' });
      expect.fail('should have thrown');
    } catch (error: any) {
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.message).toBe('잠시 후 다시 시도해주세요');
    }
  });

  it('should reject on 429 for GET requests as well', async () => {
    const { apiClient } = await import('@/api/client');

    const mockResponse = {
      ok: false,
      status: 429,
      json: vi.fn().mockResolvedValueOnce({}),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    try {
      await apiClient.get('/api/runs?since=2024-01-01&limit=100');
      expect.fail('should have thrown');
    } catch (error: any) {
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.message).toBe('잠시 후 다시 시도해주세요');
    }
  });
});

describe('AC-3[P0]: X-Client-Id 헤더 포함', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Mock localStorage.getItem for clientId
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => {
          if (key === 'atb:clientId') return 'test-client-123';
          return null;
        }),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should include X-Client-Id header with atb:clientId value in POST request', async () => {
    const { apiClient } = await import('@/api/client');

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({ id: 'flow_1', name: 'Test' }),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    await apiClient.post('/api/flows/generate', { prompt: 'test' });

    const fetchCall = (global.fetch as any).mock.calls[0];
    const options = fetchCall[1];

    expect(options.headers['X-Client-Id']).toBe('test-client-123');
  });

  it('should include X-Client-Id header in GET request', async () => {
    const { apiClient } = await import('@/api/client');

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi
        .fn()
        .mockResolvedValueOnce({ runs: [], total: 0 }),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    await apiClient.get('/api/runs?since=2024-01-01&limit=100');

    const fetchCall = (global.fetch as any).mock.calls[0];
    const options = fetchCall[1];

    expect(options.headers['X-Client-Id']).toBe('test-client-123');
  });

  it('should include X-Client-Id header in PUT request', async () => {
    const { apiClient } = await import('@/api/client');

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({ nextRunAt: '2024-02-01T09:00:00Z' }),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    await apiClient.put('/api/schedules/flow_1', { days: ['mon'], time: '09:00' });

    const fetchCall = (global.fetch as any).mock.calls[0];
    const options = fetchCall[1];

    expect(options.headers['X-Client-Id']).toBe('test-client-123');
  });

  it('should include X-Client-Id header in DELETE request', async () => {
    const { apiClient } = await import('@/api/client');

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({ success: true }),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    await apiClient.delete('/api/schedules/flow_1');

    const fetchCall = (global.fetch as any).mock.calls[0];
    const options = fetchCall[1];

    expect(options.headers['X-Client-Id']).toBe('test-client-123');
  });
});

describe('POST /api/flows/generate — 흐름 생성', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => {
          if (key === 'atb:clientId') return 'test-client-123';
          return null;
        }),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call POST /api/flows/generate with prompt and return GenerateResponse', async () => {
    const { generateFlow } = await import('@/api/endpoints');

    const mockFlow: Flow = {
      id: 'flow_1',
      name: 'Generated Flow',
      input: { type: 'text', text: 'test content' },
      trigger: { type: 'manual' },
      aiStep: { task: 'summarize', instruction: '', targetLanguage: null },
      actions: [{ type: 'in_app' }],
      source: 'ai',
      templateId: null,
      enabled: true,
      nextRunAt: null,
      lastRunAt: null,
      lastRunStatus: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce(mockFlow),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    const result = await generateFlow('create a summarizer for AI news');

    expect(result.id).toBe('flow_1');
    expect(result.name).toBe('Generated Flow');
    expect(result.source).toBe('ai');
  });

  it('should handle 400 validation error from /api/flows/generate', async () => {
    const { generateFlow } = await import('@/api/endpoints');

    const mockResponse = {
      ok: false,
      status: 400,
      json: vi
        .fn()
        .mockResolvedValueOnce({ error: 'Invalid prompt' }),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    try {
      await generateFlow('');
      expect.fail('should have thrown');
    } catch (error: any) {
      expect(error.code).toBe('INVALID_REQUEST');
    }
  });
});

describe('POST /api/runs — 흐름 실행', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => {
          if (key === 'atb:clientId') return 'test-client-123';
          return null;
        }),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call POST /api/runs and return RunResponse', async () => {
    const { startRun } = await import('@/api/endpoints');

    const mockRun: RunLog = {
      id: 'run_1',
      flowId: 'flow_1',
      flowName: 'Test Flow',
      trigger: 'manual',
      status: 'success',
      startedAt: '2024-01-01T00:00:00Z',
      finishedAt: '2024-01-01T00:01:00Z',
      durationMs: 60000,
      aiOutput: 'summarized content',
      steps: [],
      errorCode: null,
      errorMessage: null,
    };

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce(mockRun),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    const result = await startRun('flow_1', 'manual');

    expect(result.id).toBe('run_1');
    expect(result.status).toBe('success');
    expect(result.aiOutput).toBe('summarized content');
  });

  it('should handle 409 conflict (flow already running)', async () => {
    const { startRun } = await import('@/api/endpoints');

    const mockResponse = {
      ok: false,
      status: 409,
      json: vi
        .fn()
        .mockResolvedValueOnce({ error: 'Flow already running' }),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    try {
      await startRun('flow_1', 'manual');
      expect.fail('should have thrown');
    } catch (error: any) {
      expect(error.code).toBe('CONFLICT');
    }
  });
});

describe('GET /api/runs — 실행 이력 조회', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => {
          if (key === 'atb:clientId') return 'test-client-123';
          return null;
        }),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call GET /api/runs with since and limit params', async () => {
    const { listRuns } = await import('@/api/endpoints');

    const mockRuns: RunLog[] = [
      {
        id: 'run_1',
        flowId: 'flow_1',
        flowName: 'Test Flow',
        trigger: 'manual',
        status: 'success',
        startedAt: '2024-01-01T00:00:00Z',
        finishedAt: '2024-01-01T00:01:00Z',
        durationMs: 60000,
        aiOutput: null,
        steps: [],
        errorCode: null,
        errorMessage: null,
      },
    ];

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi
        .fn()
        .mockResolvedValueOnce({ runs: mockRuns, total: 1 }),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    const result = await listRuns('2024-01-01T00:00:00Z', 100);

    expect(result.runs).toHaveLength(1);
    expect(result.runs[0].id).toBe('run_1');
    expect(result.total).toBe(1);

    // Verify URL contains query params
    const fetchCall = (global.fetch as any).mock.calls[0];
    const url = fetchCall[0];
    expect(url).toContain('since=');
    expect(url).toContain('limit=100');
  });

  it('should handle empty runs list', async () => {
    const { listRuns } = await import('@/api/endpoints');

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({ runs: [], total: 0 }),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    const result = await listRuns('2024-01-01T00:00:00Z', 100);

    expect(result.runs).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe('PUT /api/schedules/:flowId — 일정 수정', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => {
          if (key === 'atb:clientId') return 'test-client-123';
          return null;
        }),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call PUT /api/schedules/:flowId with trigger config', async () => {
    const { updateSchedule } = await import('@/api/endpoints');

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi
        .fn()
        .mockResolvedValueOnce({ nextRunAt: '2024-02-01T09:00:00Z' }),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    const result = await updateSchedule('flow_1', {
      type: 'weekly',
      days: ['mon', 'wed'],
      time: '09:00',
    });

    expect(result.nextRunAt).toBe('2024-02-01T09:00:00Z');

    // Verify URL includes flowId
    const fetchCall = (global.fetch as any).mock.calls[0];
    const url = fetchCall[0];
    expect(url).toContain('flow_1');
  });

  it('should handle 404 not found for updateSchedule', async () => {
    const { updateSchedule } = await import('@/api/endpoints');

    const mockResponse = {
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValueOnce({ error: 'Flow not found' }),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    try {
      await updateSchedule('nonexistent_flow', {
        type: 'manual',
      });
      expect.fail('should have thrown');
    } catch (error: any) {
      expect(error.code).toBe('NOT_FOUND');
    }
  });
});

describe('DELETE /api/schedules/:flowId — 일정 삭제', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => {
          if (key === 'atb:clientId') return 'test-client-123';
          return null;
        }),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call DELETE /api/schedules/:flowId', async () => {
    const { deleteSchedule } = await import('@/api/endpoints');

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({ success: true }),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    const result = await deleteSchedule('flow_1');

    expect(result.success).toBe(true);

    // Verify URL includes flowId
    const fetchCall = (global.fetch as any).mock.calls[0];
    const url = fetchCall[0];
    expect(url).toContain('flow_1');
  });

  it('should handle 404 for deleteSchedule', async () => {
    const { deleteSchedule } = await import('@/api/endpoints');

    const mockResponse = {
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValueOnce({ error: 'Flow not found' }),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    try {
      await deleteSchedule('nonexistent_flow');
      expect.fail('should have thrown');
    } catch (error: any) {
      expect(error.code).toBe('NOT_FOUND');
    }
  });
});

describe('Error Handling — 500, TIMEOUT, INVALID_RESPONSE', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => {
          if (key === 'atb:clientId') return 'test-client-123';
          return null;
        }),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle 500 server error', async () => {
    const { apiClient } = await import('@/api/client');

    const mockResponse = {
      ok: false,
      status: 500,
      json: vi
        .fn()
        .mockResolvedValueOnce({ error: 'Internal Server Error' }),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    try {
      await apiClient.post('/api/flows/generate', { prompt: 'test' });
      expect.fail('should have thrown');
    } catch (error: any) {
      expect(error.code).toBe('SERVER_ERROR');
    }
  });

  it('should handle timeout errors', async () => {
    const { apiClient } = await import('@/api/client');

    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('Timeout of 30000ms exceeded'),
      );

    try {
      await apiClient.post('/api/flows/generate', { prompt: 'test' });
      expect.fail('should have thrown');
    } catch (error: any) {
      // Should be caught as NETWORK_ERROR since fetch threw
      expect(error.code).toBe('NETWORK_ERROR');
    }
  });

  it('should handle invalid JSON response', async () => {
    const { apiClient } = await import('@/api/client');

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValueOnce(new SyntaxError('Invalid JSON')),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    try {
      await apiClient.post('/api/flows/generate', { prompt: 'test' });
      expect.fail('should have thrown');
    } catch (error: any) {
      expect(error.code).toBe('INVALID_RESPONSE');
    }
  });

  it('should handle 402 payment required (QUOTA_EXCEEDED)', async () => {
    const { apiClient } = await import('@/api/client');

    const mockResponse = {
      ok: false,
      status: 402,
      json: vi.fn().mockResolvedValueOnce({ error: 'Usage limit exceeded' }),
    };

    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    try {
      await apiClient.post('/api/runs', { flowId: 'flow_1', trigger: 'manual' });
      expect.fail('should have thrown');
    } catch (error: any) {
      expect(error.code).toBe('QUOTA_EXCEEDED');
    }
  });
});

describe('Contract Types — API 응답 타입 검증', () => {
  it('should define GenerateResponse contract', async () => {
    const contracts = await import('@/api/contracts');
    expect(contracts.GenerateResponse).toBeDefined();
  });

  it('should define RunResponse contract', async () => {
    const contracts = await import('@/api/contracts');
    expect(contracts.RunResponse).toBeDefined();
  });

  it('should define ListRunsResponse contract', async () => {
    const contracts = await import('@/api/contracts');
    expect(contracts.ListRunsResponse).toBeDefined();
  });

  it('should define PutScheduleResponse contract', async () => {
    const contracts = await import('@/api/contracts');
    expect(contracts.PutScheduleResponse).toBeDefined();
  });

  it('should define DeleteScheduleResponse contract', async () => {
    const contracts = await import('@/api/contracts');
    expect(contracts.DeleteScheduleResponse).toBeDefined();
  });
});
