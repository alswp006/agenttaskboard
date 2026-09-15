import type { Flow, FlowDraft } from '@/lib/types';
import { generateFlowId } from '@/lib/time';
import { FlowLimitError } from '@/lib/errors';
import { readEntity, writeEntity } from './shared';

const KEY = 'atb:flows';
const MAX_FLOWS = 50;

// Guarantees strictly increasing ISO timestamps even across same-millisecond calls,
// so createdAt/updatedAt reliably differ after an update.
let lastTimestampMs = 0;
function monotonicISOString(): string {
  let ms = Date.now();
  if (ms <= lastTimestampMs) ms = lastTimestampMs + 1;
  lastTimestampMs = ms;
  return new Date(ms).toISOString();
}

function readFlows(): Flow[] {
  return readEntity<Flow[]>(KEY, [], Array.isArray);
}

function writeFlows(flows: Flow[]): void {
  writeEntity(KEY, flows);
}

export interface CreateFlowInput {
  draft: FlowDraft;
  source: Flow['source'];
  templateId: string | null;
}

export const flowRepo = {
  list(): Flow[] {
    return readFlows();
  },

  get(id: string): Flow | null {
    return readFlows().find((f) => f.id === id) ?? null;
  },

  create(input: CreateFlowInput): Flow {
    const flows = readFlows();
    if (flows.length >= MAX_FLOWS) {
      throw new FlowLimitError(
        `FlowLimitError: 플로우는 최대 ${MAX_FLOWS}개까지 만들 수 있어요. 기존 플로우를 삭제해주세요`
      );
    }

    const now = monotonicISOString();
    const flow: Flow = {
      ...input.draft,
      id: generateFlowId(),
      source: input.source,
      templateId: input.templateId,
      enabled: false,
      nextRunAt: null,
      lastRunAt: null,
      lastRunStatus: null,
      createdAt: now,
      updatedAt: now,
    };

    flows.push(flow);
    writeFlows(flows);
    return flow;
  },

  update(id: string, draft: FlowDraft): Flow {
    const flows = readFlows();
    const idx = flows.findIndex((f) => f.id === id);
    if (idx === -1) {
      throw new Error('플로우를 찾을 수 없어요');
    }

    const updated: Flow = {
      ...flows[idx],
      ...draft,
      updatedAt: monotonicISOString(),
    };
    flows[idx] = updated;
    writeFlows(flows);
    return updated;
  },

  delete(id: string): void {
    writeFlows(readFlows().filter((f) => f.id !== id));
  },
};
