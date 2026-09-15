import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RunLog } from '@/lib/types';

/**
 * PACKET-0006: 실행 · 스케줄 · 동기화 서비스
 *
 * AC-1[P0]: 사용량이 RUN_LIMIT와 같으면 runNow는 fetch 0회로 QUOTA_EXCEEDED를 반환한다
 * AC-2[P0]: DELETE가 500을 받으면 flow.enabled가 true로 유지되고 에러를 반환한다
 * AC-3[P0]: 동기화 응답이 100건이면 lastSyncedAt이 100번째 항목의 startedAt으로 저장된다
 *
 * 전체 구현·상세 테스트는 src/services/services.test.ts 참조.
 * (이 파일은 최초 자동 생성 시 UsageRecord/Flow.schedule/RunLog.runId 등 실제 도메인
 * 타입(src/types/*.ts, 패킷 0001·0005 확정 계약)과 불일치했던 초안이라 실제 계약에
 * 맞춰 다시 작성했다.)
 */

const flowRepoMock = { get: vi.fn(), patch: vi.fn() };
const runRepoMock = {
  add: vi.fn(),
  get: vi.fn(),
  setSyncMetadata: vi.fn(),
  getSyncMetadata: vi.fn(() => ({ lastSyncedAt: null })),
};
const usageRepoMock = { get: vi.fn(), addRun: vi.fn() };
const planRepoMock = { get: vi.fn(() => ({ tier: 'free', purchasedAt: null, expiresAt: null })) };

const startRunMock = vi.fn();
const updateScheduleMock = vi.fn();
const deleteScheduleMock = vi.fn();
const listRunsMock = vi.fn();

vi.mock('@/lib/repos/flowRepo', () => ({ flowRepo: flowRepoMock }));
vi.mock('@/lib/repos/runRepo', () => ({ runRepo: runRepoMock }));
vi.mock('@/lib/repos/usageRepo', () => ({ usageRepo: usageRepoMock }));
vi.mock('@/lib/repos/planRepo', () => ({ planRepo: planRepoMock }));
vi.mock('@/api/endpoints', () => ({
  startRun: startRunMock,
  updateSchedule: updateScheduleMock,
  deleteSchedule: deleteScheduleMock,
  listRuns: listRunsMock,
}));

function makeRun(overrides: Partial<RunLog> = {}): RunLog {
  return {
    id: 'run_000000000001',
    flowId: 'flow_abc12345',
    flowName: 'Test Flow',
    trigger: 'manual',
    status: 'success',
    startedAt: '2026-09-16T10:00:00.000Z',
    finishedAt: '2026-09-16T10:00:03.000Z',
    durationMs: 3000,
    aiOutput: null,
    steps: [],
    errorCode: null,
    errorMessage: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  planRepoMock.get.mockReturnValue({ tier: 'free', purchasedAt: null, expiresAt: null });
  runRepoMock.getSyncMetadata.mockReturnValue({ lastSyncedAt: null });
  runRepoMock.get.mockReturnValue(null);
  flowRepoMock.get.mockReturnValue({
    id: 'flow_abc12345',
    name: 'Test Flow',
    enabled: true,
    trigger: { type: 'manual' },
  });
});

describe('AC-1[P0]: runNow() - usage = RUN_LIMIT일 때 QUOTA_EXCEEDED', () => {
  it('should return QUOTA_EXCEEDED without calling the API when usage equals RUN_LIMIT', async () => {
    usageRepoMock.get.mockReturnValue({ month: '2026-09', runCount: 100 });

    const { runService } = await import('@/services/runService');

    await expect(runService.runNow('flow_abc12345')).rejects.toMatchObject({
      code: 'QUOTA_EXCEEDED',
    });
    expect(startRunMock).not.toHaveBeenCalled();
  });

  it('should call the run API and increment usage when usage is below RUN_LIMIT', async () => {
    usageRepoMock.get.mockReturnValue({ month: '2026-09', runCount: 99 });
    const run = makeRun();
    startRunMock.mockResolvedValueOnce(run);

    const { runService } = await import('@/services/runService');
    const result = await runService.runNow('flow_abc12345');

    expect(startRunMock).toHaveBeenCalledWith(
      expect.stringMatching(/^run_/),
      expect.objectContaining({ id: 'flow_abc12345' }),
      'manual',
    );
    expect(usageRepoMock.addRun).toHaveBeenCalledTimes(1);
    expect(result.id).toBe(run.id);
  });
});

