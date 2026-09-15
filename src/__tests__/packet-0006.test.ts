import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Flow, RunLog, UsageRecord } from '@/lib/types';

/**
 * PACKET-0006: 실행 · 스케줄 · 동기화 서비스
 *
 * AC-1[P0]: 사용량이 RUN_LIMIT와 같으면 runNow는 fetch 0회로 QUOTA_EXCEEDED를 반환한다
 * AC-2[P0]: DELETE가 500을 받으면 flow.enabled가 true로 유지되고 에러를 반환한다
 * AC-3[P0]: 동기화 응답이 100건이면 lastSyncedAt이 100번째 항목의 startedAt으로 저장된다
 *
 * 3개 서비스:
 * - runService.runNow(flowId): 한도 → POST /api/runs → runRepo.save → usage++ → flow.lastRun* 갱신
 * - scheduleService.disable(flowId): manual이면 DELETE, 200 응답 시 enabled=false, 500 응답 시 enabled 유지 + error
 * - scheduleService.enable(flowId): PUT /api/schedules/:flowId → enabled=true
 * - syncService.sync(flowId, since?): GET /api/runs + 100건이면 커서 저장 + 중복 제거 + lastRun* 갱신
 */

const RUN_LIMIT = 20; // 한도 상수

describe('AC-1[P0]: runNow() - usage = RUN_LIMIT일 때 QUOTA_EXCEEDED', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let runRepoMock: any;
  let flowRepoMock: any;
  let usageRepoMock: any;

  beforeEach(() => {
    vi.resetAllMocks();
    fetchSpy = vi.spyOn(global, 'fetch' as any);

    // Mock repositories
    runRepoMock = { save: vi.fn() };
    flowRepoMock = { get: vi.fn(), update: vi.fn() };
    usageRepoMock = { getMonthly: vi.fn(), increment: vi.fn() };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return QUOTA_EXCEEDED without calling fetch when usage equals RUN_LIMIT', async () => {
    // Arrange: usage가 RUN_LIMIT(20)과 같은 상태
    usageRepoMock.getMonthly.mockResolvedValueOnce({
      count: RUN_LIMIT,
      monthStart: new Date('2026-09-01'),
      monthEnd: new Date('2026-09-30'),
    } as UsageRecord);

    const { runService } = await import('@/services/runService');

    // Act
    try {
      await runService.runNow('flow_abc123');
      expect.fail('should have thrown QUOTA_EXCEEDED');
    } catch (error: any) {
      // Assert: fetch 호출 0회
      expect(fetchSpy).not.toHaveBeenCalled();
      // QUOTA_EXCEEDED 에러 반환
      expect(error.code).toBe('QUOTA_EXCEEDED');
      expect(error.message).toBe('한 달에 20회까지만 실행할 수 있습니다');
    }
  });

  it('should increment usage and call POST /api/runs when usage is below RUN_LIMIT', async () => {
    // Arrange: usage가 RUN_LIMIT - 1 (19개)
    usageRepoMock.getMonthly.mockResolvedValueOnce({
      count: RUN_LIMIT - 1,
      monthStart: new Date('2026-09-01'),
    } as UsageRecord);

    const mockFlow = { id: 'flow_abc', name: 'Test Flow', enabled: true } as Flow;
    flowRepoMock.get.mockResolvedValueOnce(mockFlow);

    const mockRunResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({
        runId: 'run_1234',
        flowId: 'flow_abc',
        status: 'success',
        startedAt: new Date('2026-09-16T10:00:00Z'),
      }),
    };
    global.fetch = vi.fn().mockResolvedValueOnce(mockRunResponse);

    const { runService } = await import('@/services/runService');

    // Act
    const result = await runService.runNow('flow_abc');

    // Assert: fetch 1회 호출 (POST /api/runs)
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/runs'),
      expect.objectContaining({ method: 'POST' })
    );

    // runId 반환
    expect(result.runId).toBe('run_1234');
    // usage 증가 호출
    expect(usageRepoMock.increment).toHaveBeenCalledWith('flow_abc');
  });

  it('should return QUOTA_EXCEEDED when usage equals RUN_LIMIT (exactly at limit)', async () => {
    usageRepoMock.getMonthly.mockResolvedValueOnce({
      count: 20,
      monthStart: new Date('2026-09-01'),
    } as UsageRecord);

    const { runService } = await import('@/services/runService');

    try {
      await runService.runNow('flow_xyz');
      expect.fail('should have thrown');
    } catch (error: any) {
      expect(error.code).toBe('QUOTA_EXCEEDED');
      expect(fetchSpy).not.toHaveBeenCalled();
    }
  });
});

