import { describe, it, expect, vi } from "vitest";
import React from "react";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * PACKET-0020: 광고 배치·정책 정적 검사 + 최종 폴리시
 *
 * AC-1[P0]: node scripts/check-policy.mjs가 위반 0건일 때 exit 0, 1건 이상이면 exit 1이다
 * AC-2[P0]: src/에서 HEX 정규식과 '설치하세요|다운로드|앱 설치|스토어에서' 매치가 0건이다
 * AC-3[P0]: plan.tier 'pro'로 홈·결과·요금제를 렌더링하면 AdSlot·TossRewardAd 렌더가 0회다
 *
 * ⚠️ 범위 조정: '요금제'(/plan)는 자리 페이지(@ai-factory:placeholder, 패킷 0018로 시간 예약 이연)라
 * 내용 검증 대상에서 제외한다. 대신 AdSlot/TossRewardAd를 실제로 사용하는 실속 화면
 * (GenerateResult, FlowDetail, RunDetail)으로 AC-3을 검증한다.
 *
 * ── scripts/check-policy.mjs 계약 (Coder 구현 대상) ──
 *   export function checkPolicy(rootDir: string): { violations: Violation[]; ok: boolean }
 *     Violation = {
 *       rule: "hex-color" | "install-prompt" | "legacy-api" | "banned-analytics" | "external-nav",
 *       file: string; line: number; text: string;
 *     }
 *   - rootDir 아래 .ts/.tsx/.jsx/.css 파일을 재귀 스캔(node_modules/dist 제외).
 *   - hex-color: `#RGB`~`#RRGGBBAA` 리터럴. 단 `var(--x, #hex)` 형태의 CSS 커스텀 프로퍼티
 *     폴백(forbidden-patterns.mjs의 hardcoded-hex 패턴과 동일 관례)은 위반이 아니다.
 *   - install-prompt: /설치하세요|다운로드|앱 설치|스토어에서/ 매치.
 *   - legacy-api: `structuredClone(` · `navigator.clipboard` · `ResizeObserver(` · `BroadcastChannel(`
 *     중 하나 이상 등장.
 *   - banned-analytics: "mixpanel-browser" | "amplitude-js" | "@amplitude/analytics-browser" |
 *     "react-ga" | "react-ga4" | "universal-analytics" 로부터의 import.
 *   - ok === (violations.length === 0)
 *
 *   CLI: `node scripts/check-policy.mjs [rootDir]` — rootDir 생략 시 "<cwd>/src".
 *     violations가 있으면 사람이 읽을 형태로 stdout/stderr에 출력하고 exit(1), 없으면 exit(0).
 *     이 파일이 **모듈로 import될 때는** CLI 블록(process.exit 포함)이 실행되면 안 된다
 *     (예: `import.meta.url === pathToFileURL(process.argv[1]).href`로 가드) — 안 그러면
 *     이 스크립트를 import하는 이 테스트 프로세스 자체가 죽는다.
 */

import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import type { Flow, RunLog, FlowDraft } from "@/lib/types";

mockTds();
mockAppsInToss();

// react-router-dom: useNavigate/useLocation/useParams을 테스트별로 바꿀 수 있게 참조로 제어.
// (GenerateResult는 useLocation, FlowDetail/RunDetail은 useParams을 쓴다 — 한 파일에서 셋을 같이 테스트하므로
// mockRouter() 헬퍼 대신 직접 정의한다.)
const { mockNavigate, locationRef, paramsRef } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  locationRef: { current: { pathname: "/", search: "", state: null as unknown, key: "k0" } },
  paramsRef: { current: {} as Record<string, string> },
}));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => locationRef.current,
    useParams: () => paramsRef.current,
  };
});

// @/hooks/AppStateContext: isFree를 pro/free로 토글하기 위해 참조로 제어.
// PlanAdSlot(FlowDetail/RunDetail이 사용)과 GenerateResult 둘 다 이 모듈의 useAppState()를 호출한다.
const { appStateRef } = vi.hoisted(() => ({
  appStateRef: { current: { isFree: true, refresh: vi.fn() } },
}));
vi.mock("@/hooks/AppStateContext", () => ({
  useAppState: () => appStateRef.current,
  AppStateProvider: ({ children }: { children: unknown }) => children,
}));

