export type PacketStatus = "success" | "pending" | "failed";

export interface WorkPacketOverview {
  id: string;
  title: string;
  purpose: string; // one-line purpose, <=100 chars
}

export interface WorkPacket extends WorkPacketOverview {
  description: string;
  files: string[];
  acceptanceCriteria: string[];
  status?: PacketStatus;
}

export interface GenerateWorkPacketsResult {
  packets: WorkPacket[];
  failedIds?: string[];
}

export interface GenerateWorkPacketsOptions {
  maxRetries?: number;
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface CallStructuredCallOptions {
  maxTokens?: number;
}

export type CallStructured = (
  prompt: string,
  schema?: JSONSchema,
  options?: CallStructuredCallOptions
) => Promise<unknown>;

const PACKET_FIELD_PROPERTIES: Record<string, unknown> = {
  id: { type: "string", description: "Unique packet id, e.g. PKT-1" },
  title: { type: "string", description: "Short packet title" },
  purpose: {
    type: "string",
    maxLength: 100,
    description: "One-line purpose, at most 100 characters",
  },
  description: { type: "string", description: "Detailed implementation description" },
  files: {
    type: "array",
    items: { type: "string" },
    description: "Files to create or modify",
  },
  acceptanceCriteria: {
    type: "array",
    items: { type: "string" },
    description: "Acceptance criteria for this packet",
  },
  status: { type: "string", enum: ["success", "pending", "failed"] },
};

export const WORK_PACKET_OVERVIEW_SCHEMA: JSONSchema = {
  type: "object",
  properties: {
    ...PACKET_FIELD_PROPERTIES,
    packets: {
      type: "array",
      description: "List of work packet overviews (id, title, one-line purpose only)",
      items: {
        type: "object",
        properties: {
          id: PACKET_FIELD_PROPERTIES.id,
          title: PACKET_FIELD_PROPERTIES.title,
          purpose: PACKET_FIELD_PROPERTIES.purpose,
        },
        required: ["id", "title", "purpose"],
      },
    },
  },
  required: ["packets"],
};

export const WORK_PACKET_DETAIL_SCHEMA: JSONSchema = {
  type: "object",
  properties: PACKET_FIELD_PROPERTIES,
  required: ["id", "title", "purpose", "description", "files", "acceptanceCriteria"],
};