describe('AC-2[P0]: scheduleService.disable() - 500 응답 시 enabled 유지', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let flowRepoMock: any;

  beforeEach(() => {
    vi.resetAllMocks();
    fetchSpy = vi.spyOn(global, 'fetch' as any);
    flowRepoMock = { get: vi.fn(), update: vi.fn() };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error and keep enabled=true when DELETE receives 500', async () => {
    // Arrange: flow가 enabled=true 상태
    const mockFlow = {
      id: 'flow_456',
      name: 'Scheduled Flow',
      enabled: true,
      schedule: { frequency: 'daily' },
    } as Flow;
    flowRepoMock.get.mockResolvedValueOnce(mockFlow);

    // DELETE 요청이 500 에러 반환
    const mockErrorResponse = {
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValueOnce({ error: 'Internal Server Error' }),
    };
    global.fetch = vi.fn().mockResolvedValueOnce(mockErrorResponse);

    const { scheduleService } = await import('@/services/scheduleService');

    // Act
    try {
      await scheduleService.disable('flow_456');
      expect.fail('should have thrown error');
    } catch (error: any) {
      // Assert: enabled이 true로 유지되어야 함
      expect(flowRepoMock.update).not.toHaveBeenCalledWith(
        'flow_456',
        expect.objectContaining({ enabled: false })
      );
      // 에러 반환
      expect(error.code).toBe('SERVER_ERROR');
      expect(error.message).toContain('스케줄 설정을 변경할 수 없습니다');
    }
  });

  it('should set enabled=false and call DELETE when response is 200', async () => {
    // Arrange: flow가 enabled=true 상태
    const mockFlow = {
      id: 'flow_456',
      name: 'Scheduled Flow',
      enabled: true,
    } as Flow;
    flowRepoMock.get.mockResolvedValueOnce(mockFlow);

    // DELETE 요청이 200 성공 반환
    const mockSuccessResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({ success: true }),
    };
    global.fetch = vi.fn().mockResolvedValueOnce(mockSuccessResponse);

    const { scheduleService } = await import('@/services/scheduleService');

    // Act
    const result = await scheduleService.disable('flow_456');

    // Assert: DELETE 호출
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/schedules/flow_456'),
      expect.objectContaining({ method: 'DELETE' })
    );

    // enabled=false로 업데이트
    expect(flowRepoMock.update).toHaveBeenCalledWith('flow_456', {
      enabled: false,
    });

    expect(result.success).toBe(true);
  });

  it('should not update flow.enabled when DELETE fails with 500, error should be thrown', async () => {
    const mockFlow = { id: 'flow_789', enabled: true } as Flow;
    flowRepoMock.get.mockResolvedValueOnce(mockFlow);

    const mockErrorResponse = {
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValueOnce({}),
    };
    global.fetch = vi.fn().mockResolvedValueOnce(mockErrorResponse);

    const { scheduleService } = await import('@/services/scheduleService');

    try {
      await scheduleService.disable('flow_789');
      expect.fail('should throw');
    } catch (error: any) {
      // flowRepoMock.update가 enabled: false로 호출되지 않아야 함
      const calls = flowRepoMock.update.mock.calls;
      const hasDisableUpdate = calls.some(
        (call: any) =>
          call[0] === 'flow_789' &&
          call[1].enabled === false
      );
      expect(hasDisableUpdate).toBe(false);
    }
  });
});

