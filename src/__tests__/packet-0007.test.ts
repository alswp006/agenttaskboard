import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

/**
 * PACKET-0007: 앱 상태 Context · 전역 Toast · AI 고지 · 키보드 훅
 *
 * AC-1[P0]: atb:aiNoticeAck가 없으면 AI 고지 AlertDialog가 뜨고, "확인" 탭 시 { ackedAt: ISO }가 저장된다
 * AC-2[P0]: plan.tier가 'pro'면 PlanAdSlot이 null을 렌더링한다
 * AC-3[P0]: TextField 포커스 시 300ms 안에 scrollIntoView({block:'center'})가 호출된다
 */

import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();
mockTossRewardAd();

const { useAppStateMock } = vi.hoisted(() => ({ useAppStateMock: vi.fn() }));
vi.mock("@/hooks/AppStateContext", () => ({
  useAppState: useAppStateMock,
  AppStateProvider: ({ children }: any) => children,
}));

import { AiNoticeDialog } from "@/components/AiNoticeDialog";
import { PlanAdSlot } from "@/components/PlanAdSlot";
import { useKeyboardAware } from "@/hooks/useKeyboardAware";
import { ToastProvider, useAppToast } from "@/hooks/ToastProvider";

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function KeyboardProbe() {
  const { onFieldFocus } = useKeyboardAware();
  return React.createElement("input", { "data-testid": "kb-probe", onFocus: onFieldFocus });
}

function ToastScreenA() {
  const { showToast } = useAppToast();
  return React.createElement(
    "button",
    { onClick: () => showToast("저장했어요") },
    "toast-trigger",
  );
}

function ToastScreenB() {
  return React.createElement("div", null, "다른 화면");
}

describe("앱 상태 Context · 전역 Toast · AI 고지 · 키보드 훅", () => {
  beforeEach(() => {
    useAppStateMock.mockReturnValue({
      flows: [],
      runs: [],
      usage: { month: "2026-09", runCount: 0 },
      plan: { tier: "free", purchasedAt: null, expiresAt: null },
      isFree: true,
      planExpiredOnBoot: false,
      consumeCorruption: vi.fn(() => false),
      refresh: vi.fn(),
    });
  });

  it("AC-1[P0]: aiNoticeAck가 없으면 정확한 제목·본문으로 다이얼로그가 표시된다", () => {
    render(React.createElement(AiNoticeDialog, { onAck: vi.fn() }));

    const dialog = screen.getByRole("alertdialog", { name: "이 서비스는 생성형 AI를 활용합니다" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("이 서비스는 생성형 AI를 활용합니다")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "확인" })).toBeInTheDocument();
  });

  it("AC-1[P0]: '확인' 탭 전에는 저장·onAck 호출이 없고, 탭하면 { ackedAt: ISO }가 저장되며 onAck가 호출된다", () => {
    const onAck = vi.fn();
    render(React.createElement(AiNoticeDialog, { onAck }));

    expect(localStorage.getItem("atb:aiNoticeAck")).toBeNull();
    expect(onAck).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    const stored = JSON.parse(localStorage.getItem("atb:aiNoticeAck") ?? "{}");
    expect(stored.ackedAt).toMatch(ISO_RE);
    expect(onAck).toHaveBeenCalledTimes(1);
  });

  it("AC-1: atb:aiNoticeAck가 이미 있으면 다이얼로그를 다시 띄우지 않는다", () => {
    localStorage.setItem("atb:aiNoticeAck", JSON.stringify({ ackedAt: "2026-09-01T00:00:00.000Z" }));

    render(React.createElement(AiNoticeDialog, { onAck: vi.fn() }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("AC-2[P0]: plan.tier가 'pro'면 PlanAdSlot이 아무것도 렌더링하지 않는다", () => {
    useAppStateMock.mockReturnValue({
      flows: [],
      runs: [],
      usage: { month: "2026-09", runCount: 0 },
      plan: { tier: "pro", purchasedAt: "2026-08-01T00:00:00.000Z", expiresAt: null },
      isFree: false,
      planExpiredOnBoot: false,
      consumeCorruption: vi.fn(() => false),
      refresh: vi.fn(),
    });

    const { container } = render(React.createElement(PlanAdSlot));

    expect(container.firstChild).toBeNull();
    expect(container.querySelector("[data-ad-group-id]")).toBeNull();
  });

  it("AC-2[P0]: plan.tier가 'free'면 PlanAdSlot이 AdSlot을 렌더링한다", () => {
    const { container } = render(React.createElement(PlanAdSlot));

    expect(container.firstChild).not.toBeNull();
    expect(container.querySelector("[data-ad-group-id]")).not.toBeNull();
  });

  it("AC-3[P0]: TextField 포커스 시 300ms 안에 scrollIntoView({block:'center'})가 호출된다", () => {
    vi.useFakeTimers();
    render(React.createElement(KeyboardProbe));

    const input = screen.getByTestId("kb-probe") as HTMLInputElement;
    input.scrollIntoView = vi.fn();

    fireEvent.focus(input);
    vi.advanceTimersByTime(300);

    expect(input.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(input.scrollIntoView).toHaveBeenCalledWith({ block: "center" });

    vi.useRealTimers();
  });

  it("ToastProvider: 화면(children)이 바뀌어도 이미 뜬 Toast는 유지된다", () => {
    const { rerender } = render(
      React.createElement(ToastProvider, null, React.createElement(ToastScreenA)),
    );

    fireEvent.click(screen.getByText("toast-trigger"));
    expect(screen.getByText("저장했어요")).toBeInTheDocument();

    rerender(React.createElement(ToastProvider, null, React.createElement(ToastScreenB)));

    expect(screen.getByText("다른 화면")).toBeInTheDocument();
    expect(screen.getByText("저장했어요")).toBeInTheDocument();
  });
});
