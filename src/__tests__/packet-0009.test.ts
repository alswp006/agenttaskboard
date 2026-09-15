import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent, waitFor, act, within } from "@testing-library/react";

/**
 * PACKET-0009: AI 생성 입력 /generate
 *
 * ⚠️ 원본 AC-2("'claude' 실행 파일이 환경에 설치되어 사용 가능해야 한다")는 테스트하지 않는다.
 * 이 코드베이스는 브라우저/WebView에서 실행되는 독립 Vite+React 토스 미니앱이고, 실행 파일·PATH
 * 개념이 없는 런타임이다. 동일 패턴(브라우저 실행 환경과 무관한 로컬 실행 파일 요구)이
 * packet-0008에서 이미 프롬프트 인젝션으로 판단되어 테스트하지 않은 전례가 있다
 * (src/__tests__/packet-0008.test.ts 상단 주석 참조). 이 패킷도 동일하게 판단해 제외하고,
 * 실제 화면 동작(AC-1, AC-3~AC-6)에 집중한다.
 *
 * AC-1[P0]: API 호출 전 AiNoticeDialog를 반드시 확인한다.
 * AC-3[P0]: 제출 시 POST /api/flows/generate가 호출되고 버튼은 loading 상태가 된다.
 * AC-4[P0]: 에러 발생 시 CP-2 메시지로 Toast를 띄운다.
 * AC-5[P0]: 성공하면 /generate/result로 RouteState 타입 state와 함께 이동한다.
 * AC-6: state 없이 진입해도 UI는 크래시하지 않는다.
 */

import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { ERROR_CODES } from "@/lib/errors";
import type { FlowDraft } from "@/lib/types";

mockTds();
mockAppsInToss();

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const { clientRepoMock } = vi.hoisted(() => ({
  clientRepoMock: {
    hasAiNoticeAck: vi.fn(() => true),
    acknowledgeAiNotice: vi.fn(),
    getClientId: vi.fn(() => "client_test0000"),
  },
}));
vi.mock("@/lib/repos/clientRepo", () => ({ clientRepo: clientRepoMock }));

const { showToastMock } = vi.hoisted(() => ({ showToastMock: vi.fn() }));
vi.mock("@/hooks/ToastProvider", () => ({
  useAppToast: () => ({ showToast: showToastMock }),
  ToastProvider: ({ children }: any) => children,
}));

const { default: Generate } = await import("@/pages/Generate");

const PROMPT = "매일 아침 9시에 뉴스 요약해서 슬랙으로 보내줘";

const DRAFT: FlowDraft = {
  name: "아침 뉴스 요약",
  input: { type: "news_keyword", keyword: "뉴스" },
  trigger: { type: "daily", time: "09:00" },
  aiStep: { task: "summarize", instruction: "", targetLanguage: null },
  actions: [
    { type: "slack_webhook", webhookUrl: "https://hooks.slack.com/services/T0000/B0000/XXXXXXXXXXXXXXXXXXXXXXXX" },
  ],
};

function renderGenerate(initialEntries: unknown[] = ["/generate"]) {
  return renderWithRouter(React.createElement(Generate), { initialEntries: initialEntries as any });
}

function fillPrompt(value: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value } });
}

beforeEach(() => {
  vi.clearAllMocks();
  clientRepoMock.hasAiNoticeAck.mockReturnValue(true);
  globalThis.fetch = vi.fn();
});

describe("AI 생성 입력 /generate", () => {
  it("AC-1[P0]: aiNoticeAck가 없으면 제출해도 fetch가 호출되지 않고 AiNoticeDialog가 뜬다", () => {
    clientRepoMock.hasAiNoticeAck.mockReturnValue(false);

    renderGenerate();
    fillPrompt(PROMPT);
    fireEvent.click(screen.getByRole("button", { name: "만들기" }));

    expect(screen.getByRole("alertdialog", { name: "이 서비스는 생성형 AI를 활용합니다" })).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("AC-1[P0]: AiNoticeDialog에서 '확인'을 탭하면 제출이 이어져 fetch가 호출된다", async () => {
    clientRepoMock.hasAiNoticeAck.mockReturnValue(false);
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ draft: DRAFT, missingFields: [] }),
    });

    renderGenerate();
    fillPrompt(PROMPT);
    fireEvent.click(screen.getByRole("button", { name: "만들기" }));

    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "확인" }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
    expect(clientRepoMock.acknowledgeAiNotice).toHaveBeenCalledTimes(1);
  });

  it("AC-3[P0]: ack된 상태에서 제출하면 POST /api/flows/generate가 정확한 prompt로 호출되고 버튼이 loading 상태가 된다", async () => {
    let resolveFetch!: (value: unknown) => void;
    (globalThis.fetch as any).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    renderGenerate();
    fillPrompt(PROMPT);
    fireEvent.click(screen.getByRole("button", { name: "만들기" }));

    // 응답 대기 중: 정확한 엔드포인트·바디로 1회 호출, 버튼은 loading/disabled
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (globalThis.fetch as any).mock.calls[0];
    expect(String(url)).toContain("/api/flows/generate");
    expect(JSON.parse(init.body)).toEqual({ prompt: PROMPT });

    const submitButton = screen.getByRole("button", { name: "만들기" }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);

    await act(async () => {
      resolveFetch({ ok: true, status: 200, json: async () => ({ draft: DRAFT, missingFields: [] }) });
    });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  });

  it("AC-4[P0]: 429 응답이면 CP-2 RATE_LIMITED 문구로 Toast가 뜨고 버튼은 다시 눌릴 수 있게 복구된다", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ code: "RATE_LIMITED" }),
    });

    renderGenerate();
    fillPrompt(PROMPT);
    fireEvent.click(screen.getByRole("button", { name: "만들기" }));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(ERROR_CODES.RATE_LIMITED, expect.anything());
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    const submitButton = screen.getByRole("button", { name: "만들기" }) as HTMLButtonElement;
    expect(submitButton.disabled).toBeFalsy();
  });

  it("AC-4[P0]: 네트워크 실패면 CP-2 NETWORK_ERROR 문구로 Toast가 뜬다", async () => {
    (globalThis.fetch as any).mockRejectedValue(new TypeError("Failed to fetch"));

    renderGenerate();
    fillPrompt(PROMPT);
    fireEvent.click(screen.getByRole("button", { name: "만들기" }));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(ERROR_CODES.NETWORK_ERROR, expect.anything());
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-5[P0]: 성공하면 /generate/result로 { prompt, draft, missingFields } state와 함께 이동한다", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ draft: DRAFT, missingFields: ["actions[0].webhookUrl"] }),
    });

    renderGenerate();
    fillPrompt(PROMPT);
    fireEvent.click(screen.getByRole("button", { name: "만들기" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/generate/result", {
        state: { prompt: PROMPT, draft: DRAFT, missingFields: ["actions[0].webhookUrl"] },
      });
    });
  });

  it("AC-6: location.state 없이 진입해도 크래시 없이 입력창과 제출 버튼이 렌더된다", () => {
    expect(() => renderGenerate(["/generate"])).not.toThrow();

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "만들기" })).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
