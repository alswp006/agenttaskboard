import { describe, it, expect, vi } from "vitest";
import React from "react";
import { screen, fireEvent, act } from "@testing-library/react";

/**
 * PACKET-0019: 라우팅 + 전역 Provider + 탭바 배선 (App.tsx 단독 소유)
 *
 * AC-1[P0]: /, /templates, /runs, /plan에서 FloatingTabBar가 보이고, /flows/new에서는 보이지 않는다
 * AC-2[P0]: 11개 경로 모두 렌더링할 때 console.error가 0회다
 * AC-3[P0]: plan.expiresAt이 과거면 '이용권이 만료되어 무료 플랜으로 바뀌었어요' Toast가 1회 뜬다
 *
 * 이 테스트는 App.tsx가 직접 소유하는 AppStateProvider/ToastProvider/Routes/FloatingTabBar
 * 배선을 통합 검증한다 — 개별 페이지 로직은 이미 다른 패킷에서 단위 검증됐으므로,
 * TDS + SDK만 목킹하고 react-router-dom/AppState/Toast는 실제 구현을 그대로 쓴다.
 * (실제 useLocation/useParams가 필요 — mockRouter() 헬퍼는 useLocation을 고정값으로
 * 덮어써 <Routes> 매칭과 페이지의 location.state 사용을 깨뜨리므로 쓰지 않는다.)
 */

import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();

const { default: App } = await import("@/App");

// App.tsx가 정의해야 하는 11개 경로 — 동적 세그먼트는 존재하지 않는 더미 id로 채운다.
// (FlowDetail/RunDetail/Builder/TemplateDetail은 미존재 id에 EmptyState로 대응하도록
//  이미 구현돼 있어 렌더 자체는 안전하다.)
const ALL_ROUTES = [
  "/",
  "/flows/new",
  "/flows/flow_missing_1",
  "/flows/flow_missing_1/edit",
  "/generate",
  "/generate/result",
  "/runs",
  "/runs/run_missing_1",
  "/templates",
  "/templates/template_missing_1",
  "/plan",
];

const TAB_ROOT_ROUTES = ["/", "/templates", "/runs", "/plan"];

const EXPIRED_TOAST_MSG = "이용권이 만료되어 무료 플랜으로 바뀌었어요";

function expiredPlan() {
  return {
    tier: "pro" as const,
    purchasedAt: "2026-08-01T00:00:00.000Z",
    expiresAt: "2026-08-15T00:00:00.000Z", // 오늘(2026-09-16)보다 과거
  };
}

describe("라우팅 + 전역 Provider + 탭바 배선 (App.tsx 단독 소유)", () => {
  it("AC-1[P0]: 탭-루트 경로(/, /templates, /runs, /plan)에서 FloatingTabBar(4개 탭)가 보인다", () => {
    for (const path of TAB_ROOT_ROUTES) {
      const { unmount } = renderWithRouter(React.createElement(App), {
        initialEntries: [path],
      });
      expect(screen.getByRole("tablist"), `${path}에 탭바가 없음`).toBeInTheDocument();
      expect(screen.getAllByRole("tab")).toHaveLength(4);
      unmount();
    }
  });

  it("AC-1[P0]: /flows/new(탭-루트 아님)에서는 FloatingTabBar가 보이지 않는다", () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/flows/new"] });
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("AC-2[P0]: 11개 경로 모두 콘솔 에러 없이 렌더된다(흰 화면 없음)", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const path of ALL_ROUTES) {
      const { container, unmount } = renderWithRouter(React.createElement(App), {
        initialEntries: [path],
      });
      expect(container.textContent, `${path} 렌더 결과가 비어 있음(흰 화면)`).not.toBe("");
      unmount();
    }
    expect(errorSpy).toHaveBeenCalledTimes(0);
    errorSpy.mockRestore();
  });

  it("AC-2: 정의되지 않은 경로는 홈으로 리다이렉트된다", () => {
    // home-usage-row는 패킷 0008(Home) 구현의 항상 렌더되는 요소 — 홈 도달을 확인하는 안정적 지표.
    renderWithRouter(React.createElement(App), { initialEntries: ["/no-such-route"] });
    expect(screen.getByTestId("home-usage-row")).toBeInTheDocument();
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("AC-3[P0]: plan.expiresAt이 과거면 만료 안내 Toast가 정확히 1개 뜬다", () => {
    seedLocalStorage({ "atb:plan": expiredPlan() });
    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });
    const toasts = screen.getAllByText(EXPIRED_TOAST_MSG);
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toBeInTheDocument();
  });

  it("AC-3: 이용권이 유효하면(expiresAt null) 만료 Toast가 뜨지 않는다", () => {
    seedLocalStorage({
      "atb:plan": { tier: "free", purchasedAt: null, expiresAt: null },
    });
    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });
    expect(screen.queryByText(EXPIRED_TOAST_MSG)).not.toBeInTheDocument();
  });

  it("AC-3: 만료 Toast는 사라진 뒤 탭 이동으로 다시 뜨지 않는다(1회 보장)", () => {
    seedLocalStorage({ "atb:plan": expiredPlan() });
    // Toast 타이머는 렌더 시점에 잡힌다 — 가짜 타이머를 렌더 전에 켜야 앞당길 수 있다.
    vi.useFakeTimers();
    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });
    expect(screen.getByText(EXPIRED_TOAST_MSG)).toBeInTheDocument();

    // Toast는 2초(TOAST_DURATION_MS) 후 큐에서 빠진다.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();
    expect(screen.queryByText(EXPIRED_TOAST_MSG)).not.toBeInTheDocument();

    // 다른 탭으로 이동해도 만료 Toast가 재발화되지 않아야 한다(마운트 1회성 로직).
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[1]);
    expect(screen.queryByText(EXPIRED_TOAST_MSG)).not.toBeInTheDocument();
  });
});
