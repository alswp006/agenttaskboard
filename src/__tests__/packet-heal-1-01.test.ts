import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * AC-1: Large SPEC with CC-1~CC-10 + 5 Core Features
 * When generating work packets, expect:
 * - 1 overview call + N detail calls (N = number of packets)
 * - All JSON.parse calls succeed without exception
 * - Result contains N WorkPacket objects with all required fields
 */

/**
 * AC-2: Single packet detail call failure isolation
 * When a specific packet detail call fails schema validation 2x,
 * expect:
 * - That packet status='failed'
 * - Other packets status='pending' (or success if generated before failure)
 * - Process does NOT crash (continue() or catch properly)
 * - failedIds array includes the failed packet id
 */

/**
 * AC-3: Schema enforcement
 * When calling work packet detail endpoint,
 * expect:
 * - Response is tool_use-based structured output (not free-form JSON)
 * - No regex-based JSON extraction code path executes
 * - Schema validation error → retry up to 2x → then mark failed
 */

interface WorkPacketOverview {
  id: string;
  title: string;
  purpose: string; // ≤100 chars, one-liner
}

interface WorkPacket extends WorkPacketOverview {
  description: string;
  files: string[];
  acceptanceCriteria: string[];
  status?: "success" | "pending" | "failed";
}

interface GenerateWorkPacketsResult {
  packets: WorkPacket[];
  failedIds?: string[];
}

// ============================================================================
// AC-1: Large SPEC with CC-1~CC-10 + 5 Core Features
// ============================================================================

describe("AC-1: 대형 SPEC에서 워크패킷 생성 (개요 + 상세 분할)", () => {
  let mockLLMCalls: { type: string; attempt: number }[];

  beforeEach(() => {
    mockLLMCalls = [];
  });

  it("AC-1[P0]: should call overview once, then detail N times for N packets", async () => {
    // Arrange: Mock SPEC with 5 Core Features + 10 CCs
    const mockSpec = {
      coreFeatures: Array.from({ length: 5 }, (_, i) => ({
        id: `CF-${i + 1}`,
        name: `Core Feature ${i + 1}`,
        description: `Description for CF-${i + 1}`,
      })),
      contextClues: Array.from({ length: 10 }, (_, i) => ({
        id: `CC-${i + 1}`,
        text: `Context clue ${i + 1}`,
      })),
    };

    // Mock the LLM overview call
    const mockOverviewResponse: WorkPacketOverview[] = [
      { id: "PKT-1", title: "User Auth", purpose: "Implement OAuth login" },
      { id: "PKT-2", title: "Dashboard", purpose: "Display user metrics" },
      { id: "PKT-3", title: "Data Export", purpose: "Export user data to CSV" },
    ];

    // Mock the LLM detail calls
    const mockDetailResponses: Record<string, WorkPacket> = {
      "PKT-1": {
        id: "PKT-1",
        title: "User Auth",
        purpose: "Implement OAuth login",
        description: "Detailed auth implementation...",
        files: ["src/auth/login.ts", "src/auth/oauth.ts"],
        acceptanceCriteria: [
          "User can log in via OAuth",
          "Session persists across refresh",
        ],
        status: "success",
      },
      "PKT-2": {
        id: "PKT-2",
        title: "Dashboard",
        purpose: "Display user metrics",
        description: "Detailed dashboard implementation...",
        files: ["src/pages/Dashboard.tsx"],
        acceptanceCriteria: ["Dashboard renders all metrics", "Charts display correctly"],
        status: "success",
      },
      "PKT-3": {
        id: "PKT-3",
        title: "Data Export",
        purpose: "Export user data to CSV",
        description: "Detailed export implementation...",
        files: ["src/lib/export.ts"],
        acceptanceCriteria: ["CSV exports with correct headers"],
        status: "success",
      },
    };

    // Mock callStructured to track calls
    const mockCallStructured = vi.fn(async (prompt: string, schema?: any) => {
      if (prompt.includes("overview")) {
        mockLLMCalls.push({ type: "overview", attempt: 1 });
        return { packets: mockOverviewResponse };
      }
      // Extract packet ID from prompt (simple example)
      const packetMatch = prompt.match(/PKT-\d+/);
      if (packetMatch) {
        const packetId = packetMatch[0];
        mockLLMCalls.push({ type: "detail", attempt: 1 });
        return mockDetailResponses[packetId] || null;
      }
      throw new Error("Unknown prompt");
    });

    // Act: Call generateWorkPackets with mocked LLM
    const result = await generateWorkPackets(mockSpec, mockCallStructured);

    // Assert: Verify call counts
    expect(mockLLMCalls.filter((c) => c.type === "overview")).toHaveLength(1);
    expect(mockLLMCalls.filter((c) => c.type === "detail")).toHaveLength(
      mockOverviewResponse.length
    );

    // Assert: Verify result contains all packets
    expect(result.packets).toHaveLength(3);
    expect(result.packets.map((p) => p.id)).toEqual(["PKT-1", "PKT-2", "PKT-3"]);

    // Assert: Verify all packets have required fields
    result.packets.forEach((packet) => {
      expect(packet.id).toBeDefined();
      expect(packet.title).toBeDefined();
      expect(packet.purpose).toBeDefined();
      expect(packet.purpose.length).toBeLessThanOrEqual(100);
      expect(packet.description).toBeDefined();
      expect(Array.isArray(packet.files)).toBe(true);
      expect(Array.isArray(packet.acceptanceCriteria)).toBe(true);
    });

    // Assert: No failed packets
    expect(result.failedIds).toBeUndefined();
  });

  it("AC-1[P0]: should successfully parse all JSON responses without exception", async () => {
    const mockCallStructured = vi.fn(async (prompt: string) => {
      // Simulate returning valid JSON-parseable structure
      const validStructure = {
        packets: [
          {
            id: "PKT-A",
            title: "Feature A",
            purpose: "Implement A",
            description: "Detailed description",
            files: ["src/a.ts"],
            acceptanceCriteria: ["AC-1"],
            status: "success",
          },
        ],
      };
      // In real implementation, this would be parsed from tool_use response
      return validStructure;
    });

    const mockSpec = {
      coreFeatures: [{ id: "CF-1", name: "Feature", description: "Desc" }],
      contextClues: [],
    };

    // Act & Assert: Should not throw
    const result = await generateWorkPackets(mockSpec, mockCallStructured);
    expect(result.packets).toHaveLength(1);
    expect(result.packets[0].id).toBe("PKT-A");
  });
});

