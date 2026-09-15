import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, within, fireEvent } from "@testing-library/react";

/**
 * PACKET-0010: AI 생성 결과 /generate/result
 *
 * AC-1[P0]: 결과 Card 상단에 data-testid='ai-generated-badge' 텍스트 'AI가 생성한 결과입니다'가 보인다
 * AC-2[P0]: state 없이 들어오면 크래시 없이 빈 상태와 '다시 만들기' 버튼이 보인다
 * AC-3[P0]: plan.tier가 free면 미리보기가 TossRewardAd 안에 렌더링되고, pro면 광고 없이 바로 보인다
 */

import { mockTds, mockAppsInToss, mockRouter, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { FlowDraft } from "@/lib/types";

mockTds();
mockAppsInToss();
mockRouter();

// 실제 경로는 @/hooks/AppStateContext (test-utils의 mockAppState()가 커버하는
// @/state/AppStateContext, @/lib/store/AppStore가 아님 — 프로젝트 실제 파일 확인 완료).
const { useAppStateMock } = vi.hoisted(() => ({ useAppStateMock: vi.fn() }));
vi.mock("@/hooks/AppStateContext", () => ({
  useAppState: useAppStateMock,
  AppStateProvider: ({ children }: any) => children,
}));

const { flowRepoCreateMock } = vi.hoisted(() => ({ flowRepoCreateMock: vi.fn() }));
vi.mock("@/lib/repos/flowRepo", () => ({
  flowRepo: { create: flowRepoCreateMock },
}));

// TossRewardAd는 실제 SDK 게이트 컴포넌트라 jsdom에서 광고 로드를 흉내내지 않고,
// children을 감싸는 표식(wrapper)만 남겨 "광고 안에 렌더됐는지"를 testid로 구분한다.
vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: ({ children }: any) =>
    React.createElement("div", { "data-testid": "reward-ad-mock" }, children),
}));

import GenerateResult from "@/pages/GenerateResult";

const DRAFT: FlowDraft = {
  name: "아침 뉴스 요약",
  input: { type: "news_keyword", keyword: "뉴스" },
  trigger: { type: "daily", time: "09:00" },
  aiStep: { task: "summarize", instruction: "", targetLanguage: null },
  actions: [{ type: "slack_webhook", webhookUrl: "" }],
};
const MISSING_FIELDS = ["actions.0.webhookUrl"];
const PROMPT = "매일 오전 9시 뉴스 요약해서 슬랙에 보내줘";

function makeAppState(overrides: Record<string, unknown> = {}) {
  return {
    flows: [],
    runs: [],
    usage: { month: "2026-09", runCount: 0 },
    plan: { tier: "free", purchasedAt: null, expiresAt: null },
    isFree: true,
    planExpiredOnBoot: false,
    consumeCorruption: vi.fn(() => false),
    refresh: vi.fn(),
    ...overrides,
  };
}

function renderResult() {
  return renderWithRouter(React.createElement(GenerateResult));
}

// mockLocation.state는 helper에서 `null`로 좁게 추론되므로, 화면별 state 셰이프를 넣기 위해 widen한다.
function setLocationState(state: unknown) {
  (mockLocation as { state: unknown }).state = state;
}

