import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";

// 라우터·AppState·Toast는 실제 구현 그대로 — App.tsx 배선 자체를 검증한다.
mockTds();
mockAppsInToss();

const { default: App } = await import("@/App");

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
const NON_TAB_ROUTES = ALL_ROUTES.filter((path) => !TAB_ROOT_ROUTES.includes(path));

const EXPIRED_TOAST_MSG = "이용권이 만료되어 무료 플랜으로 바뀌었어요";
const EXPIRED_PLAN = {
  tier: "pro",
  purchasedAt: "2026-08-01T00:00:00.000Z",
  expiresAt: "2026-08-15T00:00:00.000Z",
};

describe("App 배선", () => {
  it("AC-1: 탭-루트 4개 경로에서 탭 4개가 보이고 현재 경로 탭이 활성이다", () => {
    for (const path of TAB_ROOT_ROUTES) {
      const { unmount } = renderWithRouter(<App />, { initialEntries: [path] });
      const tabs = screen.getAllByRole("tab");
      expect(tabs.map((tab) => tab.textContent)).toEqual(["플로우", "템플릿", "실행 로그", "요금제"]);
      const active = tabs.filter((tab) => tab.getAttribute("aria-selected") === "true");
      expect(active, `${path} 활성 탭`).toHaveLength(1);
      expect(active[0].textContent).toBe(
        ["플로우", "템플릿", "실행 로그", "요금제"][TAB_ROOT_ROUTES.indexOf(path)],
      );
      unmount();
    }
  });

  it("AC-1: 탭-루트가 아닌 경로에서는 탭바가 DOM에 없다", () => {
    for (const path of NON_TAB_ROUTES) {
      const { unmount } = renderWithRouter(<App />, { initialEntries: [path] });
      expect(screen.queryByRole("tablist"), `${path}에 탭바가 있음`).not.toBeInTheDocument();
      unmount();
    }
  });

  it("AC-2: 11개 경로 모두 console.error 0회로 렌더된다", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const path of ALL_ROUTES) {
      const { container, unmount } = renderWithRouter(<App />, { initialEntries: [path] });
      expect(container.textContent, `${path} 흰 화면`).not.toBe("");
      unmount();
    }
    expect(errorSpy).toHaveBeenCalledTimes(0);
    errorSpy.mockRestore();
  });

  it("AC-3: 만료된 이용권이면 Toast가 1회 뜨고, 사라진 뒤 탭 이동으로 다시 뜨지 않는다", () => {
    seedLocalStorage({ "atb:plan": EXPIRED_PLAN });
    vi.useFakeTimers();
    renderWithRouter(<App />, { initialEntries: ["/"] });
    expect(screen.getAllByText(EXPIRED_TOAST_MSG)).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();
    expect(screen.queryByText(EXPIRED_TOAST_MSG)).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("tab")[2]);
    expect(screen.queryByText(EXPIRED_TOAST_MSG)).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("atb:plan") ?? "null")).toEqual({
      tier: "free",
      purchasedAt: null,
      expiresAt: null,
    });
  });

  it("AC-3: 유효한 이용권이면 만료 Toast가 없다", () => {
    seedLocalStorage({ "atb:plan": { tier: "free", purchasedAt: null, expiresAt: null } });
    renderWithRouter(<App />, { initialEntries: ["/"] });
    expect(screen.queryByText(EXPIRED_TOAST_MSG)).not.toBeInTheDocument();
  });
});