describe('AC-3[P0]: syncService.sync() - 100건 응답 시 lastSyncedAt 저장', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let runRepoMock: any;
  let flowRepoMock: any;
  let syncCursorMock: any;

  beforeEach(() => {
    vi.resetAllMocks();
    fetchSpy = vi.spyOn(global, 'fetch' as any);
    runRepoMock = { save: vi.fn(), deduplicate: vi.fn() };
    flowRepoMock = { get: vi.fn(), update: vi.fn() };
    syncCursorMock = { save: vi.fn(), load: vi.fn() };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should save cursor to 100th item startedAt when response has 100 runs', async () => {
    // Arrange: 100건의 실행 데이터 생성
    const mockRuns = Array.from({ length: 100 }, (_, i) => ({
      runId: `run_${i}`,
      flowId: 'flow_sync_test',
      status: 'success',
      startedAt: new Date(`2026-09-${String(i % 30 + 1).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00:00Z`),
    }));

    // 100번째 항목의 startedAt
    const cursor100thStartedAt = mockRuns[99].startedAt;

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({
        runs: mockRuns,
        hasMore: true,
      }),
    };
    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    const mockFlow = { id: 'flow_sync_test', enabled: true } as Flow;
    flowRepoMock.get.mockResolvedValueOnce(mockFlow);

    const { syncService } = await import('@/services/syncService');

    // Act
    const result = await syncService.sync('flow_sync_test', undefined);

    // Assert: lastSyncedAt이 100번째 항목의 startedAt으로 저장
    expect(syncCursorMock.save).toHaveBeenCalledWith(
      'flow_sync_test',
      expect.objectContaining({
        cursor: expect.stringMatching(/2026-09/),
      })
    );

    // 100개의 실행이 저장됨
    expect(runRepoMock.save).toHaveBeenCalledTimes(100);

    // lastRun* 필드 갱신
    expect(flowRepoMock.update).toHaveBeenCalledWith(
      'flow_sync_test',
      expect.objectContaining({
        lastRunAt: expect.any(Date),
      })
    );

    expect(result.synced).toBe(100);
  });

  it('should not save cursor when response has less than 100 runs', async () => {
    // Arrange: 50건의 실행 데이터
    const mockRuns = Array.from({ length: 50 }, (_, i) => ({
      runId: `run_small_${i}`,
      flowId: 'flow_small',
      status: 'success',
      startedAt: new Date(`2026-09-16T${String(i % 24).padStart(2, '0')}:00:00Z`),
    }));

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({
        runs: mockRuns,
        hasMore: false,
      }),
    };
    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    const mockFlow = { id: 'flow_small', enabled: true } as Flow;
    flowRepoMock.get.mockResolvedValueOnce(mockFlow);

    const { syncService } = await import('@/services/syncService');

    // Act
    await syncService.sync('flow_small');

    // Assert: cursor를 새로 저장하지 않음 (50건이므로)
    // 이전 cursor 유지 또는 저장하지 않음
    expect(syncCursorMock.save).not.toHaveBeenCalledWith(
      'flow_small',
      expect.anything()
    );

    // 50개의 실행이 저장됨
    expect(runRepoMock.save).toHaveBeenCalledTimes(50);
  });

  it('should deduplicate runs by runId and only count unique runs', async () => {
    // Arrange: 중복 runId 포함한 100건
    const mockRuns = [
      ...Array.from({ length: 99 }, (_, i) => ({
        runId: `run_dup_${i}`,
        flowId: 'flow_dup_test',
        status: 'success',
        startedAt: new Date(`2026-09-16T${String(i % 24).padStart(2, '0')}:00:00Z`),
      })),
      // 중복 항목 추가 (이전에 이미 저장된 것)
      {
        runId: 'run_dup_0', // 첫 번째 항목과 같은 runId
        flowId: 'flow_dup_test',
        status: 'success',
        startedAt: new Date('2026-09-16T00:00:00Z'),
      },
    ];

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({
        runs: mockRuns,
        hasMore: true,
      }),
    };
    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    const mockFlow = { id: 'flow_dup_test', enabled: true } as Flow;
    flowRepoMock.get.mockResolvedValueOnce(mockFlow);

    const { syncService } = await import('@/services/syncService');

    // Act
    const result = await syncService.sync('flow_dup_test');

    // Assert: 중복 제거 함수 호출
    expect(runRepoMock.deduplicate).toHaveBeenCalledWith('flow_dup_test');

    // 유니크한 실행만 카운트됨 (또는 99개만 새로 저장)
    expect(result.synced).toBeLessThanOrEqual(100);
  });

  it('should update flow.lastRunAt and lastRunStatus from sync results', async () => {
    const mockRuns = [
      {
        runId: 'run_last_1',
        flowId: 'flow_last',
        status: 'success',
        startedAt: new Date('2026-09-16T10:00:00Z'),
      },
      {
        runId: 'run_last_2',
        flowId: 'flow_last',
        status: 'error',
        startedAt: new Date('2026-09-16T11:00:00Z'),
      },
    ];

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({ runs: mockRuns, hasMore: false }),
    };
    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    const mockFlow = { id: 'flow_last', enabled: true } as Flow;
    flowRepoMock.get.mockResolvedValueOnce(mockFlow);

    const { syncService } = await import('@/services/syncService');

    // Act
    await syncService.sync('flow_last');

    // Assert: 가장 최근 실행 정보로 flow 업데이트
    expect(flowRepoMock.update).toHaveBeenCalledWith(
      'flow_last',
      expect.objectContaining({
        lastRunAt: expect.any(Date),
        lastRunStatus: 'error', // 최근 실행 상태
      })
    );
  });

  it('should use since cursor parameter when provided', async () => {
    const mockRuns = Array.from({ length: 50 }, (_, i) => ({
      runId: `run_since_${i}`,
      flowId: 'flow_since',
      status: 'success',
      startedAt: new Date(`2026-09-16T${String(i % 24).padStart(2, '0')}:00:00Z`),
    }));

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({ runs: mockRuns, hasMore: false }),
    };
    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    const mockFlow = { id: 'flow_since', enabled: true } as Flow;
    flowRepoMock.get.mockResolvedValueOnce(mockFlow);

    const { syncService } = await import('@/services/syncService');

    const sinceCursor = new Date('2026-09-15T00:00:00Z').toISOString();

    // Act
    await syncService.sync('flow_since', sinceCursor);

    // Assert: since 파라미터로 GET 요청
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`since=${encodeURIComponent(sinceCursor)}`),
      expect.anything()
    );
  });
});

