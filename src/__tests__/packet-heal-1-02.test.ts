import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseJsonResponse,
  TruncatedResponseError,
  ParseErrorWithContext,
} from "@/pipeline/llm/parseJsonResponse";
import { runner } from "@/pipeline/runner";

// AC-1: max_tokens 절단 응답 감지 및 split-retry 실행
describe("AC-1: LLM 응답 절단 감지 (max_tokens)", () => {
  it("should throw TruncatedResponseError when stop_reason is 'max_tokens'", () => {

    const truncatedResponse = {
      stop_reason: "max_tokens",
      content: '[{"id": 1, "name": "incomplete',
    };

    expect(() => {
      parseJsonResponse(truncatedResponse);
    }).toThrow("TruncatedResponseError");
  });

  it("should include stop_reason in TruncatedResponseError message", () => {

    const truncatedResponse = {
      stop_reason: "max_tokens",
      content: '[{"id": 1',
    };

    try {
      parseJsonResponse(truncatedResponse);
      throw new Error("Should have thrown TruncatedResponseError");
    } catch (e: any) {
      const error = e as any;
      expect(error instanceof TruncatedResponseError || error.name === "TruncatedResponseError").toBe(true);
      expect(error.message).toContain("max_tokens");
      expect(error.stopReason).toBe("max_tokens");
    }
  });

  it("should trigger split-retry mechanism when truncation detected", async () => {

    const mockRetryFn = vi.fn().mockResolvedValue({ success: true });

    const truncatedResponse = {
      stop_reason: "max_tokens",
      content: '[{"packets": [1,2,3,4,5]',
      originalPrompt: "Generate packets for data",
    };

    try {
      await parseJsonResponse(truncatedResponse, { splitRetryFn: mockRetryFn });
    } catch (e: any) {
      // Expected to throw after retries
      expect(e instanceof TruncatedResponseError || e.name === "TruncatedResponseError").toBe(true);
    }

    // Verify split-retry was invoked at least once
    expect(mockRetryFn).toHaveBeenCalled();
  });

  it("should attempt max 2 levels of split-retry before giving up", async () => {

    const callCount = { value: 0 };
    const mockRetryFn = vi.fn().mockImplementation(() => {
      callCount.value++;
      // Simulate continued truncation
      if (callCount.value > 2) {
        throw new Error("Max retries exceeded");
      }
      return Promise.resolve({
        stop_reason: "max_tokens",
        content: "still truncated",
      });
    });

    const truncatedResponse = {
      stop_reason: "max_tokens",
      content: '[{"incomplete',
      originalPrompt: "test",
    };

    try {
      await parseJsonResponse(truncatedResponse, { splitRetryFn: mockRetryFn });
    } catch (e: any) {
      // Expected
    }

    // Should retry at most 2 times before giving up
    expect(mockRetryFn.mock.calls.length).toBeLessThanOrEqual(2);
  });
});