// FlowDetail은 useAppToast를 렌더 경로에서 호출한다(삭제/실행 버튼 클릭 시 사용 — 여기선 안 누르지만
// 컴포넌트 최상단에서 훅 자체는 호출되므로 Provider가 필요하다).
vi.mock("@/hooks/ToastProvider", () => ({
  useAppToast: () => ({ showToast: vi.fn() }),
  useToast: () => ({ show: vi.fn() }),
  ToastProvider: ({ children }: { children: unknown }) => children,
}));

const { default: GenerateResult } = await import("@/pages/GenerateResult");
const { default: FlowDetail } = await import("@/pages/FlowDetail");
const { default: RunDetail } = await import("@/pages/RunDetail");

const REPO_ROOT = path.resolve(__dirname, "../..");
const CHECK_POLICY_SCRIPT = path.join(REPO_ROOT, "scripts/check-policy.mjs");

function makeFixtureDir(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "policy-fixture-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content, "utf8");
  }
  return dir;
}

const FLOW_ID = "flow_adtest001";
function makeFlow(): Flow {
  return {
    id: FLOW_ID,
    name: "아침 뉴스 요약",
    input: { type: "news_keyword", keyword: "뉴스" },
    trigger: { type: "daily", time: "09:00" },
    aiStep: { task: "summarize", instruction: "", targetLanguage: null },
    actions: [
      { type: "slack_webhook", webhookUrl: "https://hooks.slack.com/services/T0000/B0000/XXXXXXXXXXXXXXXXXXXXXXXX" },
    ],
    source: "manual",
    templateId: null,
    enabled: false,
    nextRunAt: null,
    lastRunAt: null,
    lastRunStatus: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

const RUN_ID = "run_adtest0001";
function makeRun(): RunLog {
  return {
    id: RUN_ID,
    flowId: FLOW_ID,
    flowName: "아침 뉴스 요약",
    trigger: "manual",
    status: "success",
    startedAt: "2026-09-16T10:00:00.000Z",
    finishedAt: "2026-09-16T10:00:03.000Z",
    durationMs: 3000,
    aiOutput: null,
    steps: [],
    errorCode: null,
    errorMessage: null,
  };
}

const DRAFT: FlowDraft = {
  name: "아침 뉴스 요약",
  input: { type: "news_keyword", keyword: "뉴스" },
  trigger: { type: "daily", time: "09:00" },
  aiStep: { task: "summarize", instruction: "", targetLanguage: null },
  actions: [{ type: "in_app" }],
};

describe("광고 배치·정책 정적 검사 + 최종 폴리시", () => {
  it("AC-1[P0]: 위반이 있는 디렉터리를 검사하면 exit 1과 위반 내역을 출력한다", () => {
    const badDir = makeFixtureDir({
      "Bad.tsx": `export function Bad() {\n  return <div style={{ color: '#3182F6' }}><p>지금 앱 설치하세요</p></div>;\n}\n`,
    });
    try {
      const result = spawnSync("node", [CHECK_POLICY_SCRIPT, badDir], { encoding: "utf8" });
      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).toMatch(/hex|install|위반|policy/i);
    } finally {
      rmSync(badDir, { recursive: true, force: true });
    }
  });

  it("AC-1[P0]: 위반이 없는 디렉터리를 검사하면 exit 0이다", () => {
    const cleanDir = makeFixtureDir({
      "Good.tsx": `export function Good() {\n  return <div style={{ color: 'var(--tds-color-blue500, #3182F6)' }}>좋아요</div>;\n}\n`,
    });
    try {
      const result = spawnSync("node", [CHECK_POLICY_SCRIPT, cleanDir], { encoding: "utf8" });
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
    } finally {
      rmSync(cleanDir, { recursive: true, force: true });
    }
  });

  it("AC-2[P0]: HEX 하드코딩(비-var)과 설치 유도 문구를 감지하되, CSS var() hex 폴백은 통과시킨다", async () => {
    const { checkPolicy } = await import(CHECK_POLICY_SCRIPT);
    const dir = makeFixtureDir({
      "bad.tsx": `export function Bad() {\n  return <div style={{ color: '#3182F6' }}><p>스토어에서 다운로드</p></div>;\n}\n`,
      "good.css": `.card {\n  color: var(--tds-color-grey500, #6B7684);\n}\n`,
    });
    try {
      const { violations } = checkPolicy(dir);
      expect(violations.some((v: { rule: string; file: string }) => v.rule === "hex-color" && v.file.includes("bad.tsx"))).toBe(true);
      expect(violations.some((v: { rule: string; file: string }) => v.rule === "install-prompt" && v.file.includes("bad.tsx"))).toBe(true);
      expect(violations.some((v: { file: string }) => v.file.includes("good.css"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("AC-2[P0]: 구형 WebView 미지원 API와 금지 분석 SDK import를 감지한다", async () => {
    const { checkPolicy } = await import(CHECK_POLICY_SCRIPT);
    const dir = makeFixtureDir({
      "legacy.ts": `import mixpanel from "mixpanel-browser";\nexport function track() {\n  structuredClone({ a: 1 });\n  mixpanel.track("x");\n}\n`,
    });
    try {
      const { violations, ok } = checkPolicy(dir);
      expect(violations.some((v: { rule: string }) => v.rule === "legacy-api")).toBe(true);
      expect(violations.some((v: { rule: string }) => v.rule === "banned-analytics")).toBe(true);
      expect(ok).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("AC-2: 실제 src/ 디렉터리를 검사하면 HEX·설치 유도 문구 위반이 0건이다", async () => {
    const { checkPolicy } = await import(CHECK_POLICY_SCRIPT);
    const { violations } = checkPolicy(path.join(REPO_ROOT, "src"));
    const hexViolations = violations.filter((v: { rule: string }) => v.rule === "hex-color");
    const installViolations = violations.filter((v: { rule: string }) => v.rule === "install-prompt");
    expect(hexViolations).toHaveLength(0);
    expect(installViolations).toHaveLength(0);
  });

  it("AC-3[P0]: GenerateResult — pro 플랜은 광고 게이트 없이 바로 결과를 보여주고, free 플랜은 게이트가 뜬다", () => {
    locationRef.current = {
      pathname: "/generate/result",
      search: "",
      state: { prompt: "뉴스 요약해줘", draft: DRAFT, missingFields: [] },
      key: "k1",
    };

    appStateRef.current = { isFree: false, refresh: vi.fn() };
    const pro = renderWithRouter(React.createElement(GenerateResult));
    expect(pro.container.querySelector(".reward-ad-gate")).toBeNull();
    expect(pro.getByTestId("ai-generated-badge")).toBeInTheDocument();
    pro.unmount();

    appStateRef.current = { isFree: true, refresh: vi.fn() };
    const free = renderWithRouter(React.createElement(GenerateResult));
    expect(free.container.querySelector(".reward-ad-gate")).not.toBeNull();
    free.unmount();
  });

  it("AC-3[P0]: FlowDetail — pro 플랜은 AdSlot을 렌더하지 않고, free 플랜은 렌더한다", () => {
    paramsRef.current = { flowId: FLOW_ID };
    seedLocalStorage({ "atb:flows": [makeFlow()] });

    appStateRef.current = { isFree: false, refresh: vi.fn() };
    const pro = renderWithRouter(React.createElement(FlowDetail));
    expect(pro.container.querySelector("[data-ad-group-id]")).toBeNull();
    pro.unmount();

    appStateRef.current = { isFree: true, refresh: vi.fn() };
    const free = renderWithRouter(React.createElement(FlowDetail));
    expect(free.container.querySelector("[data-ad-group-id]")).not.toBeNull();
    free.unmount();
  });

  it("AC-3: RunDetail — pro 플랜은 AdSlot을 렌더하지 않고, free 플랜은 렌더한다", () => {
    paramsRef.current = { runId: RUN_ID };
    seedLocalStorage({ "atb:runs": [makeRun()] });

    appStateRef.current = { isFree: false, refresh: vi.fn() };
    const pro = renderWithRouter(React.createElement(RunDetail));
    expect(pro.container.querySelector("[data-ad-group-id]")).toBeNull();
    pro.unmount();

    appStateRef.current = { isFree: true, refresh: vi.fn() };
    const free = renderWithRouter(React.createElement(RunDetail));
    expect(free.container.querySelector("[data-ad-group-id]")).not.toBeNull();
    free.unmount();
  });
});
