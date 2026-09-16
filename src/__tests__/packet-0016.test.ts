import { describe, it, expect, vi } from "vitest";
import React from "react";
import { screen, within } from "@testing-library/react";

/**
 * PACKET-0016: [부가] 템플릿 목록 /templates
 *
 * AC-1: 필터 없이 ListRow 6개가 렌더링된다
 * AC-2: 템플릿 행을 탭하면 navigate('/templates/<id>')가 호출된다
 * AC-3: 화면에 '커뮤니티'·'공유하기'·'업로드' 문구가 0건이다
 */

import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { TEMPLATES } from "@/data/templates";

mockTds();
mockAppsInToss();

// Templates.tsx는 정적 import되므로 mocks.ts의 mockRouter()(vi.doMock, 비-hoisted)는
// 너무 늦게 적용된다 — 파일 최상단에서 hoisting되는 리터럴 vi.mock을 직접 쓴다.
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// PlanAdSlot(무료 플랜 배너)이 내부적으로 useAppState()를 호출하므로, Templates.tsx가
// 이를 직접 쓰든 PlanAdSlot을 통해 간접적으로 쓰든 크래시 없이 렌더되도록 목킹한다.
vi.mock("@/hooks/AppStateContext", () => ({
  useAppState: () => ({
    flows: [],
    runs: [],
    usage: { month: "2026-09", runCount: 0 },
    plan: { tier: "free", purchasedAt: null, expiresAt: null },
    isFree: false,
    planExpiredOnBoot: false,
    consumeCorruption: () => false,
    refresh: vi.fn(),
  }),
  AppStateProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import Templates from "@/pages/Templates";

describe("[부가] 템플릿 목록 /templates", () => {
  it("AC-1: 필터 없이 ListRow 6개가 렌더링된다", () => {
    renderWithRouter(React.createElement(Templates));

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(6);
    expect(TEMPLATES).toHaveLength(6);

    // 실제 번들 템플릿 데이터의 제목이 화면에 노출되는지 확인
    expect(screen.getByText("아침 뉴스 요약 브리핑")).toBeInTheDocument();
    expect(screen.getByText("영어 번역 자동화")).toBeInTheDocument();
  });

  it("AC-2: 템플릿 행을 탭하면 navigate('/templates/<id>')가 호출된다", () => {
    renderWithRouter(React.createElement(Templates));

    const target = TEMPLATES[0];
    const row = screen.getByText(target.title).closest('[role="listitem"]') as HTMLElement;
    expect(row).not.toBeNull();
    row.click();

    expect(mockNavigate).toHaveBeenCalledWith(`/templates/${target.id}`);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("AC-2: 두 번째 템플릿 행을 탭해도 해당 id로 navigate가 호출된다", () => {
    renderWithRouter(React.createElement(Templates));

    const target = TEMPLATES[2];
    const row = screen.getByText(target.title).closest('[role="listitem"]') as HTMLElement;
    row.click();

    expect(mockNavigate).toHaveBeenCalledWith(`/templates/${target.id}`);
  });

  it("AC-3: 화면에 '커뮤니티'·'공유하기'·'업로드' 문구가 0건이다", () => {
    const { container } = renderWithRouter(React.createElement(Templates));
    const text = container.textContent ?? "";

    expect(text).not.toMatch(/커뮤니티/);
    expect(text).not.toMatch(/공유하기/);
    expect(text).not.toMatch(/업로드/);
  });

  it("카테고리 Chip으로 '알림' 카테고리를 선택하면 alert 템플릿만 남는다", () => {
    renderWithRouter(React.createElement(Templates));

    const alertChip = screen.getAllByRole("button").find((el) => /알림/.test(el.textContent ?? ""));
    expect(alertChip).toBeDefined();
    (alertChip as HTMLElement).click();

    const alertTemplates = TEMPLATES.filter((t) => t.category === "alert");
    const reportOnlyTemplates = TEMPLATES.filter((t) => t.category === "report");

    expect(screen.getAllByRole("listitem")).toHaveLength(alertTemplates.length);
    for (const t of alertTemplates) {
      expect(screen.getByText(t.title)).toBeInTheDocument();
    }
    for (const t of reportOnlyTemplates) {
      expect(screen.queryByText(t.title)).not.toBeInTheDocument();
    }
  });

  it("설정이 필요한 템플릿(requiredFields 존재)에는 Badge가 표시되고, 필요 없는 템플릿에는 없다", () => {
    renderWithRouter(React.createElement(Templates));

    const needsSetup = TEMPLATES.find((t) => t.requiredFields.length > 0)!;
    const noSetup = TEMPLATES.find((t) => t.requiredFields.length === 0)!;

    const needsSetupRow = screen.getByText(needsSetup.title).closest('[role="listitem"]') as HTMLElement;
    const noSetupRow = screen.getByText(noSetup.title).closest('[role="listitem"]') as HTMLElement;

    expect(within(needsSetupRow).queryByRole("status")).not.toBeNull();
    expect(within(noSetupRow).queryByRole("status")).toBeNull();
  });
});