// ============================================================================
// AC-2: Single Packet Failure Isolation
// ============================================================================

describe("AC-2: 단일 패킷 실패 격리 (crash 안 함, failed 마킹)", () => {
  it("AC-2[P0]: should mark only failed packet as 'failed', others as 'pending/success'", async () => {
    const mockOverviewResponse: WorkPacketOverview[] = [
      { id: "PKT-1", title: "Good Packet", purpose: "This works" },
      { id: "PKT-2", title: "Bad Packet", purpose: "This will fail" },
      { id: "PKT-3", title: "Good Packet 2", purpose: "This works too" },
    ];

    let detailCallCount = 0;

    const mockCallStructured = vi.fn(async (prompt: string) => {
      if (prompt.includes("overview")) {
        return { packets: mockOverviewResponse };
      }

      // PKT-2 fails validation 2x, then returns failed status
      if (prompt.includes("PKT-2")) {
        detailCallCount++;
        if (detailCallCount <= 2) {
          // Simulate schema validation failure
          throw new Error("Schema validation failed: missing required field 'description'");
        }
        return {
          id: "PKT-2",
          title: "Bad Packet",
          purpose: "This will fail",
          description: null, // Invalid
          files: [],
          acceptanceCriteria: [],
          status: "failed",
        };
      }

      // Others succeed
      return {
        id: prompt.includes("PKT-1") ? "PKT-1" : "PKT-3",
        title: prompt.includes("PKT-1") ? "Good Packet" : "Good Packet 2",
        purpose: prompt.includes("PKT-1") ? "This works" : "This works too",
        description: "Valid description",
        files: ["src/file.ts"],
        acceptanceCriteria: ["Valid AC"],
        status: "success",
      };
    });

    const mockSpec = {
      coreFeatures: [],
      contextClues: [],
    };

    // Act
    const result = await generateWorkPackets(mockSpec, mockCallStructured, {
      maxRetries: 2,
    });

    // Assert: Process did not crash
    expect(result).toBeDefined();

    // Assert: Failed packet marked as 'failed'
    const failedPacket = result.packets.find((p) => p.id === "PKT-2");
    expect(failedPacket?.status).toBe("failed");

    // Assert: Other packets are 'success' or 'pending'
    const goodPacket1 = result.packets.find((p) => p.id === "PKT-1");
    expect(["success", "pending"]).toContain(goodPacket1?.status);

    const goodPacket3 = result.packets.find((p) => p.id === "PKT-3");
    expect(["success", "pending"]).toContain(goodPacket3?.status);

    // Assert: failedIds includes PKT-2
    expect(result.failedIds).toContain("PKT-2");
  });

  it("AC-2[P0]: should continue processing after one packet fails, not crash entire pipeline", async () => {
    const mockOverviewResponse: WorkPacketOverview[] = [
      { id: "PKT-X", title: "Packet X", purpose: "X" },
      { id: "PKT-Y", title: "Packet Y", purpose: "Y" },
    ];

    const mockCallStructured = vi.fn(async (prompt: string) => {
      if (prompt.includes("overview")) {
        return { packets: mockOverviewResponse };
      }

      if (prompt.includes("PKT-X")) {
        throw new Error("LLM error on PKT-X");
      }

      // PKT-Y should still be processed
      return {
        id: "PKT-Y",
        title: "Packet Y",
        purpose: "Y",
        description: "Valid",
        files: ["src/y.ts"],
        acceptanceCriteria: ["AC-Y"],
        status: "success",
      };
    });

    const mockSpec = { coreFeatures: [], contextClues: [] };

    // Act: Should not throw
    const result = await generateWorkPackets(mockSpec, mockCallStructured, {
      maxRetries: 1,
    });

    // Assert: Result is valid, not undefined/null
    expect(result).toBeDefined();
    expect(result.packets).toBeDefined();
    expect(Array.isArray(result.packets)).toBe(true);

    // Assert: PKT-X is failed, PKT-Y is succeeded
    expect(result.packets.some((p) => p.id === "PKT-X" && p.status === "failed")).toBe(
      true
    );
    expect(result.packets.some((p) => p.id === "PKT-Y" && p.status === "success")).toBe(
      true
    );
  });
});

