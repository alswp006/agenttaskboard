import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { TEMPLATES } from "@/data/templates";

mockAll();

let isFree = true;
vi.mock("@/hooks/AppStateContext", () => ({
  useAppState: () => ({
    flows: [],
    runs: [],
    usage: { month: "2026-09", runCount: 0 },
    plan: { tier: isFree ? "free" : "pro", purchasedAt: null, expiresAt: null },
    isFree,
    planExpiredOnBoot: false,
    consumeCorruption: () => false,
    refresh: () => {},
  }),
  AppStateProvider: ({ children }: any) => children,
}));

const { default: Templates } = await import("@/pages/Templates");

beforeEach(() => {
  isFree = true;
  mockNavigate.mockClear();
});

describe("Templates page", () => {
  it("AC-1: 필터 없이 ListRow 6개가 렌더링된다", () => {
    expect(TEMPLATES).toHaveLength(6);
    renderWithRouter(<Templates />);
    expect(screen.getAllByTestId("template-row")).toHaveLength(6);
  });

  it("AC-2: 템플릿 행을 탭하면 navigate('/templates/<id>')가 호출된다", () => {
    renderWithRouter(<Templates />);
    const rows = screen.getAllByTestId("template-row");
    rows[0].click();
    expect(mockNavigate).toHaveBeenCalledWith(`/templates/${TEMPLATES[0].id}`);
  });

  it("AC-3: 화면에 '커뮤니티'·'공유하기'·'업로드' 문구가 없다", () => {
    const { container } = renderWithRouter(<Templates />);
    expect(container.textContent).not.toMatch(/커뮤니티|공유하기|업로드/);
  });

  it("DoD: plan pro에서는 AdSlot이 렌더되지 않는다", () => {
    isFree = false;
    const { container } = renderWithRouter(<Templates />);
    expect(container.querySelector("[data-ad-group-id]")).toBeNull();
  });
});
