import type { RunLog } from '@/lib/types';
import { ERROR_CODES } from '@/lib/errors';
import { readEntity, writeEntity } from './shared';

const KEY = 'atb:runs';
const SYNC_KEY = 'atb:syncMeta';
const MAX_RUNS = 200;

export interface SyncMeta {
  lastSyncedAt: string | null;
}

function readRuns(): RunLog[] {
  return readEntity<RunLog[]>(KEY, [], Array.isArray);
}

function writeRuns(runs: RunLog[]): void {
  writeEntity(KEY, runs);
}

function byStartedAtAsc(a: RunLog, b: RunLog): number {
  return a.startedAt < b.startedAt ? -1 : a.startedAt > b.startedAt ? 1 : 0;
}

function dropOldest(runs: RunLog[]): RunLog[] {
  if (runs.length === 0) return runs;
  let oldestIdx = 0;
  for (let i = 1; i < runs.length; i++) {
    if (runs[i].startedAt < runs[oldestIdx].startedAt) oldestIdx = i;
  }
  return runs.filter((_, i) => i !== oldestIdx);
}

export const runRepo = {
  list(): RunLog[] {
    return [...readRuns()].sort(byStartedAtAsc);
  },

  get(id: string): RunLog | null {
    return readRuns().find((r) => r.id === id) ?? null;
  },

  add(run: RunLog): void {
    let runs = readRuns();
    runs.push(run);
    while (runs.length > MAX_RUNS) {
      runs = dropOldest(runs);
    }

    try {
      writeRuns(runs);
    } catch (err) {
      if (!(err instanceof Error) || err.message !== ERROR_CODES.STORAGE_FULL) {
        throw err;
      }
      // 용량 초과 — 오래된 로그를 추가로 비우고 한 번 더 시도한다.
      const trimmed = runs.slice(Math.ceil(runs.length / 2));
      writeRuns(trimmed);
    }
  },

  setSyncMetadata(meta: SyncMeta): void {
    writeEntity(SYNC_KEY, meta);
  },

  getSyncMetadata(): SyncMeta {
    return readEntity<SyncMeta>(SYNC_KEY, { lastSyncedAt: null });
  },
};
