import {
  WORK_PACKET_DETAIL_SCHEMA,
  WORK_PACKET_OVERVIEW_SCHEMA,
  type CallStructured,
  type GenerateWorkPacketsOptions,
  type GenerateWorkPacketsResult,
  type WorkPacket,
  type WorkPacketOverview,
} from "./schemas";

const DEFAULT_MAX_RETRIES = 2;
const DETAIL_MAX_TOKENS = 4000;

function buildOverviewPrompt(spec: unknown): string {
  return [
    "Generate a work packet overview list for the following SPEC.",
    "Return only the packets array — each item has id, title, and a one-line purpose (at most 100 characters).",
    `SPEC: ${JSON.stringify(spec)}`,
  ].join("\n");
}

function buildDetailPrompt(overview: WorkPacketOverview, spec: unknown): string {
  return [
    `Generate the detail for packet ${overview.id} ("${overview.title}").`,
    `Purpose: ${overview.purpose}`,
    `SPEC: ${JSON.stringify(spec)}`,
  ].join("\n");
}

function isValidOverviewItem(value: unknown): value is WorkPacketOverview {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<WorkPacketOverview>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.title === "string" &&
    typeof item.purpose === "string" &&
    item.purpose.length <= 100
  );
}

function isValidOverviewResponse(raw: unknown): raw is { packets: WorkPacketOverview[] } {
  if (!raw || typeof raw !== "object") return false;
  const packets = (raw as { packets?: unknown }).packets;
  return Array.isArray(packets) && packets.every(isValidOverviewItem);
}

function isValidDetail(raw: unknown): raw is WorkPacket {
  if (!raw || typeof raw !== "object") return false;
  const packet = raw as Partial<WorkPacket>;
  return (
    typeof packet.id === "string" &&
    packet.id.length > 0 &&
    typeof packet.title === "string" &&
    typeof packet.purpose === "string" &&
    typeof packet.description === "string" &&
    packet.description.length > 0 &&
    Array.isArray(packet.files) &&
    Array.isArray(packet.acceptanceCriteria)
  );
}

/**
 * Calls `attempt` up to `maxRetries + 1` times, accepting the first response that
 * passes `isValid`. Never throws — a schema violation or a rejected promise just
 * counts as a failed attempt so the caller can isolate failures per packet.
 */
async function callWithRetry<T>(
  attempt: () => Promise<unknown>,
  isValid: (raw: unknown) => raw is T,
  maxRetries: number
): Promise<T | null> {
  const totalAttempts = maxRetries + 1;
  for (let i = 0; i < totalAttempts; i++) {
    try {
      const raw = await attempt();
      if (isValid(raw)) return raw;
    } catch {
      // Treated as a failed attempt — retried like any other schema violation.
    }
  }
  return null;
}

/**
 * Generates work packets from a SPEC via chunked, schema-enforced LLM calls:
 * 1. One "overview" call returns { packets: WorkPacketOverview[] } (id/title/purpose only).
 * 2. One "detail" call per overview packet fills in description/files/acceptanceCriteria.
 * Each call goes through callWithRetry so a single bad packet can't crash the run —
 * it's marked status='failed' and the rest continue.
 */
export async function generateWorkPackets(
  spec: unknown,
  callStructured: CallStructured,
  options?: GenerateWorkPacketsOptions
): Promise<GenerateWorkPacketsResult> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;

  const overviewResponse = await callWithRetry(
    () => callStructured(buildOverviewPrompt(spec), WORK_PACKET_OVERVIEW_SCHEMA),
    isValidOverviewResponse,
    maxRetries
  );
  const overviews = overviewResponse?.packets ?? [];

  const failedIds: string[] = [];

  const packets = await Promise.all(
    overviews.map(async (overview): Promise<WorkPacket> => {
      const detail = await callWithRetry(
        () =>
          callStructured(buildDetailPrompt(overview, spec), WORK_PACKET_DETAIL_SCHEMA, {
            maxTokens: DETAIL_MAX_TOKENS,
          }),
        isValidDetail,
        maxRetries
      );

      if (!detail) {
        failedIds.push(overview.id);
        return {
          id: overview.id,
          title: overview.title,
          purpose: overview.purpose,
          description: "",
          files: [],
          acceptanceCriteria: [],
          status: "failed",
        };
      }

      return { ...detail, status: detail.status ?? "success" };
    })
  );

  return failedIds.length > 0 ? { packets, failedIds } : { packets };
}
