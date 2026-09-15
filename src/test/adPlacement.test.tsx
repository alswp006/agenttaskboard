import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import type { Flow, FlowDraft, PlanState, PlanTier, RunLog } from "@/lib/types";

/**
 * 광고 배치 규칙: AdSlot은 free 플랜에서만, TossRewardAd는 free 플랜 AI 생성 결과 미리보기에만.
 * isFree를 목킹하지 않고 실제 AppStateProvider에 atb:plan을 심어 plan.tier → 광고 노출 경로 전체를 본다.
 * 요금제(/plan)는 자리 페이지(패킷 0018 이연)라 대상에서 뺀다.
 */

mockTds();
mockAppsInToss();

const { adSlotRenders, rewardAdRenders } = vi.hoisted(() => ({
  adSlotRenders: { count: 0 },
  rewardAdRenders: { count: 0 },
}));

vi.mock("@/components/AdSlot", () => ({
  AdSlot: ({ adGroupId }: { adGroupId: string }) => {
    adSlotRenders.count += 1;
    return React.createElement("div", { "data-ad-group-id": adGroupId });
  },
}));

vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: ({ children }: { children: React.ReactNode }) => {
    rewardAdRenders.count += 1;
    return React.createElement("div", { className: "reward-ad-gate" }, children);
  },
}));

const { AppStateProvider } = await import("@/hooks/AppStateContext");
const { ToastProvider } = await import("@/hooks/ToastProvider");
const { default: Home } = await import("@/pages/Home");
const { default: GenerateResult } = await import("@/pages/GenerateResult");
const { default: FlowDetail } = await import("@/pages/FlowDetail");
const { default: RunDetail } = await import("@/pages/RunDetail");
const { FloatingTabBar } = await import("@/components/FloatingTabBar");

const FLOW_ID = "flow_adplace001";
const RUN_ID = "run_adplace0001";

