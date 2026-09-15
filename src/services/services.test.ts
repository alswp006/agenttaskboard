import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RunLog } from '@/lib/types';

/**
 * PACKET-0006: 실행 · 스케줄 · 동기화 서비스
 *
 * AC-1[P0]: 사용량이 RUN_LIMIT와 같으면 runNow는 fetch 0회로 QUOTA_EXCEEDED를 반환한다
 * AC-2[P0]: DELETE가 500을 받으면 flow.enabled가 true로 유지되고 에러를 반환한다
 * AC-3[P0]: 동기화 응답이 100건이면 lastSyncedAt이 100번째 항목의 startedAt으로 저장된다
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

describe('AC-1[P0]: runService.runNow — usage === RUN_LIMIT', () => {
  it('returns QUOTA_EXCEEDED and calls startRun 0 times when usage equals the free-tier limit', async () => {
    usageRepoMock.get.mockReturnValue({ month: '2026-09', runCount: 100 });

    const { runService } = await import('@/services/runService');

    await expect(runService.runNow('flow_abc12345')).rejects.toMatchObject({
      code: 'QUOTA_EXCEEDED',
    });
    expect(startRunMock).not.toHaveBeenCalled();
  });

  it('calls startRun, saves the run, and increments usage when below the limit', async () => {
    usageRepoMock.get.mockReturnValue({ month: '2026-09', runCount: 99 });
    const run = makeRun();
    startRunMock.mockResolvedValueOnce(run);

    const { runService } = await import('@/services/runService');
    const result = await runService.runNow('flow_abc12345');

    expect(startRunMock).toHaveBeenCalledWith('flow_abc12345', 'manual');
    expect(runRepoMock.add).toHaveBeenCalledWith(run);
    expect(usageRepoMock.addRun).toHaveBeenCalledTimes(1);
    expect(flowRepoMock.patch).toHaveBeenCalledWith('flow_abc12345', {
      lastRunAt: run.startedAt,
      lastRunStatus: run.status,
    });
    expect(result).toBe(run);
  });
});

describe('AC-2[P0]: scheduleService.disable — DELETE 500', () => {
  it('keeps flow.enabled=true and throws when DELETE responds 500', async () => {
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

  it('patches enabled=false and nextRunAt=null when DELETE succeeds', async () => {
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

describe('AC-3[P0]: syncService.sync — 100건 응답 시 커서 저장', () => {
  it('saves lastSyncedAt as the 100th run startedAt when the response is a full page', async () => {
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

  it('does not save a cursor when the response has fewer than 100 runs', async () => {
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
});

describe('DoD: 중복 runId는 사용량에 두 번 반영되지 않는다', () => {
  it('increments usage only once when the same runId is synced twice', async () => {
    const run = makeRun({ id: 'run_dup_000000001' });

    listRunsMock.mockResolvedValueOnce({ runs: [run], total: 1 });
    const { syncService } = await import('@/services/syncService');

    runRepoMock.get.mockReturnValueOnce(null);
    await syncService.sync();
    expect(usageRepoMock.addRun).toHaveBeenCalledTimes(1);

    listRunsMock.mockResolvedValueOnce({ runs: [run], total: 1 });
    runRepoMock.get.mockReturnValueOnce(run);
    await syncService.sync();

    expect(usageRepoMock.addRun).toHaveBeenCalledTimes(1);
    expect(runRepoMock.add).toHaveBeenCalledTimes(1);
  });

  it('updates flow.lastRunAt/lastRunStatus from the latest synced run', async () => {
    const olderRun = makeRun({
      id: 'run_older',
      startedAt: '2026-09-16T09:00:00.000Z',
      status: 'success',
    });
    const newerRun = makeRun({
      id: 'run_newer',
      startedAt: '2026-09-16T11:00:00.000Z',
      status: 'failed',
    });
    listRunsMock.mockResolvedValueOnce({ runs: [olderRun, newerRun], total: 2 });

    const { syncService } = await import('@/services/syncService');
    await syncService.sync();

    expect(flowRepoMock.patch).toHaveBeenCalledWith('flow_abc12345', {
      lastRunAt: newerRun.startedAt,
      lastRunStatus: 'failed',
    });
  });
});

describe('executeFlow — contract.ts executeFlowFn 계약 (runService.runNow 위임)', () => {
  it('delegates to runService.runNow and returns the same RunLog', async () => {
    usageRepoMock.get.mockReturnValue({ month: '2026-09', runCount: 0 });
    const run = makeRun();
    startRunMock.mockResolvedValueOnce(run);

    const { executeFlow } = await import('@/services/runService');
    const result = await executeFlow('flow_abc12345');

    expect(startRunMock).toHaveBeenCalledWith('flow_abc12345', 'manual');
    expect(result).toBe(run);
  });
});

describe('subscribeToRun — contract.ts subscribeToRunFn 계약 (폴링 기반 구독)', () => {
  it('calls back immediately with the run already stored locally', async () => {
    const run = makeRun();
    runRepoMock.get.mockReturnValue(run);

    const { subscribeToRun } = await import('@/services/syncService');
    const callback = vi.fn();
    const unsubscribe = subscribeToRun('run_000000000001', callback);

    expect(callback).toHaveBeenCalledWith(run);
    unsubscribe();
  });

  it('does not call back again when nothing changed after a poll', async () => {
    vi.useFakeTimers();
    const run = makeRun();
    runRepoMock.get.mockReturnValue(run);
    listRunsMock.mockResolvedValue({ runs: [], total: 0 });

    const { subscribeToRun } = await import('@/services/syncService');
    const callback = vi.fn();
    const unsubscribe = subscribeToRun('run_000000000001', callback);
    callback.mockClear();

    await vi.advanceTimersByTimeAsync(4000);

    expect(callback).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('calls back again when the run changes after a sync poll', async () => {
    vi.useFakeTimers();
    const original = makeRun({ status: 'success' });
    const updated = makeRun({ status: 'failed', finishedAt: '2026-09-16T10:05:00.000Z' });
    runRepoMock.get.mockReturnValueOnce(original).mockReturnValue(updated);
    listRunsMock.mockResolvedValue({ runs: [], total: 0 });

    const { subscribeToRun } = await import('@/services/syncService');
    const callback = vi.fn();
    const unsubscribe = subscribeToRun('run_000000000001', callback);
    callback.mockClear();

    await vi.advanceTimersByTimeAsync(4000);

    expect(callback).toHaveBeenCalledWith(updated);
    unsubscribe();
  });

  it('stops polling once unsubscribed', async () => {
    vi.useFakeTimers();
    const run = makeRun();
    runRepoMock.get.mockReturnValue(run);
    listRunsMock.mockResolvedValue({ runs: [], total: 0 });

    const { subscribeToRun } = await import('@/services/syncService');
    const callback = vi.fn();
    const unsubscribe = subscribeToRun('run_000000000001', callback);
    unsubscribe();
    listRunsMock.mockClear();

    await vi.advanceTimersByTimeAsync(8000);

    expect(listRunsMock).not.toHaveBeenCalled();
  });
});