// ============================================================================
// AC-3: Schema Enforcement (tool_use-based structured output)
// ============================================================================

describe("AC-3: 스키마 강제 (tool_use 기반, 정규식 추출 금지)", () => {
  it("AC-3[P0]: should use tool_use structured output, not regex-based extraction", async () => {
    // Track which code path was used
    let usedToolUse = false;
    let usedRegexExtraction = false;

    // Mock callStructured to verify it's called with schema parameter
    const mockCallStructured = vi.fn(async (prompt: string, schema: any) => {
      // Verify schema is provided (indicates tool_use mode, not free-form)
      if (schema) {
        usedToolUse = true;
      } else {
        usedRegexExtraction = true;
      }

      return {
        id: "PKT-SCHEMA",
        title: "Schema Test",
        purpose: "Test",
        description: "Valid description",
        files: ["src/test.ts"],
        acceptanceCriteria: ["Test AC"],
        status: "success",
      };
    });

    const mockSpec = { coreFeatures: [], contextClues: [] };

    // Act
    await generateWorkPackets(mockSpec, mockCallStructured);

    // Assert: tool_use was used (schema parameter provided)
    expect(usedToolUse).toBe(true);

    // Assert: regex extraction was NOT used
    expect(usedRegexExtraction).toBe(false);

    // Assert: callStructured was called with schema parameter at least once
    expect(mockCallStructured).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        // Schema object should have properties defining the expected structure
        properties: expect.objectContaining({
          id: expect.anything(),
          title: expect.anything(),
          description: expect.anything(),
        }),
      })
    );
  });

  it("AC-3[P0]: should validate response against schema, retry on mismatch", async () => {
    let callCount = 0;

    const mockCallStructured = vi.fn(async (prompt: string, schema: any) => {
      callCount++;

      if (prompt.includes("PKT-INVALID")) {
        // First two calls return invalid schema (missing description)
        if (callCount <= 2) {
          return {
            id: "PKT-INVALID",
            title: "Invalid",
            purpose: "Missing description",
            // description is missing — schema violation
            files: [],
            acceptanceCriteria: [],
          };
        }
        // Third call returns valid response
        return {
          id: "PKT-INVALID",
          title: "Invalid",
          purpose: "Missing description",
          description: "Now valid", // Retry succeeded
          files: ["src/file.ts"],
          acceptanceCriteria: ["AC"],
          status: "success",
        };
      }

      return {
        id: "PKT-VALID",
        title: "Valid",
        purpose: "Valid",
        description: "Valid",
        files: [],
        acceptanceCriteria: [],
        status: "success",
      };
    });

    const mockSpec = { coreFeatures: [], contextClues: [] };

    // Act
    const result = await generateWorkPackets(mockSpec, mockCallStructured, {
      maxRetries: 2,
    });

    // Assert: Result is valid
    expect(result).toBeDefined();

    // Assert: callStructured was called multiple times for schema validation + retry
    expect(mockCallStructured).toHaveBeenCalledTimes(expect.any(Number));
    expect(mockCallStructured.mock.calls.length).toBeGreaterThan(1);

    // Assert: Responses passed validation or were marked failed
    result.packets.forEach((packet) => {
      expect(["success", "failed", "pending"]).toContain(packet.status);
    });
  });

  it("AC-3[P1]: should not execute regex-based JSON extraction code path", async () => {
    const codePathTracker = {
      regexUsed: false,
      toolUseUsed: false,
    };

    // Mock callStructured
    const mockCallStructured = vi.fn(async (prompt: string, schema: any) => {
      if (schema) {
        codePathTracker.toolUseUsed = true;
      } else {
        codePathTracker.regexUsed = true;
      }
      return {
        id: "PKT-1",
        title: "Test",
        purpose: "Test",
        description: "Test",
        files: [],
        acceptanceCriteria: [],
        status: "success",
      };
    });

    const mockSpec = { coreFeatures: [], contextClues: [] };

    // Act
    await generateWorkPackets(mockSpec, mockCallStructured);

    // Assert: tool_use was used, NOT regex extraction
    expect(codePathTracker.toolUseUsed).toBe(true);
    expect(codePathTracker.regexUsed).toBe(false);
  });

  it("AC-3[P1]: should set max_tokens=4000 for packet detail calls, not unlimited", async () => {
    const callDetails: Array<{ prompt: string; schema?: any; maxTokens?: number }> =
      [];

    const mockCallStructured = vi.fn(
      async (prompt: string, schema: any, options?: { maxTokens?: number }) => {
        callDetails.push({ prompt, schema: !!schema, maxTokens: options?.maxTokens });

        if (prompt.includes("overview")) {
          return {
            packets: [
              { id: "PKT-1", title: "Packet", purpose: "Test" },
            ],
          };
        }

        return {
          id: "PKT-1",
          title: "Packet",
          purpose: "Test",
          description: "Valid description",
          files: ["src/file.ts"],
          acceptanceCriteria: ["AC"],
          status: "success",
        };
      }
    );

    const mockSpec = { coreFeatures: [], contextClues: [] };

    // Act
    await generateWorkPackets(mockSpec, mockCallStructured);

    // Assert: Detail calls have maxTokens set
    const detailCalls = callDetails.filter((c) => c.prompt.includes("detail"));
    expect(detailCalls.length).toBeGreaterThan(0);

    // Assert: maxTokens is approximately 4000 (allow some variation)
    detailCalls.forEach((call) => {
      expect(call.maxTokens).toBeDefined();
      expect(call.maxTokens).toBeGreaterThanOrEqual(3000); // Min threshold
      expect(call.maxTokens).toBeLessThanOrEqual(5000); // Max threshold (around 4000)
    });
  });
});

