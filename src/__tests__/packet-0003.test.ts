import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Flow, FlowDraft } from "@/lib/types";
import type { RunLog } from "@/lib/types";
import type { UsageState, PlanState } from "@/lib/types";

/**
 * Entity Repositories Test Suite (packet-0003)
 *
 * These tests are TDD red phase — they will fail until the Coder implements
 * the repositories (flowRepo, runRepo, usageRepo, planRepo, clientRepo).
 *
 * Each test maps to one AC (Acceptance Criterion) in the SPEC.
 */

// Mock localStorage for isolated testing
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  setItem(key: string, value: string) {
    // Simulate QuotaExceededError when explicitly mocked
    if (this.simulateQuotaExceeded) {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    }
    this.store.set(key, value);
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  simulateQuotaExceeded = false;
}

let mockStorage: MockLocalStorage;

beforeEach(() => {
  mockStorage = new MockLocalStorage();
  // Mock global localStorage
  vi.stubGlobal("localStorage", mockStorage);
});

describe("flowRepo — Flow CRUD with 50-item limit", () => {
  // AC-1[P0]: Flow limit enforcement
  it("AC-1[P0]: should throw FlowLimitError when creating 51st flow", async () => {
    // We need to mock or import flowRepo when it exists
    // For now, this test describes the expected behavior
    const { flowRepo } = await import("@/lib/repos/flowRepo");

    // Create 50 valid flows
    const validFlows: Flow[] = [];
    for (let i = 0; i < 50; i++) {
      const flow = flowRepo.create({
        draft: {
          name: `Flow ${i}`,
          input: { type: "text", text: "sample" },
          trigger: { type: "manual" },
          aiStep: { task: "summarize", instruction: "", targetLanguage: null },
          actions: [{ type: "in_app" }],
        },
        source: "manual",
        templateId: null,
      });
      validFlows.push(flow);
    }

    expect(validFlows).toHaveLength(50);
    expect(flowRepo.list()).toHaveLength(50);

    // Attempt to create 51st — should throw FlowLimitError
    const draft: FlowDraft = {
      name: "Flow 51",
      input: { type: "text", text: "sample" },
      trigger: { type: "manual" },
      aiStep: { task: "summarize", instruction: "", targetLanguage: null },
      actions: [{ type: "in_app" }],
    };

    expect(() =>
      flowRepo.create({ draft, source: "manual", templateId: null })
    ).toThrow(/FlowLimitError|too many/i);

    // Count should remain 50
    expect(flowRepo.list()).toHaveLength(50);
  });

  // Additional: flow CRUD operations
  it("should create a flow with correct ID format (flow_xxxxxxxx)", async () => {
    const { flowRepo } = await import("@/lib/repos/flowRepo");
    mockStorage.clear();

    const draft: FlowDraft = {
      name: "Test Flow",
      input: { type: "text", text: "test data" },
      trigger: { type: "manual" },
      aiStep: { task: "summarize", instruction: "", targetLanguage: null },
      actions: [{ type: "in_app" }],
    };

    const flow = flowRepo.create({ draft, source: "manual", templateId: null });

    expect(flow.id).toMatch(/^flow_[0-9a-z]{8}$/);
    expect(flow.name).toBe("Test Flow");
    expect(flow.enabled).toBe(false);
    expect(flow.lastRunAt).toBeNull();
    expect(flow.lastRunStatus).toBeNull();
  });

  it("should list flows in creation order (or by updatedAt)", async () => {
    const { flowRepo } = await import("@/lib/repos/flowRepo");
    mockStorage.clear();

    const flow1 = flowRepo.create({
      draft: {
        name: "First",
        input: { type: "text", text: "a" },
        trigger: { type: "manual" },
        aiStep: { task: "summarize", instruction: "", targetLanguage: null },
        actions: [{ type: "in_app" }],
      },
      source: "manual",
      templateId: null,
    });

    const flow2 = flowRepo.create({
      draft: {
        name: "Second",
        input: { type: "text", text: "b" },
        trigger: { type: "manual" },
        aiStep: { task: "summarize", instruction: "", targetLanguage: null },
        actions: [{ type: "in_app" }],
      },
      source: "manual",
      templateId: null,
    });

    const flows = flowRepo.list();
    expect(flows).toHaveLength(2);
    expect(flows[0].id).toBe(flow1.id);
    expect(flows[1].id).toBe(flow2.id);
  });

  it("should update a flow", async () => {
    const { flowRepo } = await import("@/lib/repos/flowRepo");
    mockStorage.clear();

    const flow = flowRepo.create({
      draft: {
        name: "Original",
        input: { type: "text", text: "a" },
        trigger: { type: "manual" },
        aiStep: { task: "summarize", instruction: "", targetLanguage: null },
        actions: [{ type: "in_app" }],
      },
      source: "manual",
      templateId: null,
    });

    const updated = flowRepo.update(flow.id, {
      name: "Updated",
      input: { type: "text", text: "b" },
      trigger: { type: "manual" },
      aiStep: { task: "summarize", instruction: "", targetLanguage: null },
      actions: [{ type: "in_app" }],
    });

    expect(updated.name).toBe("Updated");
    expect(updated.updatedAt).not.toBe(flow.updatedAt);
  });

  it("should delete a flow", async () => {
    const { flowRepo } = await import("@/lib/repos/flowRepo");
    mockStorage.clear();

    const flow = flowRepo.create({
      draft: {
        name: "To Delete",
        input: { type: "text", text: "a" },
        trigger: { type: "manual" },
        aiStep: { task: "summarize", instruction: "", targetLanguage: null },
        actions: [{ type: "in_app" }],
      },
      source: "manual",
      templateId: null,
    });

    flowRepo.delete(flow.id);
    expect(flowRepo.list()).toHaveLength(0);
  });
});

