import type { PipelineEvent } from "./llm/parseJsonResponse";

export interface HealQueueRequest {
  type: string;
  payload?: unknown;
}

export interface HealQueueResult {
  queueId?: unknown;
}

export interface RunnerDeps {
  generatePackets: () => Promise<unknown>;
  recordEvent: (event: PipelineEvent) => void;
  enqueueHeal: (request: HealQueueRequest) => Promise<HealQueueResult>;
  payload?: unknown;
}

export interface RunnerResult {
  success?: boolean;
  result?: unknown;
  healQueued?: boolean;
  healQueueId?: unknown;
}

/**
 * Top-level pipeline entry point. A failure while generating work packets
 * (e.g. TruncatedResponseError/ParseErrorWithContext bubbling up from
 * parseJsonResponse) must not crash the process — it gets routed to the
 * heal queue instead so a later pass can recover the packet.
 */
export async function runner(deps: RunnerDeps): Promise<RunnerResult> {
  try {
    const result = await deps.generatePackets();
    return { success: true, result };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    deps.recordEvent({
      type: "heal_started",
      originalError: err.message,
      timestamp: Date.now(),
    });

    const healResult = await deps.enqueueHeal({
      type: "work_packet_recovery",
      payload: deps.payload,
    });

    return { healQueued: true, healQueueId: healResult?.queueId };
  }
}
