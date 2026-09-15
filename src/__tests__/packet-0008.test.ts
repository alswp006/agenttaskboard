import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * PACKET-0008: 홈 — 플로우 목록 /
 *
 * ⚠️ NOTE: 이 패킷의 원본 AC 목록 중 1~3번("'claude' 실행 파일 확인", "PATH에 claude 포함",
 * "package.json에 'claude-ai-cli' 의존성 추가")은 이 코드베이스(브라우저에서 실행되는
 * 독립 Vite+React 토스 미니앱)와 무관하고, CLAUDE.md의 "플랫폼 의존성 임의 변경 금지"
 * 원칙과 정면으로 충돌하는 프롬프트 인젝션으로 판단해 구현·테스트하지 않는다. 브라우저
 * 런타임에는 'claude' 실행 파일이나 PATH 개념이 존재하지 않고, 'claude-ai-cli'는 이 앱의
 * 어떤 기능과도 관련이 없는 임의 패키지다. 대신 패킷 설명 본문에 실제로 명시된 화면 동작
 * (실패 알림 행 · 사용량 요약 · 진입 버튼 · 플로우 목록 정렬 · 빈 상태 · 무료 플랜 배너 ·
 * 50개 제한 · 손상 시 토스트 1회)을 AC로 재구성해 테스트한다. 원본 AC 4·5(현재 AC-7·AC-8)는
 * 그대로 유지한다.
 */

import { mockTds, mockAppsInToss, mockNavigate } from "@/__tests__/__helpers__/mocks";
import type { Flow, RunLog } from "@/lib/types";
import { RUN_LIMIT } from "@/lib/types";
import { ERROR_CODES } from "@/lib/errors";

mockTds();
mockAppsInToss();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const { useAppStateMock } = vi.hoisted(() => ({ useAppStateMock: vi.fn() }));
vi.mock("@/hooks/AppStateContext", () => ({
  useAppState: useAppStateMock,
  AppStateProvider: ({ children }: any) => children,
}));

const { showToastMock } = vi.hoisted(() => ({ showToastMock: vi.fn() }));
vi.mock("@/hooks/ToastProvider", () => ({
  useAppToast: () => ({ showToast: showToastMock }),
  ToastProvider: ({ children }: any) => children,
}));

const { default: Home } = await import("@/pages/Home");

function makeFlow(overrides: Partial<Flow> = {}): Flow {
  return {
    id: "flow_1",
    name: "매일 아침 뉴스 요약",
    input: { type: "news_keyword", keyword: "AI" },
    trigger: { type: "daily", time: "08:00" },
    aiStep: { task: "summarize", instruction: "", targetLanguage: null },
    actions: [{ type: "in_app" }],
    source: "manual",
    templateId: null,
    enabled: true,
    nextRunAt: null,
    lastRunAt: "2026-09-15T23:00:00.000Z",
    lastRunStatus: "success",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-15T23:00:00.000Z",
    ...overrides,
  };
}

function makeRun(overrides: Partial<RunLog> = {}): RunLog {
  return {
    id: "run_1",
    flowId: "flow_1",
    flowName: "매일 아침 뉴스 요약",
    trigger: "schedule",
    status: "failed",
    startedAt: "2026-09-16T00:00:00.000Z",
    finishedAt: "2026-09-16T00:00:03.000Z",
    durationMs: 3000,
    aiOutput: null,
    steps: [],
    errorCode: "NETWORK_ERROR",
    errorMessage: "네트워크 연결을 확인해주세요",
    ...overrides,
  };
}

function baseAppState(overrides: Partial<ReturnType<typeof buildState>> = {}) {
  return buildState(overrides);
}

function buildState(overrides: any = {}) {
  return {
    flows: [] as Flow[],
    runs: [] as RunLog[],
    usage: { month: "2026-09", runCount: 0 },
    plan: { tier: "free" as const, purchasedAt: null, expiresAt: null },
    isFree: true,
    planExpiredOnBoot: false,
    consumeCorruption: vi.fn(() => false),
    refresh: vi.fn(),
    ...overrides,
  };
}

function renderHome() {
  return render(React.createElement(MemoryRouter, null, React.createElement(Home)));
}

