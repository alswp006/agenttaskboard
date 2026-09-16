/**
 * PACKET-0018: [부가] 요금제 /plan — TDD 테스트 (RED phase)
 *
 * AC-1[P0]: 스타터 구매 onPurchased가 호출되면 plan.tier가 'starter', expiresAt이 now+30일로 저장된다
 * AC-2[P1]: state { reason: 'quota_exceeded' }로 들어오면 '이번 달 실행 횟수를 모두 사용했어요' 문구가 보인다
 * AC-3[P1]: 화면에 '고급 연동' 문구가 0건이다
 *
 * 통합 스타일 — 실제 AppStateProvider + planRepo(localStorage)를 그대로 쓴다(packet-0015 패턴).
 * Toast 훅만 mock해서 role="status"인 TDS Badge("이용 중")와의 쿼리 충돌을 피한다.
 * SKU는 .ai-factory/spec.md AC-2·AC-3 그대로: 스타터 VITE_TOSS_IAP_SKU, 프로 VITE_TOSS_IAP_SKU_PRO.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import { AppStateProvider } from "@/hooks/AppStateContext";
import { planRepo } from "@/lib/repos/planRepo";
import type { PlanLocationState } from "@/navigation/types";

mockTds();
mockAppsInToss();

// mocks.ts의 mockRouter()는 vi.doMock(비-hoisted)이라 Plan을 정적 import하는 이 파일에는
// 너무 늦게 적용된다(packet-0015와 같은 순서 문제) — 파일 최상단에서 hoisting되는 리터럴
// vi.mock을 직접 써서 mockNavigate/mockLocation.state가 실제로 반영되게 한다.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

// Toast는 스파이로만 검증한다 — 실제 TDS Toast를 렌더하면 mockTds()의 Badge("이용 중")도
// role="status"라서 getByRole("status")가 모호해진다.
const { showToastMock } = vi.hoisted(() => ({ showToastMock: vi.fn() }));
vi.mock("@/hooks/ToastProvider", () => ({
  useAppToast: () => ({ showToast: showToastMock }),
  ToastProvider: ({ children }: any) => children,
}));

import { IAP } from "@apps-in-toss/web-framework";
import Plan from "@/pages/Plan";

const DAY_MS = 24 * 60 * 60 * 1000;

function renderPlan() {
  return render(
    React.createElement(
      AppStateProvider,
      null,
      React.createElement(MemoryRouter, { initialEntries: ["/plan"] }, React.createElement(Plan)),
    ),
  );
}

function setLocationState(state: PlanLocationState) {
  (mockLocation as { state: unknown }).state = state;
}

describe("[부가] 요금제 /plan", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    showToastMock.mockClear();
    localStorage.clear();
    mockLocation.pathname = "/plan";
    setLocationState(null);
    vi.stubEnv("VITE_TOSS_IAP_SKU", "toss-plan-starter-30d");
    vi.stubEnv("VITE_TOSS_IAP_SKU_PRO", "toss-plan-pro-30d");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("AC-1[P0]: 스타터 구매가 끝나면 plan.tier가 'starter', expiresAt이 purchasedAt+30일로 저장된다", async () => {
    renderPlan();
    const before = Date.now();

    const starterCard = screen.getByTestId("plan-card-starter");
    fireEvent.click(within(starterCard).getByRole("button"));

    await waitFor(() => {
      expect(planRepo.get().tier).toBe("starter");
    });

    const plan = planRepo.get();
    expect(plan.purchasedAt).not.toBeNull();
    expect(plan.expiresAt).not.toBeNull();
    const purchasedAt = new Date(plan.purchasedAt as string).getTime();
    const expiresAt = new Date(plan.expiresAt as string).getTime();
    expect(purchasedAt).toBeGreaterThanOrEqual(before);
    expect(expiresAt - purchasedAt).toBe(30 * DAY_MS);
  });

  it("AC-1[P0]: 구매 성공 후 refresh되어 화면에 '스타터'가 반영되고 성공 Toast가 뜬다", async () => {
    renderPlan();

    const starterCard = screen.getByTestId("plan-card-starter");
    fireEvent.click(within(starterCard).getByRole("button"));

    await waitFor(() => {
      expect(
        within(screen.getByTestId("current-plan-card")).getByText(/스타터/),
      ).toBeInTheDocument();
    });
    expect(showToastMock).toHaveBeenCalledTimes(1);
    expect(showToastMock.mock.calls[0][0]).toContain("스타터");
  });

  it("AC-1[P0]-error: 결제가 실패하면 plan은 free로 유지되고 실패 안내 Toast가 뜬다", async () => {
    (IAP.createOneTimePurchaseOrder as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (opts: { onError?: (e: unknown) => void }) => {
        opts.onError?.(new Error("USER_CANCELED"));
        return () => {};
      },
    );

    renderPlan();
    const starterCard = screen.getByTestId("plan-card-starter");
    fireEvent.click(within(starterCard).getByRole("button"));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledTimes(1);
    });

    expect(planRepo.get().tier).toBe("free");
    expect(showToastMock.mock.calls[0][0]).toContain("완료되지 않았어요");
  });

  it("AC-2[P1]: state { reason: 'quota_exceeded' }로 들어오면 안내 문구가 보인다", () => {
    setLocationState({ reason: "quota_exceeded" });

    renderPlan();

    expect(screen.getByTestId("quota-exceeded-notice")).toHaveTextContent(
      "이번 달 실행 횟수를 모두 사용했어요",
    );
  });

  it("AC-2[P1]: state 없이 들어오면 한도 초과 안내 문구가 보이지 않는다", () => {
    setLocationState(null);

    renderPlan();

    expect(screen.queryByTestId("quota-exceeded-notice")).not.toBeInTheDocument();
  });

  it("AC-3[P1]: 화면 어디에도 '고급 연동' 문구가 없다", () => {
    setLocationState({ reason: "quota_exceeded" });

    renderPlan();

    expect(screen.queryByText(/고급 연동/)).not.toBeInTheDocument();
    expect(screen.getByTestId("current-plan-card")).toBeInTheDocument();
  });
});
