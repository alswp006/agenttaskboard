/**
 * 실행 로그 대시보드 /runs — TDD 테스트 (RED phase)
 *
 * AC-1: state { filter: 'failed' }로 들어오면 '실패' Tab이 선택되고 failed 로그만 보인다
 * AC-2: 로그가 45개면 처음 20개가 보이고, '더 보기'를 두 번 탭하면 45개가 된다
 * AC-3: 최근 7일에 실패가 1건 이상이면 data-testid='error-alert-card'가 보인다
 *
 * 통합 스타일 — 실제 AppStateProvider + runRepo(localStorage)를 그대로 쓴다(packet-0012 패턴).
 * '@/api/endpoints'의 listRuns만 빈 응답으로 목킹해 syncService의 실제 동기화 로직이
 * 로컬에 심어둔 fixture를 건드리지 않게 한다.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import { AppStateProvider } from "@/hooks/AppStateContext";
import { ToastProvider } from "@/hooks/ToastProvider";
import type { RunLog } from "@/lib/types";

mockTds();
mockAppsInToss();

// mocks.ts의 mockRouter()는 vi.doMock(비-hoisted)이라 Runs를 정적 import하는 이 파일에는
// 너무 늦게 적용된다(packet-0012와 같은 순서 문제) — 파일 최상단에서 hoisting되는 리터럴
// vi.mock을 직접 써서 mockNavigate/mockLocation.state가 실제로 반영되게 한다.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

// 서버 동기화는 빈 응답으로 고정 — 실제 syncService.sync()가 그대로 실행되지만
// 새로 추가되는 run이 없어 seed한 로컬 fixture만으로 화면을 검증할 수 있다.
vi.mock("@/api/endpoints", () => ({
  listRuns: vi.fn(async () => ({ runs: [], total: 0 })),
}));

import Runs from "@/pages/Runs";

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function makeRun(overrides: Partial<RunLog> & Pick<RunLog, "id" | "status" | "startedAt" | "flowName">): RunLog {
  return {
    flowId: "flow_test0001",
    trigger: "manual",
    finishedAt: overrides.startedAt,
    durationMs: 1200,
    aiOutput: null,
    steps: [],
    errorCode: overrides.status === "failed" ? "NETWORK_ERROR" : null,
    errorMessage: overrides.status === "failed" ? "네트워크 연결을 확인해주세요" : null,
    ...overrides,
  };
}

function seedRuns(runs: RunLog[]) {
  localStorage.setItem("atb:runs", JSON.stringify(runs));
}

function renderRuns() {
  return render(
    React.createElement(
      AppStateProvider,
      null,
      React.createElement(
        ToastProvider,
        null,
        React.createElement(MemoryRouter, { initialEntries: ["/runs"] }, React.createElement(Runs)),
      ),
    ),
  );
}

function setLocationState(state: { filter: "all" | "success" | "failed" } | null) {
  (mockLocation as { state: unknown }).state = state;
}

describe("실행 로그 대시보드 /runs", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
    mockLocation.pathname = "/runs";
    setLocationState(null);
  });

  it("AC-1[P1]: state.filter='failed'로 들어오면 '실패' Tab이 선택되고 failed 로그만 보인다", () => {
    seedRuns([
      makeRun({ id: "run_f01", status: "failed", startedAt: isoDaysAgo(1), flowName: "실패-플로우-1" }),
      makeRun({ id: "run_f02", status: "failed", startedAt: isoDaysAgo(2), flowName: "실패-플로우-2" }),
      makeRun({ id: "run_s01", status: "success", startedAt: isoDaysAgo(1), flowName: "성공-플로우-1" }),
      makeRun({ id: "run_s02", status: "success", startedAt: isoDaysAgo(2), flowName: "성공-플로우-2" }),
    ]);
    setLocationState({ filter: "failed" });

    renderRuns();

    const failedTab = screen.getByRole("tab", { name: "실패" });
    expect(failedTab.getAttribute("aria-selected")).toBe("true");

    const list = screen.getByTestId("run-log-list");
    expect(within(list).getByText("실패-플로우-1")).toBeInTheDocument();
    expect(within(list).getByText("실패-플로우-2")).toBeInTheDocument();
    expect(within(list).queryByText("성공-플로우-1")).not.toBeInTheDocument();
    expect(within(list).queryByText("성공-플로우-2")).not.toBeInTheDocument();
  });

  it("AC-1[P1]: state 없이 들어오면 기본값은 '전체' Tab이 선택된다", () => {
    seedRuns([
      makeRun({ id: "run_f01", status: "failed", startedAt: isoDaysAgo(1), flowName: "실패-플로우-1" }),
      makeRun({ id: "run_s01", status: "success", startedAt: isoDaysAgo(1), flowName: "성공-플로우-1" }),
    ]);
    setLocationState(null);

    renderRuns();

    const allTab = screen.getByRole("tab", { name: "전체" });
    expect(allTab.getAttribute("aria-selected")).toBe("true");

    const list = screen.getByTestId("run-log-list");
    expect(within(list).getByText("실패-플로우-1")).toBeInTheDocument();
    expect(within(list).getByText("성공-플로우-1")).toBeInTheDocument();
  });

  it("AC-2[P1]: 로그 45개는 처음 20개만 보이고 '더 보기' 버튼이 있다", () => {
    const runs: RunLog[] = Array.from({ length: 45 }, (_, i) =>
      makeRun({
        id: `run_p${String(i).padStart(3, "0")}`,
        status: i % 2 === 0 ? "success" : "failed",
        startedAt: isoDaysAgo(i),
        flowName: `런-${i}`,
      }),
    );
    seedRuns(runs);
    setLocationState({ filter: "all" });

    renderRuns();

    const list = screen.getByTestId("run-log-list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(20);
    expect(screen.getByRole("button", { name: "더 보기" })).toBeInTheDocument();
  });

  it("AC-2[P1]: '더 보기'를 두 번 탭하면 45개가 되고 버튼이 사라진다", () => {
    const runs: RunLog[] = Array.from({ length: 45 }, (_, i) =>
      makeRun({
        id: `run_p${String(i).padStart(3, "0")}`,
        status: i % 2 === 0 ? "success" : "failed",
        startedAt: isoDaysAgo(i),
        flowName: `런-${i}`,
      }),
    );
    seedRuns(runs);
    setLocationState({ filter: "all" });

    renderRuns();

    fireEvent.click(screen.getByRole("button", { name: "더 보기" }));
    expect(within(screen.getByTestId("run-log-list")).getAllByRole("listitem")).toHaveLength(40);

    fireEvent.click(screen.getByRole("button", { name: "더 보기" }));
    expect(within(screen.getByTestId("run-log-list")).getAllByRole("listitem")).toHaveLength(45);
    expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument();
  });

  it("AC-3[P1]: 최근 7일 안에 실패가 1건 이상이면 error-alert-card가 보인다", () => {
    seedRuns([
      makeRun({ id: "run_recent_fail", status: "failed", startedAt: isoDaysAgo(3), flowName: "최근 실패 플로우" }),
      makeRun({ id: "run_recent_ok", status: "success", startedAt: isoDaysAgo(1), flowName: "최근 성공 플로우" }),
    ]);
    setLocationState({ filter: "all" });

    renderRuns();

    expect(screen.getByTestId("error-alert-card")).toBeInTheDocument();
  });

  it("AC-3[P1]: 최근 7일 안에 실패가 없으면 error-alert-card가 보이지 않는다", () => {
    seedRuns([
      makeRun({ id: "run_old_fail", status: "failed", startedAt: isoDaysAgo(30), flowName: "오래된 실패 플로우" }),
      makeRun({ id: "run_recent_ok", status: "success", startedAt: isoDaysAgo(1), flowName: "최근 성공 플로우" }),
    ]);
    setLocationState({ filter: "all" });

    renderRuns();

    expect(screen.queryByTestId("error-alert-card")).not.toBeInTheDocument();
  });
});