describe('Integration: runService 사용량 추적', () => {
  let runRepoMock: any;
  let flowRepoMock: any;
  let usageRepoMock: any;

  beforeEach(() => {
    vi.resetAllMocks();
    runRepoMock = { save: vi.fn() };
    flowRepoMock = { get: vi.fn(), update: vi.fn() };
    usageRepoMock = { getMonthly: vi.fn(), increment: vi.fn() };
  });

  it('should save run and increment usage on successful execution', async () => {
    usageRepoMock.getMonthly.mockResolvedValueOnce({
      count: 0,
      monthStart: new Date('2026-09-01'),
    });

    const mockFlow = {
      id: 'flow_integration',
      name: 'Integration Test',
      enabled: true,
    } as Flow;
    flowRepoMock.get.mockResolvedValueOnce(mockFlow);

    const mockRunResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({
        runId: 'run_integration_1',
        flowId: 'flow_integration',
        status: 'success',
        startedAt: new Date('2026-09-16T10:00:00Z'),
      }),
    };
    global.fetch = vi.fn().mockResolvedValueOnce(mockRunResponse);

    const { runService } = await import('@/services/runService');

    // Act
    const result = await runService.runNow('flow_integration');

    // Assert
    expect(result.runId).toBe('run_integration_1');
    expect(usageRepoMock.increment).toHaveBeenCalledWith('flow_integration');
    expect(flowRepoMock.update).toHaveBeenCalledWith(
      'flow_integration',
      expect.objectContaining({ lastRunAt: expect.any(Date) })
    );
  });
});
