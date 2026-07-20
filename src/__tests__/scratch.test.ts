import { describe, it, expect } from "vitest";

describe("scratch", () => {
  it("resolves alias via dynamic import", async () => {
    const mod = await import("@/pipeline/runner");
    expect(mod).toBeDefined();
  });
});
