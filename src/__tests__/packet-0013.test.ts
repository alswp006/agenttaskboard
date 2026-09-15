import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, within, fireEvent, waitFor } from "@testing-library/react";

/**
 * PACKET-0013: 플로우 상세 /flows/:flowId
 *
 * AC-1[P0]: slack_webhook URL이 <a> 태그 없이 Paragraph.Text로 표시된다
 * AC-2[P0]: 한도를 넘은 상태에서 Switch를 켜면 fetch 0회, '이번 달 실행 횟수를 모두 사용했어요' Toast, Switch는 off다
 * AC-3[P0]: 삭제 다이얼로그에서 '삭제'를 탭하면 flowRepo에서 제거되고 '/'로 이동한다
 */

import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { Flow, RunLog } from "@/lib/types";
import { ERROR_CODES } from "@/lib/errors";

mockTds();
mockAppsInToss();

// react-router-dom: useNavigate 스텁 + useParams는 테스트별로 바꿀 수 있게 참조로 제어.
const { mockNavigate, paramsRef } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  paramsRef: { current: { flowId: "flow_abc12345" } as { flowId: string } },
}));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => paramsRef.current,
  };
});

// 실제 경로는 @/hooks/AppStateContext (프로젝트 실제 파일 확인 완료 — GenerateResult.tsx 참조).
const { useAppStateMock, appStateValue } = vi.hoisted(() => {
  const appStateValue = {
    flows: [] as Flow[],
    runs: [] as RunLog[],
    usage: { month: "2026-09", runCount: 0 },
    plan: { tier: "free" as const, purchasedAt: null, expiresAt: null },
    isFree: true,
    planExpiredOnBoot: false,
    consumeCorruption: vi.fn(() => false),
    refresh: vi.fn(),
  };
  return { useAppStateMock: vi.fn(() => appStateValue), appStateValue };
});
vi.mock("@/hooks/AppStateContext", () => ({
  useAppState: useAppStateMock,
  AppStateProvider: ({ children }: any) => children,
}));

const { showToastMock } = vi.hoisted(() => ({ showToastMock: vi.fn() }));
vi.mock("@/hooks/ToastProvider", () => ({
  useAppToast: () => ({ showToast: showToastMock }),
  useToast: () => ({ show: showToastMock }),
  ToastProvider: ({ children }: any) => children,
}));

const { flowRepoMock } = vi.hoisted(() => ({
  flowRepoMock: { get: vi.fn(), delete: vi.fn(), patch: vi.fn(), update: vi.fn(), create: vi.fn(), list: vi.fn() },
}));
vi.mock("@/lib/repos/flowRepo", () => ({ flowRepo: flowRepoMock }));

const { usageRepoMock } = vi.hoisted(() => ({ usageRepoMock: { get: vi.fn(), addRun: vi.fn() } }));
vi.mock("@/lib/repos/usageRepo", () => ({ usageRepo: usageRepoMock }));

const { planRepoMock } = vi.hoisted(() => ({ planRepoMock: { get: vi.fn(), set: vi.fn() } }));
vi.mock("@/lib/repos/planRepo", () => ({ planRepo: planRepoMock }));

const { clientRepoMock } = vi.hoisted(() => ({
  clientRepoMock: {
    hasAiNoticeAck: vi.fn(() => true),
    acknowledgeAiNotice: vi.fn(),
    getClientId: vi.fn(() => "client_test0000"),
  },
}));
vi.mock("@/lib/repos/clientRepo", () => ({ clientRepo: clientRepoMock }));

const { runNowMock } = vi.hoisted(() => ({ runNowMock: vi.fn() }));
vi.mock("@/services/runService", () => ({
  runService: { runNow: runNowMock },
  executeFlow: runNowMock,
}));

// scheduleService는 실제 구현을 그대로 쓴다 — flowRepo/usageRepo/planRepo만 위에서 목킹하고,
// api/endpoints·api/client는 실물이라 QUOTA_EXCEEDED가 fetch 전에 던져지는지 진짜로 검증된다.
import FlowDetail from "@/pages/FlowDetail";

const FLOW_ID = "flow_abc12345";
const WEBHOOK_URL = "https://hooks.slack.com/services/T0000/B0000/XXXXXXXXXXXXXXXXXXXXXXXX";

