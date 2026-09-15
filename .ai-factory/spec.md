# SPEC — AgentTaskBoard

> 플랫폼: 앱인토스 미니앱 (Vite + React + TypeScript + TDS `@toss/tds-mobile` + React Router + localStorage)
> 범위: MVP. 로그인·TDS 셋업·AdSlot·TossRewardAd·TossPurchase·localStorage 헬퍼는 템플릿에 이미 있어 이 SPEC에서 다루지 않습니다.
> 표기: 에러·엣지 케이스 AC는 `[W][P1]`로 태그하고, Scenario 제목을 "에러 케이스:" 또는 "엣지 케이스:"로 시작합니다.

---

## Common Principles

### CP-1. 기술·구조
- **페이지 골격:** 모든 화면은 `ScreenScaffold`로 감쌉니다. raw `div`로 페이지 골격을 만들지 않습니다.
- **1차 액션 버튼:** `SubmitFooter`(하단 고정) 또는 `display="block"` TDS Button으로 둡니다. 글자 폭만큼만 차지하는 좌측 정렬 버튼은 쓰지 않습니다.
- **간격:** TDS `Spacing`(size prop 필수)으로만 조절합니다. TDS 컴포넌트의 padding/margin을 인라인 스타일로 덮어쓰지 않습니다.
- **커스텀 CSS·색상:** 커스텀 CSS는 flex/grid 배치에만 씁니다. 색상은 `var(--tds-color-*)` 또는 TDS 컴포넌트만 씁니다(다크모드 지원).
- **하단 탭:** 템플릿의 `src/components/FloatingTabBar`를 씁니다.
  - 탭은 4개입니다: 플로우 `/`, 템플릿 `/templates`, 실행 로그 `/runs`, 요금제 `/plan`.
  - 이 4개 경로에서만 보입니다.
- **Navigation state 타입:** `src/navigation/types.ts` 한 곳에서 정의합니다. 보내는 쪽과 받는 쪽이 같은 타입을 import합니다.
- **서버:** 서버 코드는 이 저장소에 두지 않습니다. AI 생성·실행·스케줄은 외부 API 서버(Railway에 따로 배포)를 호출합니다. 주소는 `import.meta.env.VITE_API_BASE_URL`입니다.
- **시간대:** `Asia/Seoul`(KST)로 고정합니다. "이번 달", "오늘", "최근 7일"은 모두 KST 기준입니다.
- **ID 형식**
  - 플로우: `flow_` + base36 8자
  - 클라이언트가 만든 실행: `run_` + base36 12자
  - 클라이언트 식별자 `clientId`: UUID v4
- **터치 영역:** 모든 인터랙티브 요소는 44×44px 이상입니다.
- **목록 스크롤**
  - 플로우(최대 50개)와 템플릿(번들 6개)은 일반 스크롤입니다.
  - 실행 로그(최대 200개)는 20개씩 렌더링하고 "더 보기" 버튼으로 늘립니다. 200개 이하라서 가상 스크롤은 쓰지 않습니다.
- **광고**
  - 배너 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`: 무료 플랜에서만, 콘텐츠 섹션 사이나 목록 뒤에 둡니다. 입력 폼과 SubmitFooter 위에는 두지 않습니다.
  - 보상형 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`: 무료 플랜의 AI 생성 결과 미리보기에만 씁니다.
- **프로모션 리워드:** `grantPromotionReward`는 MVP에서 쓰지 않습니다. 나중에 도입하면 호출 전에 `amount ≤ 5000`을 검사해야 합니다.

### CP-2. 공통 에러 메시지 (정확한 문자열)
| 코드 | 메시지 |
|---|---|
| NETWORK_ERROR | 네트워크 연결을 확인해주세요 |
| STORAGE_FULL | 저장 공간이 부족해요. 오래된 실행 로그를 삭제해주세요 |
| QUOTA_EXCEEDED | 이번 달 실행 횟수를 모두 사용했어요 |
| RATE_LIMITED | 잠시 후 다시 시도해주세요 |
| DATA_CORRUPTED | 저장된 데이터를 불러오지 못했어요 |

### CP-3. 전역 검수·법규 AC (모든 기능에 적용)

- **G-AC-1 [W][P0]: Scenario: 외부 도메인 이탈 차단**
  - Given 플로우에 `{ type: "slack_webhook", webhookUrl: "https://hooks.slack.com/services/T000/B000/XXX" }` 액션이 저장되어 있을 때
  - When 플로우 상세·빌더·실행 상세 화면을 렌더링하면
  - Then URL은 `<a>` 태그 없이 `Paragraph.Text` 평문으로만 표시됩니다
  - And 정적 검사에서 `src/` 전체의 `window.open(` 호출이 0건입니다
  - And `window.location.href =`에 외부 URL을 넣는 코드도 0건입니다.

- **G-AC-2 [U][P1]: Scenario: 콘솔 에러 0개**
  - Given `vite build` 프로덕션 번들을 띄웠을 때
  - When `/`, `/flows/new`, `/generate`, `/runs`, `/templates`, `/plan`을 차례로 방문하면
  - Then 수집된 `console.error` 호출 수가 0입니다.

- **G-AC-3 [U][P0]: Scenario: CORS 설정**
  - Given 외부 API 서버가 배포되어 있을 때
  - When 앱 origin에서 `X-Client-Id` 헤더를 포함해 `OPTIONS /api/runs` preflight를 보내면
  - Then 응답은 204입니다
  - And `Access-Control-Allow-Origin`에 앱 origin이 들어 있습니다
  - And `Access-Control-Allow-Headers`에 `Content-Type, X-Client-Id`가 들어 있습니다.

- **G-AC-4 [U][P1]: Scenario: Android 7+ / iOS 16+ 호환**
  - Given `vite.config.ts`의 `build.target`이 `["es2017", "safari16"]`일 때
  - When `src/`를 정적 검사하면
  - Then `structuredClone`, `Array.prototype.at`, `Object.hasOwn`, `String.prototype.replaceAll` 사용이 0건입니다.

- **G-AC-5 [W][P1]: Scenario: 앱 설치 유도 문구 금지**
  - Given 소스 코드와 번들 템플릿 데이터가 있을 때
  - When `src/`에서 정규식 `설치하세요|다운로드|앱 설치|스토어에서`를 검색하면
  - Then 매치가 0건입니다.

- **G-AC-6 [W][P0]: Scenario: 외부 분석 솔루션 금지**
  - Given `package.json`과 `index.html`이 있을 때
  - When 의존성과 스크립트 태그를 검사하면
  - Then `react-ga`, `react-ga4`, `@amplitude/*`, `mixpanel*`, `firebase`, `gtag`, `googletagmanager` 문자열이 0건입니다.

- **G-AC-7 [W][P1]: Scenario: HEX 색상 하드코딩 금지**
  - Given `src/**/*.{ts,tsx,css}` 파일이 있을 때
  - When 정규식 `#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{8}\b`로 검색하면
  - Then 매치가 0건이고, 색상은 `var(--tds-color-*)`로만 지정됩니다.

- **G-AC-8 [E][P0]: Scenario: 생성형 AI 첫 이용 고지**
  - Given localStorage에 `atb:aiNoticeAck` 키가 없을 때
  - When 사용자가 `/generate`에 처음 들어가거나, 플로우 상세에서 "지금 실행"을 처음 탭하면
  - Then TDS AlertDialog가 아래 내용으로 표시됩니다
    - 제목: "이 서비스는 생성형 AI를 활용합니다"
    - 본문: "AI가 만든 플로우와 실행 결과는 부정확할 수 있어요. 내용을 확인한 뒤 사용해주세요"
    - 버튼: "확인"
  - And "확인"을 탭하기 전에는 외부 API 호출이 0건입니다
  - And "확인"을 탭하면 `atb:aiNoticeAck = { "ackedAt": "<ISO>" }`가 저장되고, 이후 방문에서는 다이얼로그가 다시 뜨지 않습니다.

- **G-AC-9 [U][P0]: Scenario: AI 결과물 라벨 표시**
  - Given AI가 만든 결과(`/generate/result`의 플로우 미리보기, `/runs/:runId`의 `aiOutput`)가 화면에 나올 때
  - Then 결과 Card 상단에 TDS Badge `data-testid="ai-generated-badge"`가 "AI가 생성한 결과입니다" 텍스트로 표시됩니다
  - And `source: "ai"`인 플로우의 상세 화면에는 Badge "AI 생성"이 표시됩니다.

- **G-AC-10 [S][P1]: Scenario: 모바일 키보드 대응**
  - Given 빌더 또는 `/generate` 화면에서 SubmitFooter가 보일 때
  - When 사용자가 TDS TextField나 TextArea에 포커스하면
  - Then 300ms 안에 해당 필드가 `scrollIntoView({ block: "center" })`로 화면 가운데에 옵니다
  - And SubmitFooter는 `visualViewport.height` 기준으로 키보드 바로 위에 붙습니다
  - And 한 줄 TextField는 `enterKeyHint="done"`이고, Enter를 누르면 blur됩니다.

- **G-AC-11 [U][P1]: Scenario: 터치 영역**
  - Given 모든 라우트를 렌더링했을 때
  - When `button, a, [role="switch"], [role="tab"], [data-touch]` 요소의 bounding box를 재면
  - Then 모든 요소의 width와 height가 44px 이상입니다.

---

## Data Models

### 공통 타입

```ts
// src/types/flow.ts
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type HHmm = string; // /^([01]\d|2[0-3]):(00|30)$/ — 30분 단위

export type Trigger =
  | { type: 'manual' }
  | { type: 'daily'; time: HHmm }
  | { type: 'weekly'; days: Weekday[]; time: HHmm }; // days.length 1~7, 중복 없음

export type InputSource =
  | { type: 'text'; text: string }                            // 1~2000자
  | { type: 'google_sheet'; sheetUrl: string; range: string } // range: /^[A-Z]{1,3}[0-9]{1,5}:[A-Z]{1,3}[0-9]{1,5}$/
  | { type: 'news_keyword'; keyword: string };                // 1~20자

export type AiTask = 'summarize' | 'classify' | 'translate' | 'custom';
export interface AiStep {
  task: AiTask;
  instruction: string;                               // 0~500자. classify·custom은 1자 이상 필수
  targetLanguage: 'ko' | 'en' | 'ja' | 'zh' | null;  // translate일 때 필수, 그 외 null
}

export type Action =
  | { type: 'in_app' }
  | { type: 'slack_webhook'; webhookUrl: string }                  // /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9\/_-]+$/
  | { type: 'google_sheet_append'; sheetUrl: string; sheetName: string }; // sheetUrl: /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]+/, sheetName 1~50자
// 'kakao_talk' | 'naver_calendar' 은 MVP에서 "준비 중" 표시만 하고 타입에는 포함하지 않음

export interface FlowDraft {
  name: string;         // trim 후 1~30자
  input: InputSource;
  trigger: Trigger;
  aiStep: AiStep;
  actions: Action[];    // 1~3개, 배열 순서 = 실행 순서
}

export type RunStatus = 'success' | 'failed';

export interface Flow extends FlowDraft {
  id: string;                        // 'flow_xxxxxxxx'
  source: 'manual' | 'ai' | 'template';
  templateId: string | null;
  enabled: boolean;                  // 서버 스케줄 등록 여부 (manual 트리거면 항상 false)
  nextRunAt: string | null;          // ISO, 서버 응답값
  lastRunAt: string | null;          // ISO
  lastRunStatus: RunStatus | null;
  createdAt: string;                 // ISO
  updatedAt: string;                 // ISO
}
```

```ts
// src/types/run.ts
export type RunErrorCode =
  | 'AI_FAILED' | 'SLACK_WEBHOOK_FAILED' | 'SHEET_ACCESS_DENIED'
  | 'NEWS_FETCH_FAILED' | 'NETWORK_ERROR' | 'TIMEOUT';

export interface StepResult {
  stage: 'trigger' | 'ai' | 'action';
  label: string;              // 예: "구글 시트 A1:D50 읽기", "요약", "슬랙 전송"
  status: 'success' | 'failed' | 'skipped';
  message: string | null;     // 최대 200자
}

export interface RunLog {
  id: string;                        // 'run_xxxxxxxxxxxx' (클라이언트가 생성해 서버에 전달)
  flowId: string;
  flowName: string;                  // 실행 시점 스냅샷
  trigger: 'manual' | 'schedule';
  status: RunStatus;
  startedAt: string;                 // ISO
  finishedAt: string | null;         // ISO
  durationMs: number | null;
  aiOutput: string | null;           // 최대 4000자
  steps: StepResult[];               // 최대 5개 (trigger 1 + ai 1 + action 최대 3)
  errorCode: RunErrorCode | null;
  errorMessage: string | null;       // 최대 200자
}
```