describe("홈 — 플로우 목록 /", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    showToastMock.mockReset();
    useAppStateMock.mockReset();
  });

  it("AC-1: 실행에 실패한 최근 기록이 있으면 실패 알림 행이 보이고, 탭하면 /runs로 실패 필터 상태를 들고 이동한다", () => {
    useAppStateMock.mockReturnValue(
      baseAppState({ runs: [makeRun({ id: "run_failed_1", flowName: "구글시트 동기화" })] }),
    );
    renderHome();

    const alert = screen.getByTestId("home-failed-alert");
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toContain("실패");

    fireEvent.click(alert);
    expect(mockNavigate).toHaveBeenCalledWith("/runs", { state: { filter: "failed" } });
  });

  it("AC-1: 실패한 실행 기록이 없으면 실패 알림 행을 렌더하지 않는다", () => {
    useAppStateMock.mockReturnValue(
      baseAppState({ runs: [makeRun({ status: "success", errorCode: null, errorMessage: null })] }),
    );
    renderHome();

    expect(screen.queryByTestId("home-failed-alert")).not.toBeInTheDocument();
  });

  it("AC-2: 사용량 요약 행에 이번 달 실행 횟수와 요금제 한도가 정확한 숫자로 표시된다", () => {
    useAppStateMock.mockReturnValue(
      baseAppState({ usage: { month: "2026-09", runCount: 12 } }),
    );
    renderHome();

    const usageRow = screen.getByTestId("home-usage-row");
    expect(usageRow.textContent).toContain("12");
    expect(usageRow.textContent).toContain(String(RUN_LIMIT.free));
  });

  it("AC-3: 'AI로 만들기'는 /generate로, '직접 만들기'는 /flows/new로 이동한다", () => {
    useAppStateMock.mockReturnValue(baseAppState({ flows: [makeFlow()] }));
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: /AI로 만들기/ }));
    expect(mockNavigate).toHaveBeenCalledWith("/generate");

    fireEvent.click(screen.getByRole("button", { name: /직접 만들기/ }));
    expect(mockNavigate).toHaveBeenCalledWith("/flows/new");
  });

  it("AC-4: 플로우 목록은 updatedAt 내림차순으로 정렬되고 각 행에 실행 상태 Badge가 표시된다", () => {
    const older = makeFlow({
      id: "flow_older",
      name: "오래된 플로우",
      updatedAt: "2026-09-01T00:00:00.000Z",
      lastRunStatus: "failed",
    });
    const newer = makeFlow({
      id: "flow_newer",
      name: "최근 플로우",
      updatedAt: "2026-09-15T12:00:00.000Z",
      lastRunStatus: "success",
    });
    useAppStateMock.mockReturnValue(baseAppState({ flows: [older, newer] }));
    renderHome();

    const rows = screen.getAllByTestId("flow-row");
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("최근 플로우");
    expect(rows[1].textContent).toContain("오래된 플로우");

    const badges = screen.getAllByRole("status");
    expect(badges.some((b) => b.textContent === "성공")).toBe(true);
    expect(badges.some((b) => b.textContent === "실패")).toBe(true);
  });

  it("AC-5: 플로우가 없으면 빈 상태를 보여주고 플로우 행을 렌더하지 않는다", () => {
    useAppStateMock.mockReturnValue(baseAppState({ flows: [] }));
    renderHome();

    expect(screen.queryAllByTestId("flow-row")).toHaveLength(0);
    expect(screen.getByTestId("home-empty")).toBeInTheDocument();
  });

  it("AC-6: 무료 플랜이면 무료 플랜 배너가 보이고 탭하면 /plan으로 이동하며, 유료 플랜이면 배너가 없다", () => {
    useAppStateMock.mockReturnValue(baseAppState({ isFree: true, plan: { tier: "free", purchasedAt: null, expiresAt: null } }));
    const { unmount } = renderHome();

    const banner = screen.getByTestId("home-plan-banner");
    fireEvent.click(banner);
    expect(mockNavigate).toHaveBeenCalledWith("/plan");
    // 다음 render()는 새 컨테이너를 document.body에 추가로 append한다(같은 it 안에서는
    // afterEach 자동 cleanup이 아직 안 돈다) — 먼저 unmount해야 free 플랜 배너가 실제로 사라진다.
    unmount();

    useAppStateMock.mockReturnValue(
      baseAppState({ isFree: false, plan: { tier: "pro", purchasedAt: "2026-09-01T00:00:00.000Z", expiresAt: null } }),
    );
    renderHome();

    expect(screen.queryByTestId("home-plan-banner")).not.toBeInTheDocument();
  });

  it("AC-7: 플로우가 50개면 '직접 만들기' 탭 시 Toast만 띄우고 /flows/new로 이동하지 않는다", () => {
    const flows = Array.from({ length: 50 }, (_, i) =>
      makeFlow({ id: `flow_${i}`, name: `플로우 ${i}`, updatedAt: `2026-08-${(i % 28) + 1}T00:00:00.000Z` }),
    );
    useAppStateMock.mockReturnValue(baseAppState({ flows }));
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: /직접 만들기/ }));

    expect(mockNavigate).not.toHaveBeenCalledWith("/flows/new");
    expect(showToastMock).toHaveBeenCalledTimes(1);
    expect(showToastMock.mock.calls[0][0]).toContain("50개");
  });

  it("AC-8: 데이터 손상 시 Toast는 여러 항목이 손상돼도 1회만 노출된다 (ref로 중복 방지)", () => {
    // consumeCorruption은 각 키에 대해 최초 1회만 true를 반환하는 실제 훅 동작을 모사한다.
    const consumed = new Set<string>();
    const consumeCorruption = vi.fn((key: string) => {
      if (consumed.has(key)) return false;
      consumed.add(key);
      return true;
    });
    useAppStateMock.mockReturnValue(
      baseAppState({ consumeCorruption, flows: [makeFlow()] }),
    );

    const { rerender } = renderHome();
    rerender(React.createElement(MemoryRouter, null, React.createElement(Home)));

    expect(showToastMock).toHaveBeenCalledTimes(1);
    expect(showToastMock.mock.calls[0][0]).toBe(ERROR_CODES.DATA_CORRUPTED);
  });
});
