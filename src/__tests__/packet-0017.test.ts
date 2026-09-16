import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";

/**
 * PACKET-0017: [부가] 템플릿 상세 /templates/:templateId
 *
 * AC-1[P0]: 가져온 뒤 채워야 할 필드가 있는 템플릿이면 안내 문구가 보인다
 * AC-2[P0]: '이 템플릿 사용하기'를 탭하면 templateId가 담긴 state로 /flows/new로 이동한다
 *           (단, 플로우 50개 상한을 넘겼으면 이동하지 않는다)
 * AC-3[P0]: 없는 templateId면 크래시 없이 '템플릿을 찾을 수 없어요' 빈 상태가 보인다
 */

import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { TEMPLATES } from "@/data/templates";
import type { Flow, RouteState } from "@/lib/types";

mockTds();
mockAppsInToss();

// react-router-dom: useNavigate 스텁 + useParams는 테스트별로 바꿀 수 있게 참조로 제어.
const { mockNavigate, paramsRef } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  paramsRef: { current: { templateId: "tpl-daily-news-brief" } as { templateId: string } },
}));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => paramsRef.current,
  };
});

// 실제 경로: @/hooks/AppStateContext (packet-0013 FlowDetail과 동일 확인).
const { useAppStateMock, appStateValue } = vi.hoisted(() => {
  const appStateValue = {
    flows: [] as Flow[],
    runs: [] as unknown[],
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

import TemplateDetail from "@/pages/TemplateDetail";

function setTemplateId(templateId: string) {
  paramsRef.current = { templateId };
}

function setFlowCount(count: number) {
  appStateValue.flows = Array.from({ length: count }, (_, i) => ({ id: `flow_${i}` }) as Flow);
}

function renderDetail() {
  return renderWithRouter(React.createElement(TemplateDetail));
}

const TEMPLATE_WITH_REQUIRED = TEMPLATES.find((t) => t.requiredFields.length > 0)!;
const TEMPLATE_WITHOUT_REQUIRED = TEMPLATES.find((t) => t.requiredFields.length === 0)!;

describe("[부가] 템플릿 상세 /templates/:templateId", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    showToastMock.mockClear();
    setFlowCount(0);
    setTemplateId(TEMPLATE_WITHOUT_REQUIRED.id);
  });

  it("AC-1[P0]: 가져온 뒤 채워야 할 필드가 있는 템플릿이면 안내 문구가 보인다", () => {
    setTemplateId(TEMPLATE_WITH_REQUIRED.id);
    renderDetail();

    expect(screen.getByText(TEMPLATE_WITH_REQUIRED.title)).toBeInTheDocument();
    expect(screen.getByText(/채워야/)).toBeInTheDocument();
  });

  it("AC-1[P0]: 채워야 할 필드가 없는 템플릿이면 안내 문구가 보이지 않는다", () => {
    setTemplateId(TEMPLATE_WITHOUT_REQUIRED.id);
    renderDetail();

    expect(screen.getByText(TEMPLATE_WITHOUT_REQUIRED.title)).toBeInTheDocument();
    expect(screen.queryByText(/채워야/)).not.toBeInTheDocument();
  });

  it("AC-2[P0]: '이 템플릿 사용하기'를 탭하면 templateId가 담긴 state로 /flows/new로 이동한다", () => {
    setTemplateId(TEMPLATE_WITH_REQUIRED.id);
    renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "이 템플릿 사용하기" }));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const [path, options] = mockNavigate.mock.calls[0];
    expect(path).toBe("/flows/new");
    const state = (options as { state: RouteState["/flows/new"] }).state;
    expect(state).toMatchObject({
      templateId: TEMPLATE_WITH_REQUIRED.id,
      draft: TEMPLATE_WITH_REQUIRED.draft,
      source: "template",
    });
  });

  it("AC-2[P0]: 플로우가 50개면 상한 확인 후 이동하지 않고 안내한다", () => {
    setFlowCount(50);
    setTemplateId(TEMPLATE_WITHOUT_REQUIRED.id);
    renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "이 템플릿 사용하기" }));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledTimes(1);
  });

  it("AC-3[P0]: 없는 templateId면 크래시 없이 '템플릿을 찾을 수 없어요' 빈 상태가 보인다", () => {
    setTemplateId("tpl-does-not-exist");

    expect(() => renderDetail()).not.toThrow();
    expect(screen.getByText("템플릿을 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "이 템플릿 사용하기" })).not.toBeInTheDocument();
  });
});
