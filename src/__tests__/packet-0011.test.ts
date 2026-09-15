import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

/**
 * PACKET-0011: 빌더 섹션 — reducer · 트리거/입력 · AI · 액션 BottomSheet
 *
 * AC-1: 액션이 3개면 '액션 추가' 버튼이 disabled다
 * AC-2: 두 번째 액션의 '위로'를 탭하면 actions 배열 0·1번 순서가 바뀐다
 * AC-3: task가 translate인데 targetLanguage가 null이면 시트의 '완료' 버튼이 disabled다
 */

import { mockTds } from "@/__tests__/__helpers__/mocks";
import type { Action, AiStep, FlowDraft } from "@/lib/types";

mockTds();

import { draftReducer } from "@/components/builder/draftReducer";
import { ActionListSheet } from "@/components/builder/ActionListSheet";
import { AiStepSheet } from "@/components/builder/AiStepSheet";

const BASE_DRAFT: FlowDraft = {
  name: "아침 뉴스 요약",
  input: { type: "news_keyword", keyword: "AI" },
  trigger: { type: "manual" },
  aiStep: { task: "summarize", instruction: "", targetLanguage: null },
  actions: [],
};

const IN_APP: Action = { type: "in_app" };
const SLACK: Action = {
  type: "slack_webhook",
  webhookUrl: "https://hooks.slack.com/services/T01/B02/abc",
};
const SHEET: Action = {
  type: "google_sheet_append",
  sheetUrl: "https://docs.google.com/spreadsheets/d/abc123",
  sheetName: "실행 기록",
};

describe("draftReducer — moveAction", () => {
  it("AC-2[reducer]: moveAction(1, 'up')을 하면 actions 배열 0·1번 순서가 바뀐다", () => {
    const draft: FlowDraft = { ...BASE_DRAFT, actions: [IN_APP, SLACK] };
    const next = draftReducer(draft, { type: "moveAction", index: 1, direction: "up" });

    expect(next.actions[0]).toEqual(SLACK);
    expect(next.actions[1]).toEqual(IN_APP);
  });

  it("removeAction을 하면 해당 인덱스의 액션이 빠진다", () => {
    const draft: FlowDraft = { ...BASE_DRAFT, actions: [IN_APP, SLACK, SHEET] };
    const next = draftReducer(draft, { type: "removeAction", index: 1 });

    expect(next.actions).toHaveLength(2);
    expect(next.actions).toEqual([IN_APP, SHEET]);
  });

  it("addAction을 하면 새 액션이 배열 끝에 추가된다", () => {
    const draft: FlowDraft = { ...BASE_DRAFT, actions: [IN_APP] };
    const next = draftReducer(draft, { type: "addAction", action: SLACK });

    expect(next.actions).toHaveLength(2);
    expect(next.actions[1]).toEqual(SLACK);
  });
});

describe("ActionListSheet", () => {
  it("AC-1: 액션이 3개면 '액션 추가' 버튼이 disabled이고 안내 문구가 보인다", () => {
    render(
      React.createElement(ActionListSheet, {
        open: true,
        actions: [IN_APP, SLACK, SHEET],
        onAdd: vi.fn(),
        onMove: vi.fn(),
        onRemove: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    const addButton = screen.getByRole("button", { name: /액션 추가/ });
    expect(addButton).toBeDisabled();
    expect(screen.getByText(/최대 3개까지/)).toBeInTheDocument();
  });

  it("액션이 2개면 '액션 추가' 버튼이 활성 상태다", () => {
    render(
      React.createElement(ActionListSheet, {
        open: true,
        actions: [IN_APP, SLACK],
        onAdd: vi.fn(),
        onMove: vi.fn(),
        onRemove: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    const addButton = screen.getByRole("button", { name: /액션 추가/ });
    expect(addButton).not.toBeDisabled();
  });

  it("AC-2: 두 번째 액션의 '위로'를 탭하면 onMove(1, 'up')가 호출된다", () => {
    const onMove = vi.fn();
    render(
      React.createElement(ActionListSheet, {
        open: true,
        actions: [IN_APP, SLACK],
        onAdd: vi.fn(),
        onMove,
        onRemove: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    const upButtons = screen.getAllByRole("button", { name: /위로/ });
    expect(upButtons).toHaveLength(2);
    fireEvent.click(upButtons[1]);

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith(1, "up");
  });

  it("카카오톡·네이버 캘린더 행은 '준비 중'이며 탭해도 onAdd가 호출되지 않는다", () => {
    const onAdd = vi.fn();
    render(
      React.createElement(ActionListSheet, {
        open: true,
        actions: [],
        onAdd,
        onMove: vi.fn(),
        onRemove: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    const preparingBadges = screen.getAllByText(/준비 중/);
    expect(preparingBadges.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getByText(/카카오톡/));
    fireEvent.click(screen.getByText(/네이버 캘린더/));

    expect(onAdd).not.toHaveBeenCalled();
  });
});

describe("AiStepSheet", () => {
  const TRANSLATE_NO_LANG: AiStep = { task: "translate", instruction: "", targetLanguage: null };
  const TRANSLATE_WITH_LANG: AiStep = { task: "translate", instruction: "영어로", targetLanguage: "en" };

  it("AC-3: task가 translate이고 targetLanguage가 null이면 '완료' 버튼이 disabled다", () => {
    render(
      React.createElement(AiStepSheet, {
        open: true,
        aiStep: TRANSLATE_NO_LANG,
        onDone: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    const doneButton = screen.getByRole("button", { name: /완료/ });
    expect(doneButton).toBeDisabled();
  });

  it("AC-3: targetLanguage가 채워지면 '완료' 버튼이 활성화되고 onDone이 최신 aiStep으로 호출된다", () => {
    const onDone = vi.fn();
    render(
      React.createElement(AiStepSheet, {
        open: true,
        aiStep: TRANSLATE_WITH_LANG,
        onDone,
        onClose: vi.fn(),
      }),
    );

    const doneButton = screen.getByRole("button", { name: /완료/ });
    expect(doneButton).not.toBeDisabled();

    fireEvent.click(doneButton);

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({ task: "translate", targetLanguage: "en" }),
    );
  });
});
