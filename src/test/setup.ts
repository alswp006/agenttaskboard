/**
 * Vitest setup — runs before each test file.
 *
 * Handles:
 *  - localStorage isolation between tests (prevents cross-test pollution)
 *  - requestAnimationFrame shim for jsdom (needed for animate/countup utilities)
 *  - sessionStorage isolation
 *  - console.error filtering (React Router warnings etc.)
 *
 * Loaded by the root vitest.setup.ts (registered in vitest.config.ts's
 * setupFiles) — this file holds the actual implementation so it lives under
 * src/ alongside the rest of the test infra.
 */

import { beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// ── localStorage / sessionStorage isolation ──
// jsdom's storage persists between tests by default. Clear it to prevent pollution.
beforeEach(() => {
  // 일부 테스트는 window.localStorage를 clear() 없는 최소 mock 객체로 통째로
  // 교체한다(Object.defineProperty) — jsdom 환경은 테스트 파일당 1회만 생성되므로
  // 이후 테스트의 전역 clear() 호출이 깨진다. 방어적으로 감싼다.
  try {
    localStorage.clear();
  } catch {
    /* noop */
  }
  try {
    sessionStorage.clear();
  } catch {
    /* noop */
  }
});

// ── requestAnimationFrame shim for jsdom ──
// jsdom does NOT implement rAF natively, so animate/countup code hangs forever.
// Shim that immediately invokes callback with a monotonic timestamp.
if (typeof globalThis.requestAnimationFrame !== "function") {
  let now = 0;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    now += 16;
    return setTimeout(() => cb(now), 0) as unknown as number;
  }) as typeof globalThis.requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as typeof globalThis.cancelAnimationFrame;
}

// ── afterEach reset ──
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers(); // in case a test used fake timers
});