describe("runRepo — RunLog with 200-item limit and auto-truncation", () => {
  // AC-2[P0]: Run log truncation (keep 200, delete oldest)
  it("AC-2[P0]: should delete oldest run when adding 201st", async () => {
    const { runRepo } = await import("@/lib/repos/runRepo");
    mockStorage.clear();

    // Create 200 runs with distinct startedAt timestamps
    const runs: RunLog[] = [];
    for (let i = 0; i < 200; i++) {
      const run: RunLog = {
        id: `run_${String(i).padStart(12, "0")}`,
        flowId: "flow_test",
        flowName: "Test Flow",
        trigger: "manual",
        status: "success",
        startedAt: new Date(2026, 8, 1 + Math.floor(i / 6)).toISOString(), // Spread across days
        finishedAt: new Date(2026, 8, 1 + Math.floor(i / 6), 1, 0).toISOString(),
        durationMs: 1000,
        aiOutput: null,
        steps: [],
        errorCode: null,
        errorMessage: null,
      };
      runRepo.add(run);
      runs.push(run);
    }

    expect(runRepo.list()).toHaveLength(200);
    const oldestBefore = runRepo.list()[0];

    // Add 201st
    const newRun: RunLog = {
      id: "run_000000000201",
      flowId: "flow_test",
      flowName: "Test Flow",
      trigger: "manual",
      status: "success",
      startedAt: new Date(2026, 8, 20).toISOString(),
      finishedAt: new Date(2026, 8, 20, 1, 0).toISOString(),
      durationMs: 1000,
      aiOutput: null,
      steps: [],
      errorCode: null,
      errorMessage: null,
    };

    runRepo.add(newRun);

    // Should stay at 200
    const allRuns = runRepo.list();
    expect(allRuns).toHaveLength(200);

    // Oldest should be gone
    expect(allRuns.some((r: RunLog) => r.id === oldestBefore.id)).toBe(false);

    // New run should be present
    expect(allRuns.some((r: RunLog) => r.id === newRun.id)).toBe(true);
  });

  it("should add run and maintain list", async () => {
    const { runRepo } = await import("@/lib/repos/runRepo");
    mockStorage.clear();

    const run: RunLog = {
      id: "run_000000000001",
      flowId: "flow_abc123",
      flowName: "Morning News",
      trigger: "schedule",
      status: "success",
      startedAt: new Date().toISOString(),
      finishedAt: new Date(Date.now() + 5000).toISOString(),
      durationMs: 5000,
      aiOutput: "News summary here",
      steps: [
        {
          stage: "trigger",
          label: "Fetch news",
          status: "success",
          message: null,
        },
      ],
      errorCode: null,
      errorMessage: null,
    };

    runRepo.add(run);

    const runs = runRepo.list();
    expect(runs).toHaveLength(1);
    expect(runs[0].id).toBe("run_000000000001");
    expect(runs[0].aiOutput).toBe("News summary here");
  });

  it("should get a run by ID", async () => {
    const { runRepo } = await import("@/lib/repos/runRepo");
    mockStorage.clear();

    const run: RunLog = {
      id: "run_test123456789",
      flowId: "flow_abc",
      flowName: "Test",
      trigger: "manual",
      status: "failed",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      durationMs: null,
      aiOutput: null,
      steps: [],
      errorCode: "NETWORK_ERROR",
      errorMessage: "Connection timeout",
    };

    runRepo.add(run);
    const retrieved = runRepo.get("run_test123456789");

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe("run_test123456789");
    expect(retrieved?.errorCode).toBe("NETWORK_ERROR");
  });

  it("should update sync metadata", async () => {
    const { runRepo } = await import("@/lib/repos/runRepo");
    mockStorage.clear();

    const syncTime = new Date().toISOString();
    runRepo.setSyncMetadata({ lastSyncedAt: syncTime });

    const meta = runRepo.getSyncMetadata();
    expect(meta.lastSyncedAt).toBe(syncTime);
  });
});