// AC-2: JSON 파싱 실패 시 상세 에러 로깅
describe("AC-2: JSON 파싱 실패 로깅 (stop_reason + 길이 + context)", () => {
  it("should include stop_reason in parse error details", () => {
    const malformedResponse = {
      stop_reason: "end_turn",
      content: '{"invalid json": [1,2,3',
    };

    try {
      parseJsonResponse(malformedResponse);
      throw new Error("Should have thrown parse error");
    } catch (e: any) {
      expect(e.stopReason).toBe("end_turn");
      expect(e.name).toBe("ParseErrorWithContext");
    }
  });

  it("should include total content length in error details", () => {
    const responseContent = '{"data": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}';
    const malformedResponse = {
      stop_reason: "end_turn",
      content: responseContent + '🔴invalid', // Intentionally malformed
    };

    try {
      parseJsonResponse(malformedResponse);
      throw new Error("Should have thrown parse error");
    } catch (e: any) {
      expect(e.totalLength).toBe(malformedResponse.content.length);
      expect(e.totalLength).toBeGreaterThan(0);
    }
  });

  it("should include 200-char context before and after parse failure point", () => {
    // Create a response with known structure to test context extraction
    const prefix = 'prefix_' + 'x'.repeat(250); // 257 chars
    const failurePoint = '🔴'; // Invalid JSON at this point
    const suffix = 'y'.repeat(250); // 250 chars after

    const responseContent = prefix + failurePoint + suffix;
    const malformedResponse = {
      stop_reason: "end_turn",
      content: responseContent,
    };

    try {
      parseJsonResponse(malformedResponse);
      throw new Error("Should have thrown parse error");
    } catch (e: any) {
      // Error should have contextBefore and contextAfter fields
      expect(e.contextBefore).toBeDefined();
      expect(e.contextAfter).toBeDefined();

      // Each context should be ~200 chars
      expect(e.contextBefore.length).toBeGreaterThanOrEqual(0);
      expect(e.contextBefore.length).toBeLessThanOrEqual(200);

      expect(e.contextAfter.length).toBeGreaterThanOrEqual(0);
      expect(e.contextAfter.length).toBeLessThanOrEqual(200);

      // The failure point should be near the boundary
      const combinedContext = e.contextBefore + e.contextAfter;
      expect(combinedContext).toContain('prefix_');
      expect(combinedContext).toContain('y');
    }
  });

  it("should log error details to pipeline_events", () => {
    // Mock pipeline_events recorder
    const mockPipelineEvents = vi.fn();

    const malformedResponse = {
      stop_reason: "end_turn",
      content: '{"incomplete": [1,2,3',
    };

    try {
      parseJsonResponse(malformedResponse, { recordEvent: mockPipelineEvents });
      throw new Error("Should have thrown parse error");
    } catch (e: any) {
      // Verify event was recorded
      expect(mockPipelineEvents).toHaveBeenCalled();

      // Verify event contains required fields
      const eventCall = mockPipelineEvents.mock.calls[0];
      const eventData = eventCall[0];

      expect(eventData.type).toBe("parse_error");
      expect(eventData.error).toBeDefined();
      expect(eventData.error.stopReason).toBe("end_turn");
      expect(eventData.error.totalLength).toBe(malformedResponse.content.length);
      expect(eventData.error.contextBefore).toBeDefined();
      expect(eventData.error.contextAfter).toBeDefined();
    }
  });

  it("should capture error position within response", () => {
    const responseContent = '{"valid": "data", "invalid": 🔴}';
    const malformedResponse = {
      stop_reason: "end_turn",
      content: responseContent,
    };

    try {
      parseJsonResponse(malformedResponse);
      throw new Error("Should have thrown parse error");
    } catch (e: any) {
      expect(e.failurePosition).toBeDefined();
      expect(typeof e.failurePosition).toBe("number");
      expect(e.failurePosition).toBeGreaterThanOrEqual(0);
      expect(e.failurePosition).toBeLessThanOrEqual(responseContent.length);
    }
  });
});