```ts
// src/types/plan.ts
export type PlanTier = 'free' | 'starter' | 'pro';
export interface PlanState { tier: PlanTier; purchasedAt: string | null; expiresAt: string | null; }
export interface UsageState { month: string; runCount: number; } // month: 'YYYY-MM' (KST)
export const RUN_LIMIT: Record<PlanTier, number | null> = { free: 100, starter: 1000, pro: null }; // null = 무제한
```

```ts
// src/types/template.ts
export interface FlowTemplate {
  id: string;                                   // 'tpl_news_slack' 등
  title: string;                                // 1~30자
  description: string;                          // 1~80자
  category: 'report' | 'alert' | 'data';        // 리포트 / 알림 / 데이터 정리
  draft: FlowDraft;                             // 사용자가 채워야 할 필드는 '' 로 비워둠
  requiredFields: string[];                     // 예: ['actions.0.webhookUrl']
}
```

```ts
// src/navigation/types.ts
export type BuilderLocationState =
  | { draft: FlowDraft; source: 'ai' | 'template'; templateId: string | null; missingFields: string[] }
  | null;
export type GenerateLocationState = { prompt: string } | null;
export type GenerateResultLocationState = { prompt: string; draft: FlowDraft; missingFields: string[] } | null;
export type RunsLocationState = { filter: 'all' | 'success' | 'failed' } | null;
export type PlanLocationState = { reason: 'quota_exceeded' } | null;
```

### localStorage 키와 용량 추정

localStorage 한도는 약 5,000,000 UTF-16 문자로 봅니다.

| 키 | 형태 | 제약 | 최대 크기(문자) |
|---|---|---|---|
| `atb:flows` | `Flow[]` | 최대 50개 | 1개 ≈ 3,500 (text 2,000 + instruction 500 + actions 600 + 기타 400) → **175,000** |
| `atb:runs` | `RunLog[]` | 최대 200개, 넘치면 `startedAt`이 가장 오래된 것부터 삭제 | 1개 ≈ 5,500 (aiOutput 4,000 + steps 1,000 + 기타 500) → **1,100,000** |
| `atb:runs:lastSyncedAt` | `string` (ISO) | — | 30 |
| `atb:runs:lastSeenAt` | `string` (ISO) | 실패 알림을 읽은 기준 시각 | 30 |
| `atb:usage` | `UsageState` | — | 50 |
| `atb:plan` | `PlanState` | — | 120 |
| `atb:clientId` | `string` (UUID v4) | 첫 실행 때 1회 생성 | 40 |
| `atb:aiNoticeAck` | `{ ackedAt: string }` | — | 50 |
| `atb:<key>:backup` | `string` (손상된 원본) | 파싱에 실패하면 1개만 보관 | 원본 이하 |

**합계 최대 ≈ 1,280,000자 (< 5,000,000).**

템플릿은 `src/data/templates.ts`에 번들된 정적 데이터이며 localStorage에 저장하지 않습니다.

---

## Feature List

### F1. 데이터 레이어 (저장소 · 검증기 · API 클라이언트)

