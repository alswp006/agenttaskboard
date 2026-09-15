import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { screen, within } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { vi } from "vitest";

/**
 * PACKET-0014: 실행 상세 /runs/:runId
 *
 * AC-1: aiOutput이 있으면 Card 상단에 ai-generated-badge 'AI가 생성한 결과입니다'가 보인다
 * AC-2: steps 3개가 순서대로 ListRow 3개로 렌더링되고, failed 단계에 '실패' Badge가 있다
 * AC-3: 없는 runId로 들어오면 크래시 없이 빈 상태가 보인다
 */

import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { RunLog } from "@/lib/types";

mockTds();
mockAppsInToss();

// mocks.ts의 mockRouter()는 vi.doMock(비-hoisted)이라 RunDetail을 정적 import하는 이 파일에는
// 너무 늦게 적용된다(packet-0010과 같은 순서 문제) — 파일 최상단에서 hoisting되는 리터럴
// vi.mock을 직접 써서 mockNavigate가 실제로 호출되게 한다.
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// RunDetail이 실제로 어느 경로에서 실행 목록을 읽는지(전역 AppState vs repo 직접 조회)는
// 구현 선택지라 확정할 수 없다 — 두 경로 모두 같은 데이터를 반환하도록 함께 목킹해
// 어느 쪽을 택하든 테스트가 성립하게 한다.
const { getCurrentRuns, setCurrentRuns } = vi.hoisted(() => {
  let runs: RunLog[] = [];
  return {
    getCurrentRuns: () => runs,
    setCurrentRuns: (next: RunLog[]) => {
      runs = next;
    },
  };
});

vi.mock("@/lib/repos/runRepo", () => ({
  runRepo: {
    list: () => getCurrentRuns(),
    get: (id: string) => getCurrentRuns().find((r) => r.id === id) ?? null,
  },
}));

vi.mock("@/hooks/AppStateContext", () => ({
  useAppState: () => ({
    flows: [],
    runs: getCurrentRuns(),
    usage: { month: "2026-09", runCount: 0 },
    plan: { tier: "free", purchasedAt: null, expiresAt: null },
    isFree: true,
    planExpiredOnBoot: false,
    consumeCorruption: () => false,
    refresh: () => {},
  }),
  AppStateProvider: ({ children }: any) => children,
}));

import RunDetail from "@/pages/RunDetail";

const RUN_WITH_AI: RunLog = {
  id: "run_test0001",
  flowId: "flow_1",
  flowName: "아침 뉴스 요약",
  trigger: "manual",
  status: "failed",
  startedAt: "2026-09-16T00:10:00.000Z",
  finishedAt: "2026-09-16T00:10:05.000Z",
  durationMs: 5000,
  aiOutput: "오늘의 주요 뉴스 3건을 요약했어요.",
  steps: [
    { stage: "trigger", label: "수동 실행", status: "success", message: null },
    { stage: "ai", label: "요약", status: "success", message: null },
    {
      stage: "action",
      label: "슬랙 전송",
      status: "failed",
      message: "웹훅 URL이 올바르지 않아요",
    },
  ],
  errorCode: "SLACK_WEBHOOK_FAILED",
  errorMessage: "웹훅 URL이 올바르지 않아요",
};

const RUN_WITHOUT_AI: RunLog = {
  ...RUN_WITH_AI,
  id: "run_test0002",
  status: "success",
  aiOutput: null,
  steps: [
    { stage: "trigger", label: "수동 실행", status: "success", message: null },
    { stage: "ai", label: "요약", status: "success", message: null },
    { stage: "action", label: "슬랙 전송", status: "success", message: null },
  ],
  errorCode: null,
  errorMessage: null,
};

function renderRunDetail(runId: string) {
  return renderWithRouter(
    React.createElement(
      Routes,
      null,
      React.createElement(Route, { path: "/runs/:runId", element: React.createElement(RunDetail) }),
    ),
    { initialEntries: [`/runs/${runId}`] },
  );
}

describe("실행 상세 /runs/:runId", () => {
  beforeEach(() => {
    setCurrentRuns([]);
  });

  it("AC-1: aiOutput이 있으면 ai-generated-badge가 'AI가 생성한 결과입니다' 텍스트로 보인다", () => {
    setCurrentRuns([RUN_WITH_AI]);
    renderRunDetail(RUN_WITH_AI.id);

    const badge = screen.getByTestId("ai-generated-badge");
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toContain("AI가 생성한 결과입니다");
    expect(screen.getByText("오늘의 주요 뉴스 3건을 요약했어요.")).toBeInTheDocument();
  });

  it("AC-1: aiOutput이 없으면 ai-generated-badge가 보이지 않는다", () => {
    setCurrentRuns([RUN_WITHOUT_AI]);
    renderRunDetail(RUN_WITHOUT_AI.id);

    expect(screen.queryByTestId("ai-generated-badge")).not.toBeInTheDocument();
  });

  it("AC-2: steps 3개가 순서대로 ListRow 3개로 렌더링된다", () => {
    setCurrentRuns([RUN_WITH_AI]);
    renderRunDetail(RUN_WITH_AI.id);

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain("수동 실행");
    expect(rows[1].textContent).toContain("요약");
    expect(rows[2].textContent).toContain("슬랙 전송");
  });

  it("AC-2: failed 단계에 '실패' Badge와 실패 message가 함께 보인다", () => {
    setCurrentRuns([RUN_WITH_AI]);
    renderRunDetail(RUN_WITH_AI.id);

    const rows = screen.getAllByRole("listitem");
    const failedRow = rows[2];
    expect(within(failedRow).getByText("실패")).toBeInTheDocument();
    expect(screen.getByText("웹훅 URL이 올바르지 않아요")).toBeInTheDocument();
  });

  it("AC-3: 없는 runId로 들어오면 크래시 없이 빈 상태 문구가 보인다", () => {
    setCurrentRuns([RUN_WITH_AI]);
    renderRunDetail("run_does_not_exist");

    expect(screen.getByText("실행 기록을 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.queryByTestId("ai-generated-badge")).not.toBeInTheDocument();
  });

  it("AC-3: 빈 상태의 버튼을 누르면 /runs로 돌아간다", () => {
    setCurrentRuns([]);
    renderRunDetail("run_does_not_exist");

    const backButton = screen.getByRole("button", { name: /돌아가기|목록|실행 로그/ });
    backButton.click();

    expect(mockNavigate).toHaveBeenCalledWith("/runs");
  });
});