describe("usageRepo — Usage with KST month-based reset", () => {
  // AC-3[P0]: Month auto-reset on read
  it("AC-3[P0]: should reset runCount to 0 when month changed (KST)", async () => {
    const { usageRepo } = await import("@/lib/repos/usageRepo");
    mockStorage.clear();

    // Set up usage from previous month
    const previousMonth = "2026-08";
    mockStorage.setItem(
      "atb:usage",
      JSON.stringify({ month: previousMonth, runCount: 87 })
    );

    // Mock current date to next month (September in KST)
    const mockNow = new Date("2026-09-01T00:05:00+09:00");
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    const usage = usageRepo.get();

    expect(usage.month).toBe("2026-09");
    expect(usage.runCount).toBe(0);

    vi.useRealTimers();
  });

  it("should preserve runCount if month hasn't changed", async () => {
    const { usageRepo } = await import("@/lib/repos/usageRepo");
    mockStorage.clear();

    const currentMonth = "2026-09";
    mockStorage.setItem(
      "atb:usage",
      JSON.stringify({ month: currentMonth, runCount: 42 })
    );

    const mockNow = new Date("2026-09-15T12:00:00+09:00");
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    const usage = usageRepo.get();

    expect(usage.month).toBe("2026-09");
    expect(usage.runCount).toBe(42);

    vi.useRealTimers();
  });

  it("should increment runCount on addRun", async () => {
    const { usageRepo } = await import("@/lib/repos/usageRepo");
    mockStorage.clear();

    const mockNow = new Date("2026-09-15T12:00:00+09:00");
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    const initial = usageRepo.get();
    expect(initial.runCount).toBe(0);

    usageRepo.addRun();
    const after1 = usageRepo.get();
    expect(after1.runCount).toBe(1);

    usageRepo.addRun();
    const after2 = usageRepo.get();
    expect(after2.runCount).toBe(2);

    vi.useRealTimers();
  });

  it("should return default usage on first call", async () => {
    const { usageRepo } = await import("@/lib/repos/usageRepo");
    mockStorage.clear();

    const mockNow = new Date("2026-09-15T12:00:00+09:00");
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    const usage = usageRepo.get();

    expect(usage).toEqual({
      month: "2026-09",
      runCount: 0,
    });

    vi.useRealTimers();
  });
});

describe("planRepo — Plan tier and expiration", () => {
  it("should return default free plan on first call", async () => {
    const { planRepo } = await import("@/lib/repos/planRepo");
    mockStorage.clear();

    const plan = planRepo.get();

    expect(plan.tier).toBe("free");
    expect(plan.purchasedAt).toBeNull();
    expect(plan.expiresAt).toBeNull();
  });

  it("should set and get plan", async () => {
    const { planRepo } = await import("@/lib/repos/planRepo");
    mockStorage.clear();

    const newPlan: PlanState = {
      tier: "pro",
      purchasedAt: "2026-09-01T00:00:00Z",
      expiresAt: "2027-09-01T00:00:00Z",
    };

    planRepo.set(newPlan);
    const retrieved = planRepo.get();

    expect(retrieved.tier).toBe("pro");
    expect(retrieved.purchasedAt).toBe("2026-09-01T00:00:00Z");
    expect(retrieved.expiresAt).toBe("2027-09-01T00:00:00Z");
  });

  it("should parse and restore corrupted plan data", async () => {
    const { planRepo } = await import("@/lib/repos/planRepo");
    mockStorage.clear();

    // Set corrupted data
    mockStorage.setItem("atb:plan", "{broken");

    const plan = planRepo.get();

    // Should return default and backup the corrupted value
    expect(plan.tier).toBe("free");
    expect(mockStorage.getItem("atb:plan:backup")).toBe("{broken");
  });
});