function makeFlow(overrides: Partial<Flow> = {}): Flow {
  return {
    id: FLOW_ID,
    name: "아침 뉴스 요약",
    input: { type: "news_keyword", keyword: "뉴스" },
    trigger: { type: "daily", time: "09:00" },
    aiStep: { task: "summarize", instruction: "", targetLanguage: null },
    actions: [{ type: "slack_webhook", webhookUrl: WEBHOOK_URL }],
    source: "manual",
    templateId: null,
    enabled: false,
    nextRunAt: null,
    lastRunAt: null,
    lastRunStatus: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeRun(overrides: Partial<RunLog> = {}): RunLog {
  return {
    id: "run_000000000001",
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
    ...overrides,
  };
}

function setFlow(flow: Flow | null) {
  flowRepoMock.get.mockImplementation((id: string) => (id === flow?.id ? flow : null));
  appStateValue.flows = flow ? [flow] : [];
}

function renderDetail() {
  return renderWithRouter(React.createElement(FlowDetail));
}

beforeEach(() => {
  vi.clearAllMocks();
  paramsRef.current = { flowId: FLOW_ID };
  clientRepoMock.hasAiNoticeAck.mockReturnValue(true);
  planRepoMock.get.mockReturnValue({ tier: "free", purchasedAt: null, expiresAt: null });
  usageRepoMock.get.mockReturnValue({ month: "2026-09", runCount: 0 });
  flowRepoMock.patch.mockImplementation((id: string, fields: Partial<Flow>) => ({
    ...(flowRepoMock.get(id) ?? makeFlow()),
    ...fields,
  }));
  appStateValue.refresh = vi.fn();
  setFlow(makeFlow());
  globalThis.fetch = vi.fn();
});

describe("플로우 상세 /flows/:flowId", () => {
  it("AC-1[P0]: slack_webhook URL이 <a> 태그 없이 텍스트로 보이고, source가 ai면 'AI 생성' 배지가 보인다", () => {
    setFlow(makeFlow({ source: "ai" }));

    const { container } = renderDetail();

    expect(container.querySelectorAll("a")).toHaveLength(0);
    const urlNode = screen.getByText(WEBHOOK_URL);
    expect(urlNode.tagName).not.toBe("A");

    const badge = screen.getByRole("status");
    expect(badge.textContent).toContain("AI 생성");
  });

  it("AC-1[P0]: source가 manual이면 'AI 생성' 배지가 보이지 않는다", () => {
    setFlow(makeFlow({ source: "manual" }));

    renderDetail();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText(WEBHOOK_URL)).toBeInTheDocument();
  });

  it("AC-2[P0]: 한도 내에서 예약 스위치를 켜면 스케줄이 등록되고 flowRepo가 갱신된다", async () => {
    usageRepoMock.get.mockReturnValue({ month: "2026-09", runCount: 5 });
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ flowId: FLOW_ID, nextRunAt: "2026-09-17T09:00:00.000Z" }),
    });

    renderDetail();
    fireEvent.click(screen.getByRole("switch"));

    await waitFor(() => {
      expect(flowRepoMock.patch).toHaveBeenCalledWith(FLOW_ID, {
        enabled: true,
        nextRunAt: "2026-09-17T09:00:00.000Z",
      });
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("AC-2[P0]: 한도를 넘은 상태에서 Switch를 켜면 fetch 0회, 한도 초과 Toast, Switch는 off로 유지된다", async () => {
    usageRepoMock.get.mockReturnValue({ month: "2026-09", runCount: 100 });

    renderDetail();
    const switchEl = screen.getByRole("switch") as HTMLInputElement;
    fireEvent.click(switchEl);

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(ERROR_CODES.QUOTA_EXCEEDED, expect.anything());
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(flowRepoMock.patch).not.toHaveBeenCalled();
    expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(false);
  });

  it("AC-3[P0]: 삭제 다이얼로그에서 '삭제'를 탭하면 flowRepo에서 제거되고 '/'로 이동한다", () => {
    renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "삭제" }));

    expect(flowRepoMock.delete).toHaveBeenCalledWith(FLOW_ID);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("AC-3[P0]: 삭제 다이얼로그에서 '닫기'를 탭하면 flowRepo.delete가 호출되지 않는다", () => {
    renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));

    expect(flowRepoMock.delete).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith("/");
  });

  it("없는 flowId로 접근하면 크래시 없이 찾을 수 없음 상태를 보여준다", () => {
    paramsRef.current = { flowId: "flow_missing0" };
    setFlow(null);

    expect(() => renderDetail()).not.toThrow();
    expect(screen.getByText(/찾을 수 없/)).toBeInTheDocument();
  });

  it("'지금 실행'을 탭하면 runService.runNow → refresh → Toast 순으로 처리하고 /runs/:runId로 이동한다", async () => {
    const run = makeRun();
    runNowMock.mockResolvedValueOnce(run);

    renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "지금 실행" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/runs/${run.id}`);
    });
    expect(runNowMock).toHaveBeenCalledWith(FLOW_ID);
    expect(appStateValue.refresh).toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalled();
  });
});
