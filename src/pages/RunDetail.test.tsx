import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import type { RunLog } from "@/lib/types";

mockAll();

vi.mock("@/hooks/AppStateContext", () => ({
  useAppState: () => ({
    flows: [],
    runs: [],
    usage: { month: "2026-09", runCount: 0 },
    plan: { tier: "free", purchasedAt: null, expiresAt: null },
    isFree: true,
    planExpiredOnBoot: false,
    consumeCorruption: () => false,
    refresh: () => {},
  }),
  AppStateProvider: ({ children }: any) => children,
}));

const { default: RunDetail } = await import("@/pages/RunDetail");

const baseRun: RunLog = {
  id: "run_abc123",
  flowId: "flow_1",
  flowName: "매일 아침 뉴스 요약",
  trigger: "schedule",
  status: "failed",
  startedAt: "2026-09-16T00:24:00.000Z",
  finishedAt: "2026-09-16T00:24:03.200Z",
  durationMs: 3200,
  aiOutput: "오늘의 주요 뉴스 3건을 요약했어요.",
  steps: [
    { stage: "trigger", label: "구글 시트 A1:D50 읽기", status: "success", message: null },
    { stage: "ai", label: "요약", status: "success", message: null },
    { stage: "action", label: "슬랙 전송", status: "failed", message: "웹훅 연결에 실패했어요" },
  ],
  errorCode: "SLACK_WEBHOOK_FAILED",
  errorMessage: "웹훅 연결에 실패했어요",
};

function renderAt(runId: string) {
  return renderWithRouter(
    <Routes>
      <Route path="/runs/:runId" element={<RunDetail />} />
    </Routes>,
    { initialEntries: [`/runs/${runId}`] },
  );
}

describe("RunDetail page", () => {
  it("AC-1: aiOutput이 있으면 ai-generated-badge가 보인다", () => {
    seedLocalStorage({ "atb:runs": [baseRun] });
    renderAt(baseRun.id);
    expect(screen.getByTestId("ai-generated-badge")).toBeInTheDocument();
    expect(screen.getByText("오늘의 주요 뉴스 3건을 요약했어요.")).toBeInTheDocument();
  });

  it("AC-2: steps 3개가 순서대로 렌더되고 실패 단계에 '실패' Badge가 있다", () => {
    seedLocalStorage({ "atb:runs": [baseRun] });
    renderAt(baseRun.id);
    expect(screen.getByText("구글 시트 A1:D50 읽기")).toBeInTheDocument();
    expect(screen.getByText("요약")).toBeInTheDocument();
    expect(screen.getByText("슬랙 전송")).toBeInTheDocument();
    expect(screen.getByText("웹훅 연결에 실패했어요")).toBeInTheDocument();
    expect(screen.getAllByText("실패").length).toBeGreaterThan(0);
  });

  it("AC-3: 없는 runId로 들어오면 크래시 없이 빈 상태가 보인다", () => {
    seedLocalStorage({ "atb:runs": [baseRun] });
    renderAt("run_does_not_exist");
    expect(screen.getByText("실행 기록을 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "실행 로그로" })).toBeInTheDocument();
  });

  it("Layout: 요약 카드가 상태와 소요 시간을 함께 보여준다", () => {
    seedLocalStorage({ "atb:runs": [baseRun] });
    renderAt(baseRun.id);
    const summaryCard = screen.getByTestId("run-summary-card");
    expect(summaryCard).toHaveTextContent("실패");
    expect(summaryCard).toHaveTextContent("3.2초");
  });
});