describe("clientRepo — Client ID and AI notice acknowledgment", () => {
  it("should generate and persist UUID clientId on first call", async () => {
    const { clientRepo } = await import("@/lib/repos/clientRepo");
    mockStorage.clear();

    const clientId1 = clientRepo.getClientId();

    expect(clientId1).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    // Second call should return same ID
    const clientId2 = clientRepo.getClientId();
    expect(clientId2).toBe(clientId1);
  });

  it("should acknowledge AI notice", async () => {
    const { clientRepo } = await import("@/lib/repos/clientRepo");
    mockStorage.clear();

    expect(clientRepo.hasAiNoticeAck()).toBe(false);

    const mockNow = new Date().toISOString();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(mockNow));

    clientRepo.acknowledgeAiNotice();

    expect(clientRepo.hasAiNoticeAck()).toBe(true);

    vi.useRealTimers();
  });

  it("should persist AI notice ack across loads", async () => {
    const { clientRepo } = await import("@/lib/repos/clientRepo");
    mockStorage.clear();

    clientRepo.acknowledgeAiNotice();
    expect(clientRepo.hasAiNoticeAck()).toBe(true);

    // Simulate reload by creating new repo instance
    const mockNow = new Date().toISOString();
    const ack = JSON.parse(mockStorage.getItem("atb:aiNoticeAck") || "{}");
    expect(ack.ackedAt).toBeDefined();
  });
});

describe("Edge cases and error handling", () => {
  it("should handle QuotaExceededError by clearing old runs and retrying", async () => {
    const { runRepo } = await import("@/lib/repos/runRepo");
    mockStorage.clear();

    // Pre-fill with 200 runs
    for (let i = 0; i < 200; i++) {
      const run: RunLog = {
        id: `run_${String(i).padStart(12, "0")}`,
        flowId: "flow_test",
        flowName: "Test",
        trigger: "manual",
        status: "success",
        startedAt: new Date(2026, 8, 1 + Math.floor(i / 6)).toISOString(),
        finishedAt: new Date(2026, 8, 1 + Math.floor(i / 6), 1).toISOString(),
        durationMs: 1000,
        aiOutput: "x".repeat(4000), // Large output
        steps: [],
        errorCode: null,
        errorMessage: null,
      };
      runRepo.add(run);
    }

    // Simulate quota exceeded
    mockStorage.simulateQuotaExceeded = true;

    const newRun: RunLog = {
      id: "run_new_run_test",
      flowId: "flow_test",
      flowName: "Test",
      trigger: "manual",
      status: "success",
      startedAt: new Date().toISOString(),
      finishedAt: new Date(Date.now() + 1000).toISOString(),
      durationMs: 1000,
      aiOutput: null,
      steps: [],
      errorCode: null,
      errorMessage: null,
    };

    // Should throw StorageFullError after retry
    expect(() => runRepo.add(newRun)).toThrow(
      /StorageFullError|저장 공간이 부족/i
    );

    mockStorage.simulateQuotaExceeded = false;
  });

  it("should parse and recover corrupted flow data", async () => {
    const { flowRepo } = await import("@/lib/repos/flowRepo");
    mockStorage.clear();

    // Set corrupted JSON
    mockStorage.setItem("atb:flows", "[{broken");

    const result = flowRepo.list();

    expect(result).toEqual([]);
    expect(mockStorage.getItem("atb:flows:backup")).toBe("[{broken");
    expect(mockStorage.getItem("atb:flows")).toBe("[]");
  });

  it("should handle malformed but parseable JSON (not an array)", async () => {
    const { flowRepo } = await import("@/lib/repos/flowRepo");
    mockStorage.clear();

    // Set JSON that parses but isn't an array
    mockStorage.setItem("atb:flows", '{"name":"notanarray"}');

    const result = flowRepo.list();

    expect(result).toEqual([]);
    expect(mockStorage.getItem("atb:flows:backup")).toBe('{"name":"notanarray"}');
  });
});