// AC-3: 러너 크래시 방지 및 heal 큐 라우팅
describe("AC-3: 워크패킷 생성 단계 예외 → heal_started 이벤트 기록", () => {
  let originalExit: NodeJS.Process["exit"];
  let exitCalled = false;
  let exitCode: number | undefined;

  beforeEach(() => {
    exitCalled = false;
    exitCode = undefined;
    // Mock process.exit to capture calls
    originalExit = process.exit;
    process.exit = vi.fn((code?: string | number) => {
      exitCalled = true;
      exitCode = typeof code === "string" ? parseInt(code, 10) : code;
      throw new Error("process.exit called");
    }) as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  it("should catch exceptions in generateWorkPackets and not exit process", async () => {
    const mockRecordEvent = vi.fn();
    const mockEnqueueHeal = vi.fn().mockResolvedValue({ queueId: "heal-001" });

    const mockGeneratePackets = vi.fn().mockRejectedValue(
      new Error("LLM response truncated and split-retry exhausted")
    );

    await runner(
      {
        generatePackets: mockGeneratePackets,
        recordEvent: mockRecordEvent,
        enqueueHeal: mockEnqueueHeal,
      }
    );

    // Verify exception was caught (not thrown to top level)
    expect(exitCalled).toBe(false);
    expect(exitCode).toBeUndefined();
  });

  it("should record heal_started event when exception occurs", async () => {
    const mockRecordEvent = vi.fn();
    const mockEnqueueHeal = vi.fn().mockResolvedValue({ queueId: "heal-001" });

    const thrownError = new Error("Parsing failed: max_tokens");
    const mockGeneratePackets = vi.fn().mockRejectedValue(thrownError);

    await runner({
      generatePackets: mockGeneratePackets,
      recordEvent: mockRecordEvent,
      enqueueHeal: mockEnqueueHeal,
    });

    // Verify heal_started event was recorded
    const healEventCall = mockRecordEvent.mock.calls.find(
      (call) => call[0].type === "heal_started"
    );

    expect(healEventCall).toBeDefined();
    expect(healEventCall![0]).toMatchObject({
      type: "heal_started",
      originalError: expect.any(String),
      timestamp: expect.any(Number),
    });
  });

  it("should enqueue packet to heal queue after exception", async () => {
    const mockRecordEvent = vi.fn();
    const mockEnqueueHeal = vi.fn().mockResolvedValue({ queueId: "heal-001" });

    const testPayload = { packets: [1, 2, 3] };
    const mockGeneratePackets = vi.fn().mockRejectedValue(
      new Error("LLM truncated")
    );

    await runner({
      generatePackets: mockGeneratePackets,
      recordEvent: mockRecordEvent,
      enqueueHeal: mockEnqueueHeal,
      payload: testPayload,
    });

    // Verify heal queue was invoked
    expect(mockEnqueueHeal).toHaveBeenCalled();

    const healCall = mockEnqueueHeal.mock.calls[0];
    expect(healCall[0]).toMatchObject({
      type: "work_packet_recovery",
      payload: testPayload,
    });
  });

  it("should include error details in heal event", async () => {
    const mockRecordEvent = vi.fn();
    const mockEnqueueHeal = vi.fn().mockResolvedValue({ queueId: "heal-002" });

    const errorMessage = "ParseErrorWithContext: max_tokens + 1024 chars";
    const mockGeneratePackets = vi.fn().mockRejectedValue(
      new Error(errorMessage)
    );

    await runner({
      generatePackets: mockGeneratePackets,
      recordEvent: mockRecordEvent,
      enqueueHeal: mockEnqueueHeal,
    });

    // Verify error message is captured in event
    const healEvent = mockRecordEvent.mock.calls.find(
      (call) => call[0].type === "heal_started"
    );

    expect(healEvent![0].originalError).toContain(errorMessage);
  });

  it("should continue processing after heal_started (no crash)", async () => {
    const mockRecordEvent = vi.fn();
    const mockEnqueueHeal = vi.fn().mockResolvedValue({ queueId: "heal-003" });

    const mockGeneratePackets = vi.fn()
      .mockRejectedValueOnce(new Error("First call fails"))
      .mockResolvedValueOnce({ success: true }); // Would succeed on next call

    const result = await runner({
      generatePackets: mockGeneratePackets,
      recordEvent: mockRecordEvent,
      enqueueHeal: mockEnqueueHeal,
    });

    // Verify function completes without throwing
    expect(result).toBeDefined();
    expect(result.healQueued).toBe(true);
  });
});

// Integration test: Full flow from truncation to heal
describe("Integration: LLM truncation → parse error → heal queue", () => {
  it("should flow from max_tokens through recovery without crash", async () => {
    const mockRecordEvent = vi.fn();
    const mockEnqueueHeal = vi.fn().mockResolvedValue({ queueId: "heal-int-001" });
    const mockRetryFn = vi.fn().mockRejectedValue(new Error("Max retries exceeded"));

    // Simulate LLM response with max_tokens
    const llmResponse = {
      stop_reason: "max_tokens",
      content: '[{"incomplete": [1,2,3',
    };

    // This should fail to parse and trigger recovery
    try {
      await parseJsonResponse(llmResponse, { splitRetryFn: mockRetryFn });
    } catch (e: any) {
      // Expected: TruncatedResponseError or ParseErrorWithContext
      expect(e).toBeDefined();
    }

    // Runner should catch this and queue for healing
    const runnerResult = await runner({
      generatePackets: async () => {
        throw new Error("LLM truncation + retry exhausted");
      },
      recordEvent: mockRecordEvent,
      enqueueHeal: mockEnqueueHeal,
    });

    expect(runnerResult.healQueued).toBe(true);
    expect(mockRecordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "heal_started" })
    );
  });
});