- **Description:** 플로우·실행 로그·사용량·요금제를 localStorage에 읽고 쓰는 리포지토리 모듈을 제공합니다. 모든 화면이 함께 쓰는 `FlowDraft` 검증기와 외부 API 클라이언트도 함께 제공합니다. UI 없는 순수 TypeScript 모듈로 만들고 단위 테스트로 검증합니다.
- **Data:** `atb:flows`, `atb:runs`, `atb:runs:lastSyncedAt`, `atb:runs:lastSeenAt`, `atb:usage`, `atb:plan`, `atb:clientId`
- **API:** API 클라이언트 래퍼만 둡니다. 엔드포인트는 [API Contract](#api-contract)를 봅니다.
- **Requirements:**

- **AC-1 [E][P0]: Scenario: 플로우 신규 저장**
  - Given `atb:flows`가 `[]`일 때
  - When `flowRepo.create({ draft: { name: "아침 뉴스 요약", input: { type: "news_keyword", keyword: "AI" }, trigger: { type: "daily", time: "09:00" }, aiStep: { task: "summarize", instruction: "", targetLanguage: null }, actions: [{ type: "in_app" }] }, source: "manual", templateId: null })`를 호출하면
  - Then 반환된 Flow는 다음과 같습니다
    - `id`가 `/^flow_[0-9a-z]{8}$/`에 맞습니다
    - `enabled`는 `false`, `lastRunAt`은 `null`입니다
    - `createdAt`과 `updatedAt`은 같은 ISO 문자열입니다
  - And `atb:flows`의 길이는 1입니다.

- **AC-2 [U][P0]: Scenario: 실행 로그 200개 상한**
  - Given `atb:runs`에 `startedAt`이 서로 다른 RunLog 200개가 있을 때
  - When `runRepo.add(newRun)`을 호출하면
  - Then 길이는 200으로 유지됩니다
  - And `startedAt`이 가장 오래된 1개가 삭제되고, `newRun.id`가 목록에 들어갑니다.

- **AC-3 [E][P0]: Scenario: 월 사용량 자동 초기화**
  - Given `atb:usage = { month: "2026-08", runCount: 87 }`이고 현재 KST 시각이 `2026-09-01T00:05+09:00`일 때
  - When `usageRepo.get()`을 호출하면
  - Then `{ month: "2026-09", runCount: 0 }`을 반환하고 저장합니다.

- **AC-4 [U][P0]: Scenario: FlowDraft 검증기 오류 메시지**
  - Given 검증기 `validateFlowDraft(draft)`가 있을 때
  - When 아래 입력을 각각 검증하면
  - Then 결과는 `{ valid: false, errors }`이고, `errors[필드경로]`에 정확히 다음 메시지가 들어 있습니다.

    | 입력 | 필드 경로 | 메시지 |
    |---|---|---|
    | `name: "  "` | `name` | "플로우 이름을 입력해주세요" |
    | `name`이 31자 | `name` | "이름은 30자 이내로 입력해주세요" |
    | `trigger: { type: "weekly", days: [], time: "09:00" }` | `trigger.days` | "요일을 1개 이상 선택해주세요" |
    | `trigger: { type: "daily", time: "" }` | `trigger.time` | "실행 시간을 선택해주세요" |
    | `input: { type: "text", text: "" }` | `input.text` | "처리할 텍스트를 입력해주세요" |
    | `input: { type: "google_sheet", sheetUrl: "https://example.com", range: "A1:D50" }` | `input.sheetUrl` | "구글 스프레드시트 주소 형식이 올바르지 않아요" |
    | `input.range: "A1-D50"` | `input.range` | "범위는 A1:D50 형식으로 입력해주세요" |
    | `input: { type: "news_keyword", keyword: "" }` | `input.keyword` | "뉴스 키워드를 입력해주세요" |
    | `aiStep: { task: "custom", instruction: "" }` | `aiStep.instruction` | "AI에게 시킬 일을 입력해주세요" |
    | `aiStep: { task: "classify", instruction: "" }` | `aiStep.instruction` | "분류 기준을 입력해주세요" |
    | `aiStep.instruction`이 501자 | `aiStep.instruction` | "지시문은 500자 이내로 입력해주세요" |
    | `aiStep: { task: "translate", targetLanguage: null }` | `aiStep.targetLanguage` | "번역할 언어를 선택해주세요" |
    | `actions: []` | `actions` | "액션을 1개 이상 추가해주세요" |
    | `actions[0] = { type: "slack_webhook", webhookUrl: "http://hooks.slack.com/x" }` | `actions.0.webhookUrl` | "슬랙 Webhook 주소 형식이 올바르지 않아요" |
    | `actions[0] = { type: "google_sheet_append", sheetUrl: "https://docs.google.com/spreadsheets/d/abc", sheetName: "" }` | `actions.0.sheetName` | "시트 이름을 입력해주세요" |

  - And 유효한 draft는 `{ valid: true, errors: {} }`를 반환합니다.

- **AC-5 [W][P1]: Scenario: 에러 케이스 — localStorage 용량 초과(QuotaExceededError)로 저장 실패**
  - Given `localStorage.setItem`이 `QuotaExceededError`를 던지도록 mock했을 때
  - When `runRepo.add(run)`을 호출하면
  - Then 가장 오래된 RunLog 50개를 지우고 한 번 다시 시도합니다
  - And 다시 시도해도 실패하면 `StorageFullError`(message: "저장 공간이 부족해요. 오래된 실행 로그를 삭제해주세요")를 던집니다
  - And `flowRepo.create`에서 같은 에러가 나면 로그를 지우지 않고 곧바로 `StorageFullError`를 던집니다.

- **AC-6 [W][P1]: Scenario: 에러 케이스 — 손상된 JSON(invalid) 파싱 실패 복구**
  - Given `atb:flows`의 값이 `"[{broken"`일 때
  - When `flowRepo.list()`를 호출하면
  - Then `[]`를 반환합니다
  - And 원본 문자열 `"[{broken"`을 `atb:flows:backup`에 저장하고, `atb:flows`를 `"[]"`로 덮어씁니다
  - And 반환 메타에 `corrupted: true`가 들어갑니다. 화면은 이 값을 보고 DATA_CORRUPTED 에러 토스트를 띄웁니다
  - And `JSON.parse`는 되지만 배열이 아닌 값(예: `"{\"a\":1}"`)도 같은 방식으로 복구합니다.

- **AC-7 [W][P1]: Scenario: 에러 케이스 — API 클라이언트 에러(HTTP error·network error·timeout) 매핑**
  - Given `VITE_API_BASE_URL = "https://api.agenttaskboard.app"`이고 `atb:clientId = "3f2a...-uuid"`일 때
  - When `api.post("/api/runs", body, { timeoutMs: 30000 })`를 호출하면
  - Then 요청 URL은 `https://api.agenttaskboard.app/api/runs`입니다
  - And 헤더에 `Content-Type: application/json`과 `X-Client-Id: 3f2a...-uuid`가 들어갑니다
  - And 응답이 `400 { "error": "FLOW_INVALID" }`이면 `ApiError { code: "FLOW_INVALID", status: 400 }`를 던집니다
  - And fetch가 reject되면 `ApiError { code: "NETWORK_ERROR", status: 0 }`를 던집니다
  - And 30,000ms를 넘기면 AbortController로 요청을 취소하고 `ApiError { code: "TIMEOUT", status: 0 }`를 던집니다
  - And 응답 본문이 JSON이 아니면(invalid body) `ApiError { code: "INVALID_RESPONSE", status: <HTTP status> }`를 던집니다.

- **AC-8 [E][P1]: Scenario: 빈 저장소(empty state) 첫 로드 — clientId 생성과 기본값 반환**
  - Given localStorage에 `atb:*` 키가 하나도 없을 때
  - When 앱이 처음 로드되면
  - Then `atb:clientId`에 UUID v4 형식(`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/`)의 값이 저장되고, 두 번째 로드에서도 같은 값이 유지됩니다
  - And `flowRepo.list()`는 `[]`와 `corrupted: false`를 반환합니다
  - And `runRepo.list()`는 `[]`를 반환합니다
  - And `planRepo.get()`은 `{ tier: "free", purchasedAt: null, expiresAt: null }`을 반환합니다.

---

### F2. 홈 — 플로우 목록 & 탭 셸

- **Description:** 앱 첫 화면에서 내가 만든 플로우를 트리거·AI 처리·액션 요약과 마지막 실행 상태로 보여줍니다. 새 플로우는 "AI로 만들기"나 "직접 만들기"로 시작합니다. 이번 달 사용량과 읽지 않은 실패 알림도 함께 보여줍니다.
- **Data:** `atb:flows`(읽기), `atb:runs`·`atb:runs:lastSeenAt`(실패 수 계산), `atb:usage`, `atb:plan`
- **API:** 없음
- **Requirements:**

- **AC-1 [U][P0]: Scenario: 플로우 목록 렌더링**
  - Given `atb:flows`에 아래 2개가 있을 때
    - A: `updatedAt "2026-09-15T10:00Z"`, name "주간 시트 요약", trigger `{ type: "weekly", days: ["mon","wed"], time: "18:00" }`, aiStep.task "summarize", actions `[{ type: "slack_webhook" }, { type: "in_app" }]`, lastRunStatus "failed"
    - B: `updatedAt "2026-09-16T08:00Z"`, name "아침 뉴스 요약", trigger `{ type: "daily", time: "09:00" }`, actions `[{ type: "in_app" }]`, lastRunStatus null
  - When `/`에 들어가면
  - Then `data-testid="flow-list"` 안의 TDS ListRow가 B, A 순서입니다(updatedAt 내림차순)
  - And A의 부제는 "매주 월·수 18:00 · 요약 · 슬랙 전송 외 1개"이고, 오른쪽 TDS Badge는 "실패"입니다
  - And B의 부제는 "매일 09:00 · 요약 · 앱에 저장"이고, Badge는 "실행 전"입니다.

- **AC-2 [E][P0]: Scenario: 플로우 생성 진입**
  - Given `/` 화면일 때
  - When TDS Button "AI로 만들기"를 탭하면 state 없이 `navigate("/generate")`가 호출됩니다
  - And TDS Button "직접 만들기"를 탭하면 state 없이 `navigate("/flows/new")`가 호출됩니다
  - And 플로우 ListRow B를 탭하면 `navigate("/flows/flow_b1c2d3e4")`가 호출됩니다.

- **AC-3 [S][P1]: Scenario: 빈 상태(empty state)**
  - Given `atb:flows`가 `[]`일 때
  - When `/`에 들어가면
  - Then `data-testid="flow-empty"` 영역에 TDS `Asset.ContentIcon`, 문구 "아직 만든 플로우가 없어요", TDS Button "템플릿 둘러보기"가 표시됩니다
  - And "템플릿 둘러보기"를 탭하면 `navigate("/templates")`가 호출됩니다.

- **AC-4 [S][P1]: Scenario: 읽지 않은 실패 알림**
  - Given `atb:runs:lastSeenAt = "2026-09-15T00:00Z"`이고, 그 뒤의 `startedAt`을 가진 `status: "failed"` RunLog가 2개 있을 때
  - When `/`에 들어가면
  - Then 목록 위에 `data-testid="home-failure-alert"` ListRow "실패한 실행 2건이 있어요"가 표시됩니다
  - And 탭하면 `navigate("/runs", { state: { filter: "failed" } })`가 호출됩니다
  - And 실패 건수가 0이면 이 ListRow는 렌더링되지 않습니다.

- **AC-5 [U][P1]: Scenario: 이번 달 사용량 요약**
  - Given `atb:plan = { tier: "free" }`이고 `atb:usage = { month: "2026-09", runCount: 37 }`일 때
  - When `/`에 들어가면
  - Then `data-testid="usage-summary"` ListRow에 "이번 달 실행 37/100회"와 37% 비율 MiniBar가 표시됩니다
  - And 탭하면 `navigate("/plan")`이 호출됩니다
  - And `tier: "pro"`이면 문구는 "이번 달 실행 37회 · 무제한"이고 MiniBar는 숨깁니다.

- **AC-6 [W][P1]: Scenario: 에러 케이스 — 손상된 저장 데이터(invalid JSON) 로드 실패**
  - Given `flowRepo.list()`가 `corrupted: true`를 반환할 때
  - When `/`에 들어가면
  - Then TDS Toast "저장된 데이터를 불러오지 못했어요"가 1회 표시되고, AC-3의 빈 상태가 렌더링됩니다
  - And 화면을 다시 렌더링해도 Toast는 다시 뜨지 않습니다
  - And `atb:usage`가 파싱할 수 없는 값 `"{month:"`이면 `{ month: <현재 KST YYYY-MM>, runCount: 0 }`으로 복구하고, `usage-summary`에 "이번 달 실행 0/100회"가 표시됩니다.

- **AC-7 [U][P1]: Scenario: 하단 탭 표시 범위**
  - Given 앱이 로드되었을 때
  - When 경로가 `/`, `/templates`, `/runs`, `/plan` 중 하나이면
  - Then FloatingTabBar가 탭 4개(플로우·템플릿·실행 로그·요금제)와 함께 표시되고, 현재 경로의 탭이 활성 상태입니다
  - And 경로가 `/flows/new`, `/flows/:flowId`, `/generate`, `/runs/:runId`이면 FloatingTabBar가 DOM에 없습니다.

- **AC-8 [W][P1]: Scenario: 엣지 케이스 — 플로우 50개 상한을 넘는 생성 시도 차단(error toast)**
  - Given `atb:flows` 길이가 50일 때
  - When "AI로 만들기"나 "직접 만들기"를 탭하면
  - Then `navigate`는 0회 호출됩니다
  - And TDS Toast "플로우는 최대 50개까지 만들 수 있어요"가 표시됩니다
  - And `atb:flows` 길이가 49이면 같은 탭에서 `navigate`가 1회 호출됩니다(경곗값 확인).

---

### F3. 플로우 빌더 (트리거 → AI 처리 → 액션 3단계)

- **Description:** 트리거(입력 데이터 포함) → AI 처리 → 액션을 세로로 이어진 Card 3개로 보여주는 빌더입니다. Card를 탭하면 BottomSheet에서 설정합니다. 직접 만들기, AI 생성 결과, 템플릿 가져오기로 받은 초안을 모두 이 화면에서 편집하고 저장합니다.
- **Data:** `atb:flows`(생성·수정)
- **API:** 스케줄이 켜진 플로우를 수정해 저장하면 `PUT /api/schedules/:flowId`를 호출합니다(F5 AC-6).
- **Requirements:**

- **AC-1 [U][P0]: Scenario: 3단계 레이아웃**
  - Given state 없이 `/flows/new`에 들어갔을 때
  - Then ScreenScaffold 안에 TDS TextField "플로우 이름"이 있습니다
  - And 그 아래 Card 3개가 `data-testid="stage-card-trigger"`, `"stage-card-ai"`, `"stage-card-action"` 순서로 세로 배치됩니다
  - And Card 사이에 `data-testid="stage-connector"` 연결 표시가 2개 있습니다
  - And 초기값은 다음과 같습니다
    - trigger `{ type: "manual" }`
    - input `{ type: "text", text: "" }`
    - aiStep `{ task: "summarize", instruction: "", targetLanguage: null }`
    - actions `[]`
  - And 화면 하단 SubmitFooter에 `display="block"` TDS Button "저장"이 있습니다.

- **AC-2 [E][P0]: Scenario: 트리거·입력 설정**
  - Given 빌더 화면일 때
  - When 다음을 차례로 하면
    1. `stage-card-trigger`를 탭합니다
    2. TDS BottomSheet에서 "매일"을 고릅니다
    3. 시간 목록(00:00~23:30, 30분 단위 ListRow 48개, 스크롤)에서 "09:00"을 탭합니다
    4. 입력 데이터 "뉴스 키워드"를 고르고 TextField에 "AI"를 입력합니다
    5. "완료"를 탭합니다
  - Then BottomSheet가 닫힙니다
  - And `stage-card-trigger` 요약에 "매일 09:00 · 뉴스 키워드 'AI'"가 표시됩니다
  - And "매주"를 고르면 요일 TDS Chip 7개(월~일)가 다중 선택으로 표시됩니다.

- **AC-3 [E][P0]: Scenario: 액션 추가·순서 변경·삭제**
  - Given actions가 `[{ type: "in_app" }]`일 때
  - When `stage-card-action`의 "액션 추가"를 탭하고, BottomSheet에서 "슬랙 보내기"를 고른 뒤, TextField "Webhook 주소"에 `https://hooks.slack.com/services/T01/B02/abc`를 입력하고 "완료"를 탭하면
  - Then actions는 `[{ type: "in_app" }, { type: "slack_webhook", webhookUrl: "https://hooks.slack.com/services/T01/B02/abc" }]`입니다
  - And 2번째 액션 행의 "위로" 아이콘 버튼(44×44px)을 탭하면 순서가 `[slack_webhook, in_app]`이 됩니다
  - And "삭제" 아이콘 버튼을 탭하면 그 액션이 빠집니다
  - And actions 길이가 3이면 "액션 추가" 버튼이 disabled이고, 보조 문구 "액션은 최대 3개까지 추가할 수 있어요"가 표시됩니다.

- **AC-4 [E][P0]: Scenario: 저장 성공**
  - Given 다음 값을 입력했을 때
    - 이름 "아침 뉴스 요약"
    - trigger daily 09:00, input news_keyword "AI"
    - aiStep summarize, actions `[{ type: "in_app" }]`
  - When "저장"을 탭하면
  - Then `atb:flows`에 `source: "manual"`인 Flow 1개가 추가됩니다
  - And TDS Toast "플로우를 저장했어요"가 표시됩니다
  - And `navigate("/flows/<새 id>", { replace: true })`가 호출됩니다
  - And `/flows/:flowId/edit`에서 저장하면 같은 id의 Flow가 갱신되고, `updatedAt`만 새 시각으로 바뀝니다.

- **AC-5 [W][P1]: Scenario: 에러 케이스 — 검증 실패(invalid input) 시 저장 차단**
  - Given 이름 "", trigger `{ type: "weekly", days: [], time: "09:00" }`, actions `[]`일 때
  - When "저장"을 탭하면
  - Then `atb:flows`는 바뀌지 않습니다
  - And 다음 에러 텍스트가 표시됩니다
    - TextField 아래: "플로우 이름을 입력해주세요"
    - `stage-card-trigger` 안: "요일을 1개 이상 선택해주세요"
    - `stage-card-action` 안: "액션을 1개 이상 추가해주세요"
  - And 첫 번째 에러 요소(이름 TextField)가 `scrollIntoView({ block: "center" })`로 스크롤됩니다.

- **AC-6 [E][P1]: Scenario: 초안 prefill과 누락 필드 강조**
  - Given `navigate("/flows/new", { state: { draft: { name: "아침 뉴스 요약", ..., actions: [{ type: "slack_webhook", webhookUrl: "" }] }, source: "ai", templateId: null, missingFields: ["actions.0.webhookUrl"] } })`로 들어왔을 때
  - Then 모든 필드가 draft 값으로 채워집니다
  - And `stage-card-action`에 에러 텍스트 "슬랙 Webhook 주소를 입력해야 해요"가 표시됩니다
  - And 저장하면 Flow의 `source`는 `"ai"`, `templateId`는 `null`입니다.

- **AC-7 [S][P1]: Scenario: 준비 중인 연동**
  - Given 액션 추가 BottomSheet가 열려 있을 때
  - Then "카카오톡 보내기"와 "네이버 캘린더 등록" ListRow는 TDS Badge "준비 중"과 함께 흐리게(disabled) 표시됩니다
  - And 탭해도 actions는 바뀌지 않고, TDS Toast "카카오톡 연동은 준비 중이에요" 또는 "네이버 캘린더 연동은 준비 중이에요"가 표시됩니다
  - And "구글 시트에 기록"을 고르면 BottomSheet에 안내 문구 "이 시트를 {VITE_SHEET_SERVICE_ACCOUNT_EMAIL} 계정에 편집자로 공유해주세요"가 평문으로 표시됩니다.

- **AC-8 [W][P1]: Scenario: 에러 케이스 — 이탈 확인·없는 플로우(not found)·저장 공간 부족으로 저장 실패**
  - Given 빌더에서 이름을 "테스트"로 바꾸고 저장하지 않았을 때
  - When TDS Top의 뒤로가기를 탭하면
  - Then TDS AlertDialog "저장하지 않고 나갈까요?"(버튼 "나가기" / "계속 편집")가 표시되고, "나가기"를 탭해야만 `navigate(-1)`이 호출됩니다
  - And `/flows/flow_notexist/edit`로 들어오면 `Asset.ContentIcon`, 문구 "플로우를 찾을 수 없어요", TDS Button "홈으로"(→ `navigate("/", { replace: true })`)가 표시됩니다
  - And 저장 중 `StorageFullError`가 나면 TDS Toast "저장 공간이 부족해요. 오래된 실행 로그를 삭제해주세요"가 표시되고 화면은 그대로 유지됩니다.

---

### F4. 자연어 플로우 생성 (AI)

- **Description:** 사용자가 "매일 오전 9시 뉴스 요약해서 슬랙에 보내줘"처럼 문장으로 요청하면, 외부 AI API가 `FlowDraft`를 만들고 앱이 3단계 미리보기로 보여줍니다. 무료 플랜은 보상형 광고를 본 뒤 결과를 확인합니다. 결과는 빌더로 넘겨 누락 필드를 채운 뒤 저장합니다.
- **Data:** `atb:aiNoticeAck`, `atb:plan`(광고 게이트 여부)
- **API:** `POST /api/flows/generate { prompt: string } → { draft: FlowDraft; missingFields: string[] }` | 400 PROMPT_INVALID, 422 UNSUPPORTED_REQUEST, 429 RATE_LIMITED, 500 AI_UNAVAILABLE
- **Requirements:**

- **AC-1 [E][P0]: Scenario: 자연어 생성 성공**
  - Given `atb:aiNoticeAck`가 있고 `/generate` 화면일 때
  - When TDS TextArea에 "매일 오전 9시 뉴스 요약해서 슬랙에 보내줘"를 입력하고 SubmitFooter의 "플로우 만들기"를 탭하면
  - Then `POST /api/flows/generate { "prompt": "매일 오전 9시 뉴스 요약해서 슬랙에 보내줘" }`가 정확히 1회 호출됩니다
  - And 200 응답으로 다음을 받으면
    ```json
    { "draft": { "name": "아침 뉴스 요약", "input": { "type": "news_keyword", "keyword": "뉴스" }, "trigger": { "type": "daily", "time": "09:00" }, "aiStep": { "task": "summarize", "instruction": "", "targetLanguage": null }, "actions": [{ "type": "slack_webhook", "webhookUrl": "" }] }, "missingFields": ["actions.0.webhookUrl"] }
    ```
  - Then `navigate("/generate/result", { state: { prompt, draft, missingFields } })`가 호출됩니다.

- **AC-2 [E][P1]: Scenario: 예시 문장 Chip**
  - Given `/generate` 화면일 때
  - Then TDS Chip 3개가 표시됩니다
    - "매일 오전 9시 뉴스 요약해서 슬랙에 보내줘"
    - "매주 월요일 시트 데이터 요약해서 슬랙에 보내줘"
    - "고객 문의 텍스트를 분류해서 시트에 기록해줘"
  - When 2번째 Chip을 탭하면
  - Then TextArea 값이 "매주 월요일 시트 데이터 요약해서 슬랙에 보내줘"로 바뀝니다.

- **AC-3 [W][P1]: Scenario: 에러 케이스 — 입력 길이 검증 실패(invalid prompt)**
  - Given `/generate` 화면일 때
  - When TextArea에 "뉴스"(2자)를 입력하고 "플로우 만들기"를 탭하면
  - Then API 호출은 0회이고, TextArea 아래에 에러 텍스트 "5자 이상 입력해주세요"가 표시됩니다
  - And 공백만 5자(`"     "`)를 입력해도 trim 후 0자로 보고 같은 에러가 표시됩니다
  - And TextArea는 `maxLength={300}`이며, "뉴스"를 입력한 상태에서 오른쪽 아래에 "2/300" 카운터가 표시됩니다.

- **AC-4 [S][P1]: Scenario: 생성 중 로딩 상태(loading state)**
  - Given API 요청이 진행 중일 때
  - Then "플로우 만들기" Button은 `loading` 상태이자 disabled입니다
  - And 버튼 위에 Paragraph.Text "AI가 플로우를 설계하고 있어요"가 표시됩니다
  - And 이 상태에서 버튼을 3회 연속 탭해도 추가 API 호출은 0회입니다.

- **AC-5 [W][P1]: Scenario: 에러 케이스 — 지원하지 않는 요청·잘못된 AI 응답(invalid response)**
  - Given `/generate` 화면일 때
  - When 다음 중 하나가 일어나면
    - API가 `422 { "error": "UNSUPPORTED_REQUEST" }`를 반환합니다
    - 200 응답의 draft가 `actions.length === 0`입니다
    - 200 응답의 draft에서 `trigger.type`이 정의되지 않은 값(예: `"hourly"`)입니다
  - Then 화면을 이동하지 않습니다
  - And TextArea 아래에 에러 텍스트 "아직 지원하지 않는 요청이에요. 언제·무엇을·어디로 보낼지 드러나게 다시 적어주세요"가 표시됩니다
  - And `navigate` 호출은 0회입니다.

- **AC-6 [W][P1]: Scenario: 에러 케이스 — 네트워크 오류(network error)·서버 실패·타임아웃**
  - Given `/generate`에서 "플로우 만들기"를 탭했을 때
  - When API 에러가 나면 코드별로 아래 TDS Toast가 표시되고, 화면은 이동하지 않으며, 버튼은 다시 활성화됩니다

    | API 결과 | Toast 문구 |
    |---|---|
    | `429 { "error": "RATE_LIMITED" }` | "잠시 후 다시 시도해주세요" |
    | `NETWORK_ERROR` | "네트워크 연결을 확인해주세요" |
    | `500 { "error": "AI_UNAVAILABLE" }` | "AI가 잠시 응답하지 않아요. 다시 시도해주세요" |
    | 20,000ms 안에 응답 없음(요청 취소) | "AI 응답이 지연되고 있어요. 다시 시도해주세요" |

  - And TextArea에 입력한 문장은 그대로 유지됩니다.

- **AC-7 [E][P0]: Scenario: 결과 보기 전 보상형 광고(무료 플랜)와 빌더로 넘기기**
  - Given `atb:plan.tier = "free"`이고 AC-1의 state로 `/generate/result`에 들어왔을 때
  - When `TossRewardAd` 광고 시청을 마치면
  - Then TossRewardAd의 children인 `data-testid="generated-preview"` Card가 표시됩니다. Card 안에는 다음이 들어 있습니다
    - G-AC-9 Badge "AI가 생성한 결과입니다"
    - 3단계 요약 ListRow: "매일 09:00 · 뉴스 키워드 '뉴스'", "요약", "슬랙 전송"
    - 누락 안내 "슬랙 Webhook 주소를 입력해야 해요"
  - And `tier`가 `"starter"`나 `"pro"`이면 TossRewardAd 없이 미리보기가 곧바로 표시됩니다
  - When SubmitFooter의 "편집하고 저장하기"를 탭하면
  - Then `navigate("/flows/new", { state: { draft, source: "ai", templateId: null, missingFields: ["actions.0.webhookUrl"] } })`가 호출됩니다
  - And 보조 Button "다시 만들기"를 탭하면 `navigate("/generate", { replace: true, state: { prompt: "매일 오전 9시 뉴스 요약해서 슬랙에 보내줘" } })`가 호출되고, `/generate`의 TextArea에 이 문장이 채워집니다.

- **AC-8 [W][P1]: Scenario: 엣지 케이스 — state 없이 결과 화면에 진입(invalid navigation state)**
  - Given `location.state`가 `null`일 때(새로고침이나 URL 직접 입력)
  - When `/generate/result`를 렌더링하면
  - Then `<Navigate to="/generate" replace />`로 이동하고, 광고 로드 호출은 0회입니다
  - And `location.state = { prompt: "x" }`처럼 `draft`가 빠진 invalid state여도 똑같이 `/generate`로 이동합니다.

---

### F5. 플로우 상세 · 실행 · 스케줄 등록

- **Description:** 플로우 상세 화면에서 "지금 실행"을 누르면 외부 API에 즉시 실행을 요청하고, 결과를 실행 로그와 사용량에 반영합니다. 매일·매주 트리거 플로우는 TDS Switch로 서버 스케줄을 켜고 끕니다. 편집과 삭제도 이 화면에서 합니다.
- **Data:** `atb:flows`, `atb:runs`, `atb:usage`, `atb:plan`, `atb:aiNoticeAck`
- **API:** `POST /api/runs`, `PUT /api/schedules/:flowId`, `DELETE /api/schedules/:flowId`
- **Requirements:**

- **AC-1 [E][P0]: Scenario: 수동 실행 성공**
  - Given 다음 상태일 때
    - 플로우 `flow_a1b2c3d4`(name "아침 뉴스 요약")가 있습니다
    - `atb:plan.tier = "free"`, `atb:usage = { month: "2026-09", runCount: 37 }`입니다
    - `atb:aiNoticeAck`가 있습니다
  - When `/flows/flow_a1b2c3d4`의 SubmitFooter "지금 실행"을 탭하면
  - Then `POST /api/runs { runId: "run_<12자>", flow: <Flow>, trigger: "manual" }`가 1회 호출됩니다
  - And 200 `{ run: { id: "run_...", status: "success", ... } }`을 받으면
    - `atb:runs`에 run이 추가됩니다
    - `atb:usage.runCount`가 38이 됩니다
    - Flow의 `lastRunAt`과 `lastRunStatus: "success"`가 갱신됩니다
  - And TDS Toast "실행을 완료했어요"가 표시되고 `navigate("/runs/run_...")`가 호출됩니다
  - And 200 응답의 `run.status`가 `"failed"`여도 runCount는 똑같이 1 올라가고, Toast는 "실행에 실패했어요: {errorMessage}"입니다.

- **AC-2 [W][P1]: Scenario: 에러 케이스 — 월 실행 한도 초과로 실행 차단(quota error)**
  - Given `tier = "free"`이고 `runCount = 100`일 때
  - When "지금 실행"을 탭하면
  - Then API 호출은 0회입니다
  - And TDS AlertDialog가 표시됩니다
    - 제목: "이번 달 실행 횟수를 모두 사용했어요"
    - 본문: "무료 플랜은 월 100회까지 실행할 수 있어요"
    - 버튼: "요금제 보기" / "닫기"
  - And "요금제 보기"를 탭하면 `navigate("/plan", { state: { reason: "quota_exceeded" } })`가 호출됩니다
  - And `runCount = 99`이면 API가 1회 호출됩니다(경곗값 확인).

- **AC-3 [W][P1]: Scenario: 에러 케이스 — 네트워크 오류(network error)·타임아웃으로 실행 실패**
  - Given `runCount = 37`일 때
  - When "지금 실행" 요청이 `NETWORK_ERROR`로 끝나면
  - Then `atb:runs`에 `{ id: <요청에 쓴 runId>, status: "failed", errorCode: "NETWORK_ERROR", errorMessage: "네트워크 연결을 확인해주세요", aiOutput: null }`이 추가됩니다
  - And runCount는 37로 유지됩니다
  - And TDS Toast "네트워크 연결을 확인해주세요"가 표시되고 화면은 이동하지 않습니다
  - And 30,000ms 타임아웃이면 errorCode는 `"TIMEOUT"`, errorMessage는 "실행 응답 시간이 30초를 넘었어요"입니다
  - And `500 { "error": "INTERNAL_ERROR" }`이면 RunLog는 추가하지 않고, Toast "실행 요청에 실패했어요. 다시 시도해주세요"를 표시하며, runCount는 37로 유지됩니다.

- **AC-4 [S][P1]: Scenario: 실행 중 로딩 상태(loading state)와 중복 요청 방지**
  - Given `POST /api/runs` 요청이 진행 중일 때
  - Then "지금 실행" Button은 `loading` 상태이자 disabled입니다
  - And 스케줄 Switch, "편집", "삭제"도 disabled입니다
  - And "지금 실행"을 5회 연속 탭해도 API 호출은 1회입니다.

- **AC-5 [E][P0]: Scenario: 스케줄 켜기**
  - Given `trigger: { type: "daily", time: "09:00" }`이고 `enabled: false`인 플로우일 때
  - When ListRow "예약 실행"의 TDS Switch를 켜면
  - Then `PUT /api/schedules/flow_a1b2c3d4 { flow: <Flow>, timezone: "Asia/Seoul" }`가 호출됩니다
  - And 200 `{ flowId: "flow_a1b2c3d4", nextRunAt: "2026-09-17T00:00:00Z" }`를 받으면 Flow가 `enabled: true, nextRunAt: "2026-09-17T00:00:00Z"`로 저장됩니다
  - And ListRow 부제에 "다음 실행: 9월 17일 (목) 09:00"이 표시됩니다
  - And TDS Toast "매일 09:00에 자동으로 실행돼요"가 표시됩니다
  - And `trigger.type === "manual"`이면 Switch 대신 Paragraph.Text "수동으로만 실행하는 플로우예요"가 표시됩니다.

- **AC-6 [W][P1]: Scenario: 에러 케이스 — 스케줄 등록 실패(API error)와 수정 후 재등록 실패**
  - Given 스케줄 Switch를 켰을 때
  - When PUT이 `409 { "error": "SCHEDULE_LIMIT_EXCEEDED" }`로 끝나면
  - Then Switch는 꺼짐으로 돌아가고 `enabled`는 `false`로 유지됩니다
  - And Toast "등록할 수 있는 예약 실행 수를 넘었어요"가 표시됩니다
  - And `NETWORK_ERROR`이면 똑같이 되돌리고 Toast "네트워크 연결을 확인해주세요"가 표시됩니다
  - And `enabled: true`인 플로우를 빌더에서 수정해 저장하면 PUT이 다시 호출됩니다. 이 호출이 실패하면
    - Flow는 `enabled: false, nextRunAt: null`로 저장됩니다
    - Toast "예약 실행 갱신에 실패해 꺼졌어요"가 표시됩니다.

- **AC-7 [E][P0]: Scenario: 스케줄 끄기·플로우 삭제**
  - Given `enabled: true`인 플로우일 때
  - When Switch를 끄면
  - Then `DELETE /api/schedules/flow_a1b2c3d4`가 호출되고, 200이나 404 응답이면 `enabled: false, nextRunAt: null`로 저장됩니다
  - When "삭제"를 탭하면
  - Then TDS AlertDialog가 표시됩니다
    - 제목: "'아침 뉴스 요약' 플로우를 삭제할까요?"
    - 본문: "실행 기록은 그대로 남아요"
    - 버튼: "삭제" / "취소"
  - When 다이얼로그에서 "삭제"를 탭하면
  - Then 다음 순서로 처리합니다
    1. `enabled`일 때만 스케줄 DELETE를 호출합니다
    2. `atb:flows`에서 제거합니다(`atb:runs`는 유지)
    3. `navigate("/", { replace: true })`를 호출하고 Toast "플로우를 삭제했어요"를 표시합니다.

- **AC-8 [W][P1]: Scenario: 에러 케이스 — 삭제 중 스케줄 해제 실패·없는 플로우(not found)·실행 기록 빈 상태**
  - Given `/flows/flow_a1b2c3d4`(`enabled: true`)에 들어갔을 때
  - Then 화면 구성은 다음과 같습니다
    - `data-testid="flow-summary-card"` Card에 3단계 요약 ListRow 3개
    - 그 아래 "예약 실행" ListRow
    - 이어서 `data-testid="recent-runs"` 최근 실행 목록(최대 5개, startedAt 내림차순)
  - And 이 플로우의 실행 기록이 0개이면(empty state) recent-runs 자리에 Paragraph.Text "아직 실행한 적이 없어요"가 표시됩니다
  - And 삭제를 확인했는데 스케줄 DELETE가 `NETWORK_ERROR`나 `500`으로 끝나면
    - 삭제를 멈추고 `atb:flows`는 바뀌지 않습니다
    - Toast "네트워크 연결을 확인해주세요"(500이면 "예약 실행을 끄지 못했어요")가 표시됩니다
  - And `/flows/flow_notexist`로 들어오면 `Asset.ContentIcon`, "플로우를 찾을 수 없어요", Button "홈으로"가 표시됩니다.

---

### F6. 실행 로그 대시보드 & 실행 상세

- **Description:** 이번 달 성공률, 최근 7일 실행 추이, 성공/실패 비율을 한눈에 보여주는 대시보드입니다. 서버에서 돌아간 예약 실행 결과를 동기화해 로컬 로그에 합칩니다. 실패한 실행은 알림 Card와 필터로 모아 보고, 실행 상세에서 단계별 결과와 AI 출력을 확인합니다.
- **Data:** `atb:runs`, `atb:runs:lastSyncedAt`, `atb:runs:lastSeenAt`, `atb:usage`, `atb:flows`
- **API:** `GET /api/runs?since=<ISO>&limit=100`, 한도를 넘으면 `DELETE /api/schedules/:flowId`
- **Requirements:**

- **AC-1 [E][P0]: Scenario: 예약 실행 동기화**
  - Given 다음 상태일 때
    - `atb:runs:lastSyncedAt = "2026-09-15T00:00:00Z"`
    - `atb:usage.runCount = 40`
    - 로컬에 `{ id: "run_aaa", errorCode: "TIMEOUT" }`이 있음
  - When `/runs`에 들어가서 `GET /api/runs?since=2026-09-15T00:00:00Z&limit=100`이 `{ runs: [ { id: "run_aaa", status: "success", ... }, { id: "run_bbb", trigger: "schedule", status: "failed", startedAt: "2026-09-16T00:00:05Z" } ] }`를 반환하면
  - Then `run_aaa`는 서버 값으로 바뀌고 `run_bbb`는 새로 추가됩니다(id 기준 중복 없음)
  - And runCount는 42가 됩니다. 셈에 넣는 run은 startedAt이 이번 달(KST)인 것 가운데 다음 두 가지입니다
    - 새로 추가된 run
    - 로컬에서 TIMEOUT/NETWORK_ERROR였다가 서버 값으로 바뀐 run
  - And `atb:runs:lastSyncedAt`은 요청 직전 시각으로 갱신됩니다.

- **AC-2 [U][P0]: Scenario: 대시보드 지표 레이아웃**
  - Given 이번 달(KST) RunLog가 success 8개, failed 2개이고, 최근 7일(9/10~9/16) 일별 실행 수가 `[0, 1, 3, 0, 2, 1, 3]`일 때
  - When `/runs`에 들어가면
  - Then `data-testid="run-summary-hero"` SummaryHero에 CountUp으로 "80%"가 표시됩니다(라벨 "이번 달 성공률", 보조 "총 10회 실행")
  - And `data-testid="run-ratio-minibar"` MiniBar는 성공 8 : 실패 2 비율입니다
  - And `data-testid="run-trend-sparkline"` Sparkline은 점 7개 `[0, 1, 3, 0, 2, 1, 3]`을 렌더링합니다
  - And 무료 플랜이면 지표 Card 섹션 아래, 로그 목록 위에 `AdSlot`이 1개 렌더링됩니다.

- **AC-3 [S][P1]: Scenario: 실패 알림 Card와 읽음 처리**
  - Given `atb:runs:lastSeenAt` 이후의 failed RunLog가 2개 있을 때
  - When `/runs`에 들어가면
  - Then 지표 Card 위에 `data-testid="error-alert-card"` Card "실패한 실행 2건이 있어요"가 표시됩니다
  - And 탭하면 필터 Tab이 "실패"로 바뀝니다
  - And 화면에 들어온 시점에 `atb:runs:lastSeenAt`이 현재 ISO로 갱신되므로, 이후 `/`의 실패 알림 ListRow(F2 AC-4)는 사라집니다.

- **AC-4 [E][P1]: Scenario: 필터와 페이지네이션**
  - Given RunLog가 45개(failed 12개)이고 `location.state = { filter: "failed" }`로 들어왔을 때
  - Then TDS Tab "전체 / 성공 / 실패" 중 "실패"가 선택되어 있습니다
  - And `data-testid="run-log-list"`에 ListRow 12개가 startedAt 내림차순으로 표시됩니다
  - When "전체" Tab을 탭하면
  - Then ListRow 20개와 Button "더 보기"가 보입니다
  - And "더 보기"를 한 번 탭하면 40개, 한 번 더 탭하면 45개가 되고 버튼이 사라집니다
  - And 각 ListRow의 형식은 다음과 같고, 탭하면 `navigate("/runs/{id}")`가 호출됩니다
    - 제목: "{flowName}"
    - 부제: "9월 16일 09:00 · 예약 실행 · 3.2초"
    - 오른쪽 Badge: "성공" 또는 "실패"

- **AC-5 [S][P1]: Scenario: 로딩 상태(loading)·빈 상태(empty)**
  - Given `atb:runs`가 `[]`이고 동기화 GET이 진행 중일 때
  - Then `run-log-list` 자리에 TDS Skeleton ListRow 3개가 표시됩니다
  - And GET이 `{ runs: [] }`로 끝나면
    - `Asset.ContentIcon`, "아직 실행 기록이 없어요", Button "플로우 만들기"(→ `navigate("/flows/new")`)가 표시됩니다
    - SummaryHero·MiniBar·Sparkline은 렌더링되지 않습니다
  - And 로컬 RunLog가 1개 이상이면 GET이 진행 중이어도 Skeleton 없이 로컬 데이터를 곧바로 렌더링합니다.

- **AC-6 [W][P1]: Scenario: 에러 케이스 — 동기화 실패(network error·500)**
  - Given 로컬 RunLog가 10개일 때
  - When `GET /api/runs`가 `NETWORK_ERROR`나 `500`으로 끝나면
  - Then 로컬 10개가 그대로 표시됩니다
  - And TDS Toast "최신 실행 기록을 불러오지 못했어요"가 1회 표시됩니다
  - And `atb:runs:lastSyncedAt`은 바뀌지 않습니다.

- **AC-7 [W][P1]: Scenario: 엣지 케이스 — 동기화로 월 한도를 넘으면 예약 실행 중지**
  - Given `tier = "free"`, `runCount = 99`이고 `enabled: true`인 플로우가 2개일 때
  - When 동기화로 이번 달 예약 실행 3건이 새로 들어와 runCount가 102가 되면
  - Then 두 플로우 각각에 `DELETE /api/schedules/:flowId`가 1회씩 호출됩니다
  - And 두 Flow가 `enabled: false, nextRunAt: null`로 저장됩니다
  - And TDS AlertDialog "이번 달 실행 횟수를 모두 사용해 예약 실행을 멈췄어요"가 표시됩니다
    - 버튼 "요금제 보기" → `navigate("/plan", { state: { reason: "quota_exceeded" } })`
    - 버튼 "닫기"

- **AC-8 [E][P0]: Scenario: 실행 상세**
  - Given 다음 RunLog가 있을 때
    ```json
    { "id": "run_bbb", "status": "failed", "steps": [{ "stage": "trigger", "label": "뉴스 키워드 'AI' 수집", "status": "success" }, { "stage": "ai", "label": "요약", "status": "success" }, { "stage": "action", "label": "슬랙 전송", "status": "failed", "message": "Webhook 주소가 만료되었어요" }], "aiOutput": "오늘의 AI 뉴스 3건 요약...", "errorCode": "SLACK_WEBHOOK_FAILED" }
    ```
  - When `/runs/run_bbb`에 들어가면
  - Then `data-testid="run-status-card"` Card에 Badge "실패"와 errorMessage가 있습니다
  - And `data-testid="run-steps"`에 단계 ListRow 3개가 순서대로 있고, 3번째 행의 부제는 "Webhook 주소가 만료되었어요"입니다
  - And `data-testid="ai-output-card"` Card 상단에 Badge "AI가 생성한 결과입니다"가 있고, aiOutput 전문이 Paragraph.Text로 표시됩니다. `aiOutput`이 null이면 이 Card는 렌더링하지 않습니다
  - And Button "플로우 보기"를 탭하면 `navigate("/flows/{flowId}")`가 호출됩니다. 플로우가 삭제되었으면 버튼이 disabled이고 보조 문구 "삭제된 플로우예요"가 표시됩니다
  - And `/runs/run_notexist`로 들어오면 `Asset.ContentIcon`, "실행 기록을 찾을 수 없어요", Button "실행 로그로"(→ `navigate("/runs", { replace: true })`)가 표시됩니다.

---

### F7. 템플릿 마켓 (검증된 자동화 레시피)

- **Description:** 검증된 자동화 레시피 6개를 분류별로 보여줍니다. 상세에서 3단계 구성을 확인하고 "내 플로우로 가져오기"를 누르면 빌더로 초안을 넘깁니다. MVP는 앱에 번들된 큐레이션 템플릿만 제공하며, 사용자가 올리는 커뮤니티 공유는 Open Questions로 남깁니다.
- **Data:** `src/data/templates.ts`(`FlowTemplate[]`, 번들 6개), `atb:flows`(개수 확인), `atb:plan`(배너 노출)
- **API:** 없음
- **Requirements:**

- **AC-1 [U][P0]: Scenario: 번들 템플릿 목록**
  - Given `src/data/templates.ts`에 아래 6개가 정의되어 있을 때

    | id | title | category | 구성 |
    |---|---|---|---|
    | `tpl_news_slack` | 매일 아침 뉴스 요약 → 슬랙 | report | daily 09:00 · news_keyword · summarize · slack_webhook |
    | `tpl_sheet_weekly_slack` | 주간 시트 데이터 요약 → 슬랙 | report | weekly mon 09:00 · google_sheet · summarize · slack_webhook |
    | `tpl_inquiry_classify_sheet` | 고객 문의 분류 → 시트 기록 | data | manual · text · classify · google_sheet_append |
    | `tpl_meeting_summary` | 회의록 요약 → 앱에 저장 | report | manual · text · summarize · in_app |
    | `tpl_en_news_translate` | 영문 뉴스 번역 요약 → 슬랙 | alert | daily 08:00 · news_keyword · translate(ko) · slack_webhook |
    | `tpl_weekly_report_draft` | 주간 업무 보고 초안 → 시트 | data | weekly fri 17:00 · google_sheet · custom · google_sheet_append |

  - When `/templates`에 들어가면
  - Then 네트워크 요청 없이 첫 렌더에 `data-testid="template-list"` 안에 TDS ListRow 6개(제목 + description 부제)가 표시됩니다
  - And 무료 플랜이면 목록 뒤에 `AdSlot`이 1개 렌더링됩니다.

- **AC-2 [E][P1]: Scenario: 분류 Chip 필터**
  - Given `/templates` 화면일 때
  - Then TDS Chip "전체 / 리포트 / 알림 / 데이터 정리"가 표시되고 "전체"가 선택되어 있습니다
  - When "리포트"를 탭하면
  - Then ListRow가 3개(`tpl_news_slack`, `tpl_sheet_weekly_slack`, `tpl_meeting_summary`)로 줄어듭니다
  - And "알림"을 탭하면 1개가 됩니다.

- **AC-3 [S][P1]: Scenario: 필터 결과 빈 상태(empty state)**
  - Given 선택한 category에 맞는 템플릿이 0개일 때(테스트에서 templates를 `[]`로 mock)
  - Then `Asset.ContentIcon`과 문구 "이 분류에는 아직 템플릿이 없어요"가 표시됩니다.

- **AC-4 [U][P0]: Scenario: 템플릿 상세 레이아웃**
  - Given `/templates/tpl_news_slack`에 들어갔을 때
  - Then 다음이 표시됩니다
    - Top 제목 "매일 아침 뉴스 요약 → 슬랙"
    - description Paragraph.Text
    - `data-testid="template-stage-card"` Card 3개: 트리거 "매일 09:00 · 뉴스 키워드 'AI'", AI 처리 "요약", 액션 "슬랙 전송"
  - And requiredFields `["actions.0.webhookUrl"]`에 맞춰 Paragraph.Text "가져온 뒤 슬랙 Webhook 주소를 입력해야 해요"가 표시됩니다
  - And SubmitFooter에 `display="block"` Button "내 플로우로 가져오기"가 있습니다.

- **AC-5 [E][P0]: Scenario: 내 플로우로 가져오기**
  - Given `atb:flows` 길이가 3이고 `/templates/tpl_news_slack` 화면일 때
  - When "내 플로우로 가져오기"를 탭하면
  - Then `navigate("/flows/new", { state: { draft: <tpl_news_slack.draft의 깊은 복사본>, source: "template", templateId: "tpl_news_slack", missingFields: ["actions.0.webhookUrl"] } })`가 호출됩니다
  - And 빌더에서 저장하면 Flow의 `source`는 `"template"`, `templateId`는 `"tpl_news_slack"`입니다
  - And 빌더에서 draft를 바꿔도 `src/data/templates.ts`의 원본 객체는 바뀌지 않습니다.

- **AC-6 [W][P1]: Scenario: 엣지 케이스 — 플로우 50개 상한 초과로 가져오기 차단(error toast)**
  - Given `atb:flows` 길이가 50일 때
  - When "내 플로우로 가져오기"를 탭하면
  - Then navigate는 0회 호출됩니다
  - And TDS Toast "플로우는 최대 50개까지 만들 수 있어요"가 표시됩니다.

- **AC-7 [W][P1]: Scenario: 에러 케이스 — 없는 템플릿(not found)**
  - Given `templateId`가 `"tpl_notexist"`일 때
  - When `/templates/tpl_notexist`에 들어가면
  - Then `Asset.ContentIcon`, "템플릿을 찾을 수 없어요", Button "템플릿 목록으로"(→ `navigate("/templates", { replace: true })`)가 표시됩니다.

- **AC-8 [U][P1]: Scenario: 번들 템플릿 무결성**
  - Given `src/data/templates.ts`에 템플릿 6개가 있을 때
  - When 각 `draft`의 requiredFields 경로를 임의의 유효값(`https://hooks.slack.com/services/T/B/x`, `https://docs.google.com/spreadsheets/d/abc`, `Sheet1`)으로 채우고 `validateFlowDraft`를 실행하면
  - Then 6개 모두 `{ valid: true }`입니다
  - And requiredFields를 채우기 전에 검증해서 나온 에러 경로 집합은 requiredFields와 정확히 같습니다.

---

### F8. 요금제 & 사용량 (IAP)

- **Description:** 무료(월 100회), 스타터(₩19,000, 월 1,000회), 프로(₩49,000, 무제한) 요금제를 비교하고, 현재 플랜과 이번 달 사용량을 보여줍니다. 결제는 템플릿의 `TossPurchase`(일회성 구매)를 30일 이용권으로 적용합니다. 유료 플랜에서는 배너와 AI 결과 보상형 광고를 숨깁니다.
- **Data:** `atb:plan`, `atb:usage`
- **API:** 없음(IAP는 `TossPurchase` 컴포넌트가 처리)
- **Requirements:**

- **AC-1 [U][P0]: Scenario: 요금제 비교 레이아웃**
  - Given `atb:plan = { tier: "free", purchasedAt: null, expiresAt: null }`이고 `runCount = 37`일 때
  - When `/plan`에 들어가면
  - Then `data-testid="current-plan-card"` Card에 "무료 플랜", "이번 달 37/100회 사용", MiniBar 37%가 표시됩니다
  - And Card 3개가 아래 순서로 있고, 가격은 t3 타이포로 표시됩니다

    | data-testid | 가격 | 한도 |
    |---|---|---|
    | `plan-card-free` | ₩0 | 월 100회 |
    | `plan-card-starter` | ₩19,000 / 30일 | 월 1,000회 |
    | `plan-card-pro` | ₩49,000 / 30일 | 무제한 |

  - And 현재 플랜 Card에는 Badge "이용 중"이 붙습니다.

- **AC-2 [E][P0]: Scenario: 스타터 이용권 구매**
  - Given `tier = "free"`이고 `VITE_TOSS_IAP_SKU`가 정의되어 있으며, 현재 시각이 `2026-09-16T12:00:00+09:00`일 때
  - When `plan-card-starter`의 `<TossPurchase sku={import.meta.env.VITE_TOSS_IAP_SKU} processProductGrant={...} onPurchased={...} />` 결제가 끝나 `processProductGrant`가 호출되면
  - Then `atb:plan = { tier: "starter", purchasedAt: "2026-09-16T03:00:00.000Z", expiresAt: "2026-10-16T03:00:00.000Z" }`가 저장되고, 콜백은 성공 값을 반환합니다
  - And `onPurchased` 뒤 TDS Toast "스타터 이용권이 적용됐어요"가 표시됩니다
  - And current-plan-card가 "스타터 플랜 · 2026년 10월 16일까지", "이번 달 37/1,000회 사용"으로 바뀝니다.

- **AC-3 [E][P0]: Scenario: 프로 이용권 구매**
  - Given `tier = "free"`이고 `VITE_TOSS_IAP_SKU_PRO`가 정의되어 있을 때
  - When `plan-card-pro`의 `<TossPurchase sku={import.meta.env.VITE_TOSS_IAP_SKU_PRO} ... />` 결제가 끝나면
  - Then `atb:plan.tier = "pro"`, `expiresAt = purchasedAt + 30일`이 저장됩니다
  - And Toast "프로 이용권이 적용됐어요"가 표시됩니다
  - And 그 뒤로 `/runs`·`/templates`의 `AdSlot`과 `/generate/result`의 TossRewardAd가 렌더링되지 않습니다.

- **AC-4 [S][P1]: Scenario: 이용 중인 플랜의 구매 버튼 상태**
  - Given `atb:plan = { tier: "starter", expiresAt: "2026-10-16T03:00:00.000Z" }`일 때
  - When 스타터 이용권을 한 번 더 구매하면
  - Then `expiresAt`은 기존 만료일에서 30일 늘어난 `"2026-11-15T03:00:00.000Z"`가 됩니다
  - And `tier = "pro"`를 이용 중이면 `plan-card-starter`의 구매 영역이 disabled이고 문구 "프로 이용 중"이 표시됩니다.

- **AC-5 [W][P1]: Scenario: 에러 케이스 — 결제 취소·실패(purchase error)·SKU 누락**
  - Given `tier = "free"`일 때
  - When TossPurchase 결제가 사용자 취소나 에러로 끝나 `processProductGrant`가 호출되지 않으면
  - Then `atb:plan`은 `{ tier: "free" }`로 유지되고, TDS Toast "결제가 완료되지 않았어요"가 표시됩니다
  - And `VITE_TOSS_IAP_SKU`가 `undefined`나 `""`이면 `plan-card-starter`에 TossPurchase를 렌더링하지 않고 Paragraph.Text "지금은 구매할 수 없어요"를 표시합니다. 프로 SKU도 똑같이 처리합니다.

- **AC-6 [E][P1]: Scenario: 이용권 만료 처리**
  - Given `atb:plan = { tier: "pro", expiresAt: "2026-09-15T00:00:00.000Z" }`이고 현재 시각이 `2026-09-16T00:00:00Z`일 때
  - When 앱이 로드되면
  - Then `atb:plan`이 `{ tier: "free", purchasedAt: null, expiresAt: null }`로 저장됩니다
  - And TDS Toast "이용권이 만료되어 무료 플랜으로 바뀌었어요"가 1회 표시됩니다
  - And 이때 `runCount`가 100 이상이고 `enabled: true`인 플로우가 있으면 F6 AC-7과 같은 예약 실행 중지 흐름이 실행됩니다.

- **AC-7 [S][P1]: Scenario: 한도 초과로 들어온 경우**
  - Given `navigate("/plan", { state: { reason: "quota_exceeded" } })`로 들어왔을 때
  - Then current-plan-card 위에 `data-testid="quota-exceeded-notice"` ListRow "이번 달 실행 횟수를 모두 사용했어요. 요금제를 올리면 바로 실행할 수 있어요"가 표시됩니다
  - And state 없이 들어오면 이 ListRow는 렌더링되지 않습니다.

- **AC-8 [W][P1]: Scenario: 에러 케이스 — 플랜 데이터 손상(invalid JSON)·빈 값**
  - Given `atb:plan` 값이 파싱할 수 없는 `"{tier:"`일 때
  - When `/plan`에 들어가면
  - Then 플랜을 `{ tier: "free", purchasedAt: null, expiresAt: null }`로 보고 표시합니다
  - And 원본을 `atb:plan:backup`에 보관하고, Toast "저장된 데이터를 불러오지 못했어요"를 표시합니다
  - And `atb:plan` 키가 아예 없으면(empty) 같은 free 값으로 표시하고 Toast는 띄우지 않습니다.

---

## Screen Definitions

### S1. 홈 — `/` (F2)
- **TDS 컴포넌트**
  - TDS: Top("내 플로우"), ListRow(플로우·실패 알림·사용량), Badge(성공/실패/실행 전), Button("AI로 만들기" primary·"직접 만들기" secondary, 가로 2분할 flex, 각각 `display="block"`), `Asset.ContentIcon`, Paragraph.Text, Spacing, Toast
  - 템플릿 제공: ScreenScaffold, MiniBar, FloatingTabBar
- **레이아웃:** ScreenScaffold → [실패 알림 ListRow?] → 사용량 ListRow → 생성 Button 2개 → `flow-list`
- **상태**
  - 로딩: 없음(localStorage를 동기로 읽음)
  - 빈 상태: `flow-empty`
  - 에러: DATA_CORRUPTED 토스트, 50개 상한 토스트
- **스크롤:** 일반 스크롤(최대 50행). 하단에 FloatingTabBar 높이만큼 Spacing을 둡니다.
- **터치:** ListRow는 행 전체를 탭합니다(높이 56px 이상). Button 높이는 48px 이상입니다.
- **Navigation**
  - Outgoing
    - "AI로 만들기" → `navigate('/generate')`
    - "직접 만들기" → `navigate('/flows/new')`
    - 플로우 행 → `navigate(\`/flows/${flow.id}\`)`
    - 실패 알림 → `navigate('/runs', { state: { filter: 'failed' } as RunsLocationState })`
    - 사용량 → `navigate('/plan')`
    - 빈 상태 → `navigate('/templates')`
  - Incoming: 없음(`location.state` 무시)

### S2. 플로우 상세 — `/flows/:flowId` (F5)
- **TDS 컴포넌트**
  - TDS: Top(플로우 이름, 오른쪽 "편집" 텍스트 버튼), Badge("AI 생성" — `source === 'ai'`), ListRow(3단계 요약·예약 실행·최근 실행·삭제), Switch, Button(SubmitFooter "지금 실행"), AlertDialog(삭제·한도 초과·AI 고지), Toast, `Asset.ContentIcon`, Paragraph.Text, Spacing
  - 템플릿 제공: ScreenScaffold, Card(`flow-summary-card`), SubmitFooter, AdSlot(무료 플랜, `recent-runs` 아래)
- **상태**
  - 로딩: 실행 중이면 Button loading, 스케줄 요청 중이면 Switch disabled
  - 빈 상태: "아직 실행한 적이 없어요"
  - 에러: 없는 플로우 빈 상태, NETWORK/TIMEOUT/409/500 토스트
- **스크롤:** 일반 스크롤. 최근 실행은 최대 5행입니다.
- **터치:** Switch 행 전체 56px 이상, "편집" 텍스트 버튼 44×44px
- **Navigation**
  - Outgoing
    - "편집" → `navigate(\`/flows/${id}/edit\`)`
    - 실행 성공/실패(200) → `navigate(\`/runs/${run.id}\`)`
    - 최근 실행 행 → `navigate(\`/runs/${run.id}\`)`
    - 한도 초과 "요금제 보기" → `navigate('/plan', { state: { reason: 'quota_exceeded' } as PlanLocationState })`
    - 삭제 완료 → `navigate('/', { replace: true })`
  - Incoming: `useParams<{ flowId: string }>()`만 쓰고 `location.state`는 쓰지 않습니다.

### S3. 플로우 빌더 — `/flows/new`, `/flows/:flowId/edit` (F3)
- **TDS 컴포넌트**
  - TDS: Top("새 플로우"/"플로우 편집", 뒤로가기), TextField(이름, Webhook 주소, 시트 URL, 시트 이름, 범위, 키워드), TextArea(입력 텍스트 2000자, AI 지시문 500자), BottomSheet(트리거·AI·액션 편집), ListRow(선택지·시간 48개·액션 행), Chip(요일 7개, AI 작업 4개, 번역 언어 4개), Badge("준비 중"), Button("액션 추가", "완료", 위로/아래로/삭제 아이콘 버튼 44×44px), AlertDialog(이탈 확인), Toast, Spacing
  - 템플릿 제공: ScreenScaffold, Card(`stage-card-*`), SubmitFooter("저장")
- **레이아웃 계약**
  - 순서: 이름 TextField → Card(trigger) → connector → Card(ai) → connector → Card(action) → SubmitFooter
  - 각 Card의 단계 라벨("1 트리거", "2 AI 처리", "3 액션")은 t6, 요약은 t5 타이포입니다.
  - 에러 텍스트는 Card 안쪽 하단에 둡니다.
- **키보드:** G-AC-10을 적용합니다. BottomSheet 안의 TextField에 포커스하면 BottomSheet 높이가 `visualViewport` 기준으로 줄어 입력창이 가려지지 않습니다.
- **상태**
  - 로딩: 스케줄 재등록 PUT 중에는 "저장" Button loading
  - 빈 상태: actions가 `[]`이면 `stage-card-action`에 "액션을 추가해주세요" 안내
  - 에러: 검증 에러 텍스트, 없는 플로우(edit), STORAGE_FULL 토스트
- **스크롤:** 페이지는 일반 스크롤입니다. 시간 선택 BottomSheet 내부는 48행 스크롤이며, 열리면 현재 선택된 시간이 가운데 오도록 스크롤합니다.
- **Navigation**
  - Incoming: `location.state as BuilderLocationState`
    - 타입: `{ draft: FlowDraft; source: 'ai' | 'template'; templateId: string | null; missingFields: string[] } | null`
    - edit 경로에서는 state를 무시하고 `useParams<{ flowId: string }>()`로 기존 Flow를 불러옵니다.
  - Outgoing
    - 저장 → `navigate(\`/flows/${saved.id}\`, { replace: true })`
    - 이탈 확인 "나가기" → `navigate(-1)`
    - 없는 플로우 "홈으로" → `navigate('/', { replace: true })`

### S4. AI 생성 입력 — `/generate` (F4)
- **TDS 컴포넌트**
  - TDS: Top("AI로 플로우 만들기"), Paragraph.Text(안내 "하고 싶은 반복 업무를 한 문장으로 적어주세요"), TextArea(maxLength 300, 카운터), Chip(예시 3개, 가로 스크롤 flex), AlertDialog(AI 고지), Toast, Spacing
  - 템플릿 제공: ScreenScaffold, SubmitFooter("플로우 만들기")
- **키보드:** G-AC-10을 적용합니다. TextArea에서 Enter는 줄바꿈이고, 제출은 버튼으로만 합니다.
- **상태**
  - 로딩: Button loading + "AI가 플로우를 설계하고 있어요"
  - 빈 상태: TextArea가 비어 있으면 placeholder "예) 매일 오전 9시 뉴스 요약해서 슬랙에 보내줘"
  - 에러: 인라인 에러(5자 미만 / UNSUPPORTED), 토스트(429/500/NETWORK/20초 지연)
- **Navigation**
  - Incoming: `location.state as GenerateLocationState` = `{ prompt: string } | null`. prompt가 있으면 TextArea 초기값으로 씁니다.
  - Outgoing: 성공 → `navigate('/generate/result', { state: { prompt, draft, missingFields } as GenerateResultLocationState })`

### S5. AI 생성 결과 — `/generate/result` (F4)
- **TDS 컴포넌트**
  - TDS: Top("AI가 만든 플로우"), Badge("AI가 생성한 결과입니다" — `ai-generated-badge`), ListRow(3단계 요약·누락 안내), Paragraph.Text(원문 prompt 인용), Button("다시 만들기" secondary)
  - 템플릿 제공: ScreenScaffold, TossRewardAd(무료 플랜 게이트), Card(`generated-preview`), SubmitFooter("편집하고 저장하기")
- **레이아웃 계약:** 무료 플랜이면 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`가 `generated-preview` Card와 SubmitFooter를 함께 감쌉니다. 광고를 보기 전에는 SubmitFooter가 보이지 않습니다.
- **상태**
  - 로딩: TossRewardAd 내부 처리
  - 빈 상태: state가 없거나 invalid면 `/generate`로 redirect
  - 에러: 광고 실패는 TossRewardAd 템플릿 동작을 따릅니다.
- **Navigation**
  - Incoming: `location.state as GenerateResultLocationState` = `{ prompt: string; draft: FlowDraft; missingFields: string[] } | null`
  - Outgoing
    - "편집하고 저장하기" → `navigate('/flows/new', { state: { draft, source: 'ai', templateId: null, missingFields } as BuilderLocationState })`
    - "다시 만들기" → `navigate('/generate', { replace: true, state: { prompt } as GenerateLocationState })`

### S6. 실행 로그 대시보드 — `/runs` (F6)
- **TDS 컴포넌트**
  - TDS: Top("실행 로그"), Tab(전체/성공/실패), ListRow(로그 행), Badge(성공/실패), Button("더 보기" `display="block"`), Skeleton, AlertDialog(한도 초과로 중지), Toast, `Asset.ContentIcon`, Spacing
  - 템플릿 제공: ScreenScaffold, Card(`error-alert-card`), SummaryHero + CountUp(`run-summary-hero`), MiniBar(`run-ratio-minibar`), Sparkline(`run-trend-sparkline`), AdSlot(무료 플랜, 지표 섹션과 목록 사이), FloatingTabBar
- **레이아웃 계약:** [error-alert-card?] → Card(SummaryHero + MiniBar + Sparkline, 라벨 "최근 7일") → AdSlot → Tab → `run-log-list` → "더 보기"
- **상태**
  - 로딩: 로컬 로그가 0개이고 동기화 중이면 Skeleton 3행
  - 빈 상태: ContentIcon + "아직 실행 기록이 없어요"
  - 에러: 동기화 실패 토스트(캐시 유지)
  - 필터 결과 0개: Paragraph.Text "해당하는 실행 기록이 없어요"
- **스크롤:** 20행 단위 페이지네이션(최대 200행)이며 가상 스크롤은 쓰지 않습니다. Tab을 바꾸면 페이지가 20으로 초기화됩니다.
- **Navigation**
  - Incoming: `location.state as RunsLocationState` = `{ filter: 'all' | 'success' | 'failed' } | null`, 기본값 `'all'`
  - Outgoing
    - 로그 행 → `navigate(\`/runs/${run.id}\`)`
    - 빈 상태 → `navigate('/flows/new')`
    - 한도 초과 "요금제 보기" → `navigate('/plan', { state: { reason: 'quota_exceeded' } as PlanLocationState })`

### S7. 실행 상세 — `/runs/:runId` (F6)
- **TDS 컴포넌트**
  - TDS: Top(flowName), Badge(성공/실패, "AI가 생성한 결과입니다"), ListRow(단계별 결과, 시작 시각·소요 시간), Paragraph.Text(aiOutput 전문, errorMessage), Button("플로우 보기" `display="block"`), `Asset.ContentIcon`, Spacing
  - 템플릿 제공: ScreenScaffold, Card(`run-status-card`, `ai-output-card`), `run-steps` 목록
- **상태**
  - 로딩: 없음(로컬 조회)
  - 빈 상태: `aiOutput === null`이면 `ai-output-card`를 렌더링하지 않음
  - 에러: 없는 runId 빈 상태
- **스크롤:** 일반 스크롤. aiOutput은 최대 4000자 전문을 표시합니다.
- **Navigation**
  - Incoming: `useParams<{ runId: string }>()`만 사용(state 없음)
  - Outgoing
    - "플로우 보기" → `navigate(\`/flows/${run.flowId}\`)`
    - 빈 상태 → `navigate('/runs', { replace: true })`

### S8. 템플릿 목록 — `/templates` (F7)
- **TDS 컴포넌트**
  - TDS: Top("템플릿"), Chip(분류 4개), ListRow(템플릿), `Asset.ContentIcon`, Paragraph.Text, Spacing
  - 템플릿 제공: ScreenScaffold, AdSlot(무료 플랜, 목록 뒤), FloatingTabBar
- **상태**
  - 로딩: 없음(번들 데이터)
  - 빈 상태: "이 분류에는 아직 템플릿이 없어요"
  - 에러: 없음
- **스크롤:** 일반 스크롤. Chip 영역은 가로 스크롤 flex입니다.
- **Navigation**
  - Incoming: 없음
  - Outgoing: 행 → `navigate(\`/templates/${template.id}\`)`

### S9. 템플릿 상세 — `/templates/:templateId` (F7)
- **TDS 컴포넌트**
  - TDS: Top(title), Paragraph.Text(description, 필수 입력 안내), ListRow(단계 요약), Toast, `Asset.ContentIcon`
  - 템플릿 제공: ScreenScaffold, Card(`template-stage-card` ×3), SubmitFooter("내 플로우로 가져오기")
- **상태**
  - 로딩: 없음
  - 빈 상태·에러: 없는 템플릿 빈 상태, 50개 상한 토스트
- **Navigation**
  - Incoming: `useParams<{ templateId: string }>()`
  - Outgoing
    - 가져오기 → `navigate('/flows/new', { state: { draft: deepCopy(template.draft), source: 'template', templateId: template.id, missingFields: template.requiredFields } as BuilderLocationState })`
    - 빈 상태 → `navigate('/templates', { replace: true })`

### S10. 요금제 — `/plan` (F8)
- **TDS 컴포넌트**
  - TDS: Top("요금제"), ListRow(`quota-exceeded-notice`, 플랜별 혜택 행), Badge("이용 중"), Paragraph.Text(가격 t3, 한도, "지금은 구매할 수 없어요", "프로 이용 중"), Toast, Spacing
  - 템플릿 제공: ScreenScaffold, Card(`current-plan-card`, `plan-card-free|starter|pro`), MiniBar, TossPurchase(스타터·프로 Card 안, `display="block"`), FloatingTabBar
- **레이아웃:** 결제 화면이므로 광고를 두지 않습니다.
- **상태**
  - 로딩: TossPurchase 내부 처리
  - 빈 상태: `atb:plan` 키가 없으면 free로 표시
  - 에러: 결제 미완료 토스트, SKU 누락 문구, 데이터 손상 토스트
- **Navigation**
  - Incoming: `location.state as PlanLocationState` = `{ reason: 'quota_exceeded' } | null`
  - Outgoing: 없음(탭 이동만)

---

## API Contract

외부 API 서버 코드는 이 저장소에 두지 않고 Railway에 따로 배포합니다.

- **Base URL:** `import.meta.env.VITE_API_BASE_URL`
- **공통 요청 헤더:** `Content-Type: application/json`, `X-Client-Id: string`(UUID v4)
- **공통 에러 응답:** `{ error: string }`(string은 에러 코드)
- **CORS:** 앱인토스 앱 origin을 허용하고, `OPTIONS` preflight에 204로 응답하며, 허용 헤더는 `Content-Type, X-Client-Id`입니다(G-AC-3).

```ts
// src/api/contracts.ts
export interface ApiErrorBody { error: string }
```

### 1) `POST /api/flows/generate` — 자연어로 플로우 초안 생성
```ts
interface GenerateRequest { prompt: string }                       // trim 후 5~300자
interface GenerateResponse { draft: FlowDraft; missingFields: string[] } // missingFields: FlowDraft 필드 경로
```
| Status | Body | 클라이언트 처리 |
|---|---|---|
| 200 | `GenerateResponse` | F4 AC-1 |
| 400 | `{ error: "PROMPT_INVALID" }` | 인라인 에러 "5자 이상 입력해주세요" |
| 422 | `{ error: "UNSUPPORTED_REQUEST" }` | F4 AC-5 인라인 에러 |
| 429 | `{ error: "RATE_LIMITED" }` | F4 AC-6 "잠시 후 다시 시도해주세요" |
| 500 | `{ error: "AI_UNAVAILABLE" }` | F4 AC-6 "AI가 잠시 응답하지 않아요. 다시 시도해주세요" |

클라이언트 타임아웃은 20,000ms입니다.

### 2) `POST /api/runs` — 즉시 실행(동기)
```ts
interface RunRequest { runId: string; flow: Flow; trigger: 'manual' }  // runId: /^run_[0-9a-z]{12}$/, 서버는 이 id를 그대로 사용(멱등)
interface RunResponse { run: RunLog }                                   // 연동 실패도 200 + run.status "failed"
```
| Status | Body | 클라이언트 처리 |
|---|---|---|
| 200 | `RunResponse` | F5 AC-1 |
| 400 | `{ error: "FLOW_INVALID" }` | Toast "플로우 설정을 확인해주세요", runCount 그대로 |
| 409 | `{ error: "RUN_ALREADY_EXISTS" }` | 같은 runId 재요청이면 무시하고 다음 동기화에서 반영 |
| 429 | `{ error: "RATE_LIMITED" }` | "잠시 후 다시 시도해주세요" |
| 500 | `{ error: "INTERNAL_ERROR" }` | F5 AC-3: Toast "실행 요청에 실패했어요. 다시 시도해주세요", runCount 그대로 |

클라이언트 타임아웃은 30,000ms입니다(F5 AC-3).

### 3) `GET /api/runs?since=<ISO string>&limit=<number>` — 서버 실행 기록 동기화
```ts
interface ListRunsQuery { since: string; limit: number }  // limit 1~100, 기본 100
interface ListRunsResponse { runs: RunLog[] }             // startedAt 오름차순, X-Client-Id 소유분만
```
| Status | Body | 클라이언트 처리 |
|---|---|---|
| 200 | `ListRunsResponse` | F6 AC-1 |
| 400 | `{ error: "QUERY_INVALID" }` | F6 AC-6과 같음 |
| 500 | `{ error: "INTERNAL_ERROR" }` | F6 AC-6 |

### 4) `PUT /api/schedules/:flowId` — 예약 실행 등록·갱신
```ts
interface PutScheduleRequest { flow: Flow; timezone: 'Asia/Seoul' }  // flow.trigger.type ∈ 'daily' | 'weekly'
interface PutScheduleResponse { flowId: string; nextRunAt: string }  // ISO
```
| Status | Body | 클라이언트 처리 |
|---|---|---|
| 200 | `PutScheduleResponse` | F5 AC-5 |
| 400 | `{ error: "SCHEDULE_INVALID" }` | Switch 되돌림 + Toast "예약 설정을 확인해주세요" |
| 409 | `{ error: "SCHEDULE_LIMIT_EXCEEDED" }` | F5 AC-6 |
| 500 | `{ error: "INTERNAL_ERROR" }` | Switch 되돌림 + Toast "예약 실행을 켜지 못했어요" |

### 5) `DELETE /api/schedules/:flowId` — 예약 실행 해제
```ts
interface DeleteScheduleResponse { flowId: string; deleted: true }
```
| Status | Body | 클라이언트 처리 |
|---|---|---|
| 200 | `DeleteScheduleResponse` | F5 AC-7 |
| 404 | `{ error: "SCHEDULE_NOT_FOUND" }` | 성공으로 처리 |
| 500 | `{ error: "INTERNAL_ERROR" }` | Switch 유지 + Toast "예약 실행을 끄지 못했어요"(F5 AC-8) |

모든 엔드포인트에서 fetch reject는 `NETWORK_ERROR`(status 0), 타임아웃은 `TIMEOUT`(status 0), JSON이 아닌 응답 본문은 `INVALID_RESPONSE`로 매핑합니다(F1 AC-7).

---

## Assumptions

1. **드래그&드롭 대신 탭 편집:** 모바일 WebView(Android 7 포함)에서 안정적으로 동작하도록 3단계 고정 Card와 BottomSheet 편집으로 구현합니다. 액션 순서는 위/아래 버튼(44px)으로 바꿉니다.
2. **실행 주체:** 실제 AI 처리, 뉴스 수집, 슬랙·구글 시트 연동, 예약 실행(cron)은 모두 외부 API 서버가 맡습니다. 앱은 설정 저장, 요청, 결과 표시만 합니다.
3. **MVP 연동 범위**
   - 실제로 동작하는 연동은 3가지입니다: 슬랙(Incoming Webhook URL 입력), 구글 스프레드시트(서비스 계정 공유 + URL 입력), 앱 내 저장(`in_app`).
   - 카카오톡·네이버 캘린더는 OAuth 과정에서 외부 도메인으로 나가야 해서 검수 정책과 충돌하므로 "준비 중"으로 표시합니다.
   - 서비스 계정 이메일은 `VITE_SHEET_SERVICE_ACCOUNT_EMAIL` env로 주입합니다.
4. **입력 데이터 소스:** PRD 예시("뉴스 요약")를 근거로 `text`, `google_sheet`, `news_keyword` 3가지만 지원합니다. 뉴스 수집 출처는 서버가 정합니다.
5. **사용자 식별:** 토스 세션은 자동으로 제공되지만, MVP의 서버 측 식별은 localStorage의 `atb:clientId`(UUID)로 합니다. localStorage를 지우면 기존 예약 실행과 서버 로그를 이어받을 수 없습니다.
6. **요금제 구현:** 템플릿의 `TossPurchase`는 일회성 구매 래퍼라서 월 구독 대신 "30일 이용권"으로 판매합니다. SKU는 2개입니다: 스타터 `VITE_TOSS_IAP_SKU`, 프로 `VITE_TOSS_IAP_SKU_PRO`.
7. **사용량 집계**
   - MVP에서는 클라이언트가 월 실행 한도를 세고 막습니다.
   - 수동 실행은 200 응답을 받은 시점에, 예약 실행은 동기화 시점에 1회로 셉니다.
   - 클라이언트 네트워크 에러·타임아웃·500은 세지 않습니다.
   - 한도를 넘은 것이 확인되면 예약 실행을 모두 해제합니다.
8. **수치 가정:** 아래 값은 PRD에 없어서 새로 정한 설계값입니다.
   - 플로우 최대 50개, 액션 최대 3개, 로컬 실행 로그 200개
   - 입력 텍스트 2000자, 지시문 500자, AI 출력 4000자
   - AI 생성 타임아웃 20초, 실행 타임아웃 30초
   - 예약 시간 30분 단위
9. **템플릿 마켓:** PRD의 "커뮤니티 공유" 가운데 MVP는 운영자가 검증한 번들 템플릿 6개만 제공합니다.
10. **에러 알림:** 푸시 알림은 MVP 범위 밖이라, 앱 안 알림(홈 실패 알림 ListRow, 대시보드 `error-alert-card`)으로만 제공합니다.
11. **프로모션 리워드:** `grantPromotionReward`는 PRD에 없어서 쓰지 않습니다.

## Open Questions

1. **카카오톡·네이버 캘린더 연동:** 앱인토스 정책 안에서 OAuth 인증을 처리할 방법(서버 중계, 토스 인앱 브라우저 허용 여부)이 있나요? 없다면 대체 수단(예: 카카오 알림톡 비즈 채널)을 쓸까요?
2. **이메일 발송 액션:** PRD 문제 정의에 나온 "이메일 발송"을 MVP에 넣을까요? 넣는다면 발신 도메인과 스팸 정책은 어떻게 할까요?
3. **프로 플랜의 "고급 연동":** 구체적으로 어떤 연동인가요? 지금 SPEC은 프로 플랜을 실행 한도 무제한으로만 구분합니다.
4. **정기 구독 전환:** 앱인토스 IAP가 정기 구독(자동 갱신)을 지원하면 30일 이용권에서 구독으로 옮길까요? 옮긴다면 기존 이용권 사용자는 어떻게 처리할까요?
5. **서버 측 한도 강제:** 클라이언트 집계만으로는 조작 위험이 있습니다. 결제 검증 결과를 서버에 저장하고 서버가 한도를 직접 강제할지 정해야 합니다.
6. **사용자 식별 고도화:** `getIsTossLoginIntegratedService()`로 연동 여부를 확인한 뒤, 토스 사용자 키로 기기 간 플로우 동기화를 할까요?
7. **커뮤니티 템플릿:** 사용자 업로드·검수·신고 흐름과 그에 필요한 서버 API(`POST /api/templates`)는 언제 설계할까요?
8. **뉴스 소스:** 뉴스 수집 출처와 저작권·이용약관 검토 결과를 확인해야 합니다.
9. **Webhook URL 보관:** 서버에 스케줄을 등록하면 슬랙 Webhook URL이 서버에 저장됩니다. 암호화 보관과 개인정보 처리방침 고지 문구가 필요합니다.
10. **AI 모델·약관:** 어떤 생성형 AI 모델과 제공사를 쓸지, 입력 데이터(시트 내용·고객 문의)를 학습에 쓰지 않는다는 약관 고지가 필요한지 정해야 합니다.

---

**수정 요약:** 검증기가 에러·엣지 케이스를 어떤 기준으로 세는지는 확실히 알아내지 못했습니다. 그래서 문제가 된 4개 기능 모두 에러·엣지 케이스 AC가 3개 이상 되도록 고쳤습니다. 해당 AC는 모두 `[W][P1]`로 태그하고, 제목을 "에러 케이스:" 또는 "엣지 케이스:"로 시작하며, 제목에 "실패", "에러", "error", "invalid" 같은 단어를 넣었습니다. 같은 제목 규칙을 F3, F6, F7, F8에도 적용했습니다.

| 기능 | 이제 에러·엣지 케이스 AC | 바뀐 점 |
|---|---|---|
| **F1** | AC-5, AC-6, AC-7 | AC-7(API 에러 매핑)을 `[W]`로 바꾸고, 응답 본문이 JSON이 아닐 때의 `INVALID_RESPONSE`를 추가했습니다. AC-8은 빈 저장소 첫 로드를 다루도록 넓혔습니다. |
| **F2** | AC-6, AC-8 | AC-6에 사용량 데이터 손상 복구를 추가했습니다. AC-8에 49개일 때 생성이 허용되는 경곗값 확인을 추가했습니다. |
| **F4** | AC-3, AC-5, AC-6, AC-8 | 전에는 AC-4(로딩)와 AC-5에 섞여 있던 네트워크·429·500·20초 타임아웃 처리를 새 AC-6 하나로 모았습니다. 기존 AC-6(광고 게이트)과 AC-7(빌더로 넘기기)은 AC-7 하나로 합쳐 AC 수를 8개로 맞췄습니다. |
| **F5** | AC-2, AC-3, AC-6, AC-8 | AC-3에 500 에러 처리를 추가했습니다. AC-8에 삭제 중 스케줄 해제 실패를 추가했습니다(기존 AC-7에서 옮김). |

API Contract의 참조도 새 AC 번호에 맞게 고쳤습니다.