import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

/**
 * PACKET-0012: 빌더 페이지 /flows/new, /flows/:flowId/edit
 *
 * AC-1[P0]: 이름이 빈 채로 저장하면 이름 TextField가 error 상태가 되고 저장 0회다
 * AC-2[P0]: 플로우가 50개일 때 /flows/new에서 저장하면 '플로우는 최대 50개까지 만들 수 있어요' Toast가 뜨고 개수는 50이다
 * AC-3[P0]: state 없이 /flows/new에 들어오면 크래시 없이 빈 초안이 표시된다
 *
 * 실제 localStorage 기반 flowRepo·AppStateProvider·ToastProvider를 그대로 사용하는
 * 통합 스타일 테스트다 — useBuilderSave가 내부적으로 어떤 toast 훅을 쓰든(useAppToast/useToast)
 * 실제 ToastProvider가 렌더한 DOM 텍스트로 검증하므로 구현 세부사항에 얽매이지 않는다.
 */

import { mockTds, mockAppsInToss, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import { AppStateProvider } from "@/hooks/AppStateContext";
import { ToastProvider } from "@/hooks/ToastProvider";
import { flowRepo } from "@/lib/repos/flowRepo";
import type { Flow, FlowDraft, BuilderLocationState } from "@/lib/types";

mockTds();
mockAppsInToss();

// mocks.ts의 mockRouter()는 vi.doMock(비-hoisted)이라 Builder를 정적 import하는 이 파일에는
// 너무 늦게 적용된다(packet-0010과 같은 순서 문제) — 파일 최상단에서 hoisting되는 리터럴
// vi.mock을 직접 써서 mockNavigate/mockLocation.state가 실제로 반영되게 한다.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

import Builder from "@/pages/Builder";

const VALID_DRAFT: FlowDraft = {
  name: "아침 브리핑",
  input: { type: "text", text: "오늘 일정 요약해줘" },
  trigger: { type: "manual" },
  aiStep: { task: "summarize", instruction: "", targetLanguage: null },
  actions: [{ type: "in_app" }],
};

function makeFlow(id: string, overrides: Partial<Flow> = {}): Flow {
  return {
    id,
    name: `기존 플로우 ${id}`,
    input: { type: "text", text: "본문" },
    trigger: { type: "manual" },
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
    ...overrides,
  };
}

function seedFlows(flows: Flow[]) {
  localStorage.setItem("atb:flows", JSON.stringify(flows));
}

function setLocationState(state: BuilderLocationState | null) {
  (mockLocation as { state: unknown }).state = state;
}

function renderBuilder(initialPath: string) {
  return render(
    React.createElement(
      AppStateProvider,
      null,
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          MemoryRouter,
          { initialEntries: [initialPath] },
          React.createElement(
            Routes,
            null,
            React.createElement(Route, { path: "/flows/new", element: React.createElement(Builder) }),
            React.createElement(Route, { path: "/flows/:flowId/edit", element: React.createElement(Builder) }),
          ),
        ),
      ),
    ),
  );
}

function saveButton() {
  return screen.getByRole("button", { name: /저장/ });
}

describe("빌더 페이지 /flows/new, /flows/:flowId/edit", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
    mockLocation.pathname = "/flows/new";
    setLocationState(null);
  });

  it("AC-1[P0]: 이름이 빈 채로 저장하면 이름 필드에 에러가 뜨고 flowRepo에 아무것도 생성되지 않는다", () => {
    renderBuilder("/flows/new");

    fireEvent.click(saveButton());

    expect(screen.getByText("플로우 이름을 입력해주세요")).toBeInTheDocument();
    expect(flowRepo.list()).toHaveLength(0);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-2[P0]: 플로우가 50개일 때 저장하면 최대 개수 Toast가 뜨고 개수는 50 그대로다", () => {
    const existing = Array.from({ length: 50 }, (_, i) => makeFlow(`flow_seed_${i}`));
    seedFlows(existing);
    setLocationState({ draft: VALID_DRAFT, source: "template", templateId: "tmpl_1", missingFields: [] });

    renderBuilder("/flows/new");
    fireEvent.click(saveButton());

    expect(screen.getByText(/플로우는 최대 50개까지 만들 수 있어요/)).toBeInTheDocument();
    expect(flowRepo.list()).toHaveLength(50);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-3[P0]: state 없이 /flows/new에 들어오면 크래시 없이 빈 초안(3단계 카드·빈 이름)이 표시된다", () => {
    setLocationState(null);

    expect(() => renderBuilder("/flows/new")).not.toThrow();
    expect(screen.getByText(/트리거/)).toBeInTheDocument();
    expect(screen.getByText(/AI 처리/)).toBeInTheDocument();
    expect(screen.getByText(/액션/)).toBeInTheDocument();
    expect(screen.getByLabelText(/이름/)).toHaveValue("");
  });

  it("유효한 draft로 저장하면 flowRepo에 1개가 생성되고 새 플로우 상세로 이동한다", () => {
    setLocationState({ draft: VALID_DRAFT, source: "template", templateId: "tmpl_1", missingFields: [] });

    renderBuilder("/flows/new");
    fireEvent.click(saveButton());

    const created = flowRepo.list();
    expect(created).toHaveLength(1);
    expect(created[0].name).toBe("아침 브리핑");
    expect(mockNavigate).toHaveBeenCalledWith(`/flows/${created[0].id}`);
  });

  it("기존 플로우를 /flows/:flowId/edit로 열면 폼에 기존 이름이 채워진다", () => {
    const existing = makeFlow("flow_edit_target", { name: "저녁 요약 발송" });
    seedFlows([existing]);
    mockLocation.pathname = "/flows/flow_edit_target/edit";
    setLocationState(null);

    renderBuilder("/flows/flow_edit_target/edit");

    expect(screen.getByLabelText(/이름/)).toHaveValue("저녁 요약 발송");
  });
});