describe("AI 생성 결과 /generate/result", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    flowRepoCreateMock.mockReset();
    flowRepoCreateMock.mockReturnValue({
      id: "flow_test1234",
      ...DRAFT,
      source: "ai",
      templateId: null,
      enabled: false,
      nextRunAt: null,
      lastRunAt: null,
      lastRunStatus: null,
      createdAt: "2026-09-16T00:00:00.000Z",
      updatedAt: "2026-09-16T00:00:00.000Z",
    });
    mockLocation.pathname = "/generate/result";
    setLocationState(null);
    useAppStateMock.mockReturnValue(makeAppState());
  });

  it("AC-1[P0]: pro 플랜에서 결과 Card 상단에 ai-generated-badge가 'AI가 생성한 결과입니다' 텍스트로 보인다", () => {
    useAppStateMock.mockReturnValue(
      makeAppState({
        isFree: false,
        plan: { tier: "pro", purchasedAt: "2026-01-01T00:00:00.000Z", expiresAt: null },
      }),
    );
    setLocationState({ prompt: PROMPT, draft: DRAFT, missingFields: MISSING_FIELDS });

    renderResult();

    const badge = screen.getByTestId("ai-generated-badge");
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toContain("AI가 생성한 결과입니다");
  });

  it("AC-2[P0]: state 없이 들어오면 크래시 없이 빈 상태와 '다시 만들기' 버튼이 보이고, 탭하면 /generate로 이동한다", () => {
    setLocationState(null);

    expect(() => renderResult()).not.toThrow();
    expect(screen.queryByTestId("ai-generated-badge")).not.toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /다시 만들기/ });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockNavigate).toHaveBeenCalledWith("/generate");
  });

  it("AC-2[P0]: draft가 빠진 malformed state로 들어와도 크래시 없이 빈 상태가 보인다", () => {
    setLocationState({ prompt: PROMPT });

    expect(() => renderResult()).not.toThrow();
    expect(screen.queryByTestId("ai-generated-badge")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /다시 만들기/ })).toBeInTheDocument();
  });

  it("AC-3[P0]: plan.tier가 free면 미리보기가 TossRewardAd(reward-ad-mock) 안에 렌더링된다", () => {
    useAppStateMock.mockReturnValue(
      makeAppState({ isFree: true, plan: { tier: "free", purchasedAt: null, expiresAt: null } }),
    );
    setLocationState({ prompt: PROMPT, draft: DRAFT, missingFields: MISSING_FIELDS });

    renderResult();

    const adWrapper = screen.getByTestId("reward-ad-mock");
    expect(adWrapper).toBeInTheDocument();
    expect(within(adWrapper).getByTestId("ai-generated-badge")).toBeInTheDocument();
  });

  it("AC-3[P0]: plan.tier가 pro면 광고 래퍼 없이 미리보기가 바로 보인다", () => {
    useAppStateMock.mockReturnValue(
      makeAppState({
        isFree: false,
        plan: { tier: "pro", purchasedAt: "2026-01-01T00:00:00.000Z", expiresAt: null },
      }),
    );
    setLocationState({ prompt: PROMPT, draft: DRAFT, missingFields: MISSING_FIELDS });

    renderResult();

    expect(screen.queryByTestId("reward-ad-mock")).not.toBeInTheDocument();
    expect(screen.getByTestId("ai-generated-badge")).toBeInTheDocument();
  });

  it("'저장하기'를 탭하면 source 'ai'로 플로우를 저장하고 상세 화면으로 이동한다", () => {
    useAppStateMock.mockReturnValue(
      makeAppState({
        isFree: false,
        plan: { tier: "pro", purchasedAt: "2026-01-01T00:00:00.000Z", expiresAt: null },
      }),
    );
    setLocationState({ prompt: PROMPT, draft: DRAFT, missingFields: MISSING_FIELDS });

    renderResult();
    fireEvent.click(screen.getByRole("button", { name: "저장하기" }));

    expect(flowRepoCreateMock).toHaveBeenCalledWith({ draft: DRAFT, source: "ai", templateId: null });
    expect(mockNavigate).toHaveBeenCalledWith("/flows/flow_test1234");
  });

  it("'수정해서 저장'을 탭하면 draft·missingFields를 실어 빌더(/flows/new)로 이동한다", () => {
    useAppStateMock.mockReturnValue(
      makeAppState({
        isFree: false,
        plan: { tier: "pro", purchasedAt: "2026-01-01T00:00:00.000Z", expiresAt: null },
      }),
    );
    setLocationState({ prompt: PROMPT, draft: DRAFT, missingFields: MISSING_FIELDS });

    renderResult();
    fireEvent.click(screen.getByRole("button", { name: "수정해서 저장" }));

    expect(mockNavigate).toHaveBeenCalledWith("/flows/new", {
      state: { draft: DRAFT, source: "ai", templateId: null, missingFields: MISSING_FIELDS },
    });
    expect(flowRepoCreateMock).not.toHaveBeenCalled();
  });
});