describe('AC-2[P0]: scheduleService.disable() - 500 응답 시 enabled 유지', () => {
  it('should keep enabled=true and throw when DELETE responds 500', async () => {
    const { ApiError } = await import('@/api/client');
    deleteScheduleMock.mockRejectedValueOnce(
      new ApiError('SERVER_ERROR', '일시적인 오류가 발생했어요', 500)
    );

    const { scheduleService } = await import('@/services/scheduleService');

    await expect(scheduleService.disable('flow_abc12345')).rejects.toMatchObject({
      code: 'SERVER_ERROR',
    });
    expect(flowRepoMock.patch).not.toHaveBeenCalled();
  });

  it('should set enabled=false and call DELETE when response is 200', async () => {
    deleteScheduleMock.mockResolvedValueOnce({ success: true });
    flowRepoMock.patch.mockReturnValueOnce({
      id: 'flow_abc12345',
      enabled: false,
      nextRunAt: null,
    });

    const { scheduleService } = await import('@/services/scheduleService');
    const result = await scheduleService.disable('flow_abc12345');

    expect(deleteScheduleMock).toHaveBeenCalledWith('flow_abc12345');
    expect(flowRepoMock.patch).toHaveBeenCalledWith('flow_abc12345', {
      enabled: false,
      nextRunAt: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('AC-3[P0]: syncService.sync() - 100건 응답 시 lastSyncedAt 저장', () => {
  it('should save cursor to the 100th item startedAt when response has 100 runs', async () => {
    const runs = Array.from({ length: 100 }, (_, i) =>
      makeRun({
        id: `run_${String(i).padStart(12, '0')}`,
        startedAt: new Date(Date.UTC(2026, 8, 16, 0, i)).toISOString(),
      })
    );
    listRunsMock.mockResolvedValueOnce({ runs, total: 100 });

    const { syncService } = await import('@/services/syncService');
    const result = await syncService.sync();

    expect(runRepoMock.setSyncMetadata).toHaveBeenCalledWith({
      lastSyncedAt: runs[99].startedAt,
    });
    expect(result.synced).toBe(100);
  });

  it('should not save cursor when response has fewer than 100 runs', async () => {
    const runs = Array.from({ length: 50 }, (_, i) =>
      makeRun({
        id: `run_small_${i}`,
        startedAt: new Date(Date.UTC(2026, 8, 16, 0, i)).toISOString(),
      })
    );
    listRunsMock.mockResolvedValueOnce({ runs, total: 50 });

    const { syncService } = await import('@/services/syncService');
    await syncService.sync();

    expect(runRepoMock.setSyncMetadata).not.toHaveBeenCalled();
  });

  it('should use the since cursor parameter when provided', async () => {
    listRunsMock.mockResolvedValueOnce({ runs: [], total: 0 });
    const { syncService } = await import('@/services/syncService');

    const sinceCursor = new Date('2026-09-15T00:00:00Z').toISOString();
    await syncService.sync(sinceCursor);

    expect(listRunsMock).toHaveBeenCalledWith(sinceCursor, 100);
  });

  it('should not double-count usage when the same runId is synced twice', async () => {
    const run = makeRun({ id: 'run_dup_000000001' });
    const { syncService } = await import('@/services/syncService');

    listRunsMock.mockResolvedValueOnce({ runs: [run], total: 1 });
    runRepoMock.get.mockReturnValueOnce(null);
    await syncService.sync();
    expect(usageRepoMock.addRun).toHaveBeenCalledTimes(1);

    listRunsMock.mockResolvedValueOnce({ runs: [run], total: 1 });
    runRepoMock.get.mockReturnValueOnce(run);
    await syncService.sync();

    expect(usageRepoMock.addRun).toHaveBeenCalledTimes(1);
  });
});