// ============================================================================
// Chunking & Sequential Processing
// ============================================================================

describe("Chunking: 청크 분할 & 순차 처리", () => {
  it("should call overview first, then process detail calls in sequence/parallel", async () => {
    const callSequence: string[] = [];

    const mockCallStructured = vi.fn(async (prompt: string) => {
      if (prompt.includes("overview")) {
        callSequence.push("overview");
        return {
          packets: [
            { id: "PKT-A", title: "A", purpose: "A" },
            { id: "PKT-B", title: "B", purpose: "B" },
          ],
        };
      }

      if (prompt.includes("PKT-A")) {
        callSequence.push("detail-A");
        return {
          id: "PKT-A",
          title: "A",
          purpose: "A",
          description: "Details A",
          files: ["a.ts"],
          acceptanceCriteria: ["AC-A"],
          status: "success",
        };
      }

      if (prompt.includes("PKT-B")) {
        callSequence.push("detail-B");
        return {
          id: "PKT-B",
          title: "B",
          purpose: "B",
          description: "Details B",
          files: ["b.ts"],
          acceptanceCriteria: ["AC-B"],
          status: "success",
        };
      }
    });

    const mockSpec = { coreFeatures: [], contextClues: [] };

    // Act
    const result = await generateWorkPackets(mockSpec, mockCallStructured);

    // Assert: Overview was called first
    expect(callSequence[0]).toBe("overview");

    // Assert: Detail calls happened after overview
    expect(callSequence.slice(1)).toContain("detail-A");
    expect(callSequence.slice(1)).toContain("detail-B");

    // Assert: Both packets were generated
    expect(result.packets).toHaveLength(2);
  });

  it("should generate N detail calls for N overview packets", async () => {
    const overviewPackets = 7; // Arbitrary number
    let detailCallCount = 0;

    const mockCallStructured = vi.fn(async (prompt: string) => {
      if (prompt.includes("overview")) {
        return {
          packets: Array.from({ length: overviewPackets }, (_, i) => ({
            id: `PKT-${i}`,
            title: `Packet ${i}`,
            purpose: `Purpose ${i}`,
          })),
        };
      }

      // Count detail calls
      detailCallCount++;

      // Extract packet ID from prompt
      const match = prompt.match(/PKT-(\d+)/);
      const idx = match ? parseInt(match[1], 10) : 0;

      return {
        id: `PKT-${idx}`,
        title: `Packet ${idx}`,
        purpose: `Purpose ${idx}`,
        description: `Details ${idx}`,
        files: [`file-${idx}.ts`],
        acceptanceCriteria: [`AC-${idx}`],
        status: "success",
      };
    });

    const mockSpec = { coreFeatures: [], contextClues: [] };

    // Act
    const result = await generateWorkPackets(mockSpec, mockCallStructured);

    // Assert: Exact number of detail calls = overview packets
    expect(detailCallCount).toBe(overviewPackets);

    // Assert: Result has all packets
    expect(result.packets).toHaveLength(overviewPackets);
  });
});
});

// ============================================================================
// Helper: generateWorkPackets function signature
// ============================================================================

/**
 * Generates work packets from a SPEC via chunked LLM calls.
 *
 * Flow:
 * 1. Call callStructured with "overview" prompt → get WorkPacketOverview[]
 * 2. For each overview, call callStructured with "detail" prompt → get WorkPacket
 * 3. On schema error, retry up to maxRetries times
 * 4. On final failure, mark packet status='failed' and continue
 * 5. Return { packets: [...], failedIds: [...] }
 */
async function generateWorkPackets(
  spec: any,
  callStructured: (prompt: string, schema?: any) => Promise<any>,
  options?: { maxRetries?: number }
): Promise<GenerateWorkPacketsResult> {
  // This is a placeholder — the actual implementation will be in src/pipeline/design/generateWorkPackets.ts
  // For now, throw to indicate not implemented
  throw new Error(
    "generateWorkPackets not yet implemented — Coder will implement based on tests"
  );
}