const FLOW: Flow = {
  id: FLOW_ID,
  name: "아침 뉴스 요약",
  input: { type: "news_keyword", keyword: "반도체" },
  trigger: { type: "daily", time: "09:00" },
  aiStep: { task: "summarize", instruction: "", targetLanguage: null },
  actions: [{ type: "in_app" }],
  source: "manual",
  templateId: null,
  enabled: false,
  nextRunAt: null,
  lastRunAt: null,
  lastRunStatus: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const RUN: RunLog = {
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

const DRAFT: FlowDraft = {
  name: "아침 뉴스 요약",
  input: { type: "news_keyword", keyword: "반도체" },
  trigger: { type: "daily", time: "09:00" },
  aiStep: { task: "summarize", instruction: "", targetLanguage: null },
  actions: [{ type: "in_app" }],
};

type Screen = { name: string; path: string; entry: string | { pathname: string; state: unknown }; element: React.ReactElement };

const SCREENS: Screen[] = [
  { name: "홈", path: "/", entry: "/", element: <Home /> },
  {
    name: "AI 생성 결과",
    path: "/generate/result",
    entry: { pathname: "/generate/result", state: { prompt: "뉴스 요약해줘", draft: DRAFT, missingFields: [] } },
    element: <GenerateResult />,
  },
  { name: "플로우 상세", path: "/flows/:flowId", entry: `/flows/${FLOW_ID}`, element: <FlowDetail /> },
  { name: "실행 상세", path: "/runs/:runId", entry: `/runs/${RUN_ID}`, element: <RunDetail /> },
];

function seed(tier: PlanTier) {
  const plan: PlanState = {
    tier,
    purchasedAt: tier === "free" ? null : "2026-09-01T00:00:00.000Z",
    expiresAt: tier === "free" ? null : "2099-12-31T00:00:00.000Z",
  };
  seedLocalStorage({ "atb:plan": plan, "atb:flows": [FLOW], "atb:runs": [RUN] });
}

function renderScreen(s: Screen) {
  return render(
    <MemoryRouter initialEntries={[s.entry]}>
      <AppStateProvider>
        <ToastProvider>
          <Routes>
            <Route path={s.path} element={s.element} />
          </Routes>
        </ToastProvider>
      </AppStateProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  adSlotRenders.count = 0;
  rewardAdRenders.count = 0;
});

describe("광고 배치 — 플랜별 노출", () => {
  it.each(SCREENS)("AC-3: pro 플랜 $name 화면은 AdSlot·TossRewardAd를 렌더하지 않는다", (s) => {
    seed("pro");
    const { container } = renderScreen(s);
    expect(container.textContent).not.toBe("");
    expect(adSlotRenders.count).toBe(0);
    expect(rewardAdRenders.count).toBe(0);
    expect(container.querySelector("[data-ad-group-id], .reward-ad-gate")).toBeNull();
  });

  it("pro 플랜 AI 생성 결과는 광고 게이트 없이 AI 라벨과 미리보기를 바로 보여준다", () => {
    seed("pro");
    renderScreen(SCREENS[1]);
    expect(screen.getByTestId("ai-generated-badge")).toBeInTheDocument();
    expect(screen.getByTestId("generate-result-card")).toBeInTheDocument();
  });

  it("free 플랜 AI 생성 결과 미리보기는 TossRewardAd로 감싸고 배너는 두지 않는다", () => {
    seed("free");
    const { container } = renderScreen(SCREENS[1]);
    expect(rewardAdRenders.count).toBeGreaterThan(0);
    expect(adSlotRenders.count).toBe(0);
    const gate = container.querySelector(".reward-ad-gate");
    expect(gate?.querySelector('[data-testid="generate-result-card"]')).not.toBeNull();
  });

  it.each([SCREENS[2], SCREENS[3]])("free 플랜 $name 화면은 배너를 콘텐츠 뒤에 1개만 두고 보상형 광고는 없다", (s) => {
    seed("free");
    const { container } = renderScreen(s);
    const slots = container.querySelectorAll("[data-ad-group-id]");
    expect(slots).toHaveLength(1);
    expect(rewardAdRenders.count).toBe(0);
    // 입력 폼 안이나 하단 CTA 위에 끼우지 않는다
    expect(slots[0].closest("form")).toBeNull();
    const cards = container.querySelectorAll("[data-testid]");
    const lastCard = Array.from(cards).filter((el) => !el.contains(slots[0])).pop();
    if (lastCard) {
      expect(lastCard.compareDocumentPosition(slots[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("starter 플랜도 유료라 광고가 없다", () => {
    seed("starter");
    for (const s of SCREENS) {
      renderScreen(s);
      cleanup();
    }
    expect(adSlotRenders.count).toBe(0);
    expect(rewardAdRenders.count).toBe(0);
  });
});

describe("터치 영역 44×44px", () => {
  const MIN = 44;

  it("FloatingTabBar의 모든 [role=tab]은 최소 높이 44px 이상이고 가로로 늘어난다", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <FloatingTabBar
          items={[
            { label: "홈", path: "/" },
            { label: "실행 기록", path: "/runs" },
            { label: "템플릿", path: "/templates" },
          ]}
        />
      </MemoryRouter>,
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    for (const tab of tabs) {
      expect(parseFloat(tab.style.minHeight)).toBeGreaterThanOrEqual(MIN);
      expect(tab.style.flex).toMatch(/^1/);
    }
  });

  it("보상형 광고 버튼(.reward-ad-button)은 최소 높이 44px 이상이다", () => {
    const css = readFileSync(path.resolve(__dirname, "../styles/reward-ad.css"), "utf8");
    const block = css.match(/\.reward-ad-button\s*\{([^}]*)\}/)?.[1] ?? "";
    const minHeight = block.match(/min-height:\s*(\d+)px/)?.[1];
    expect(Number(minHeight)).toBeGreaterThanOrEqual(MIN);
    expect(block).toMatch(/width:\s*100%/);
  });
});
