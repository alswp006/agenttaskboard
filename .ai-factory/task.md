# TASK — AgentTaskBoard (수정본)

> **이번 수정에서 바뀐 것**
>
> 교차 검증 보고서는 "문서 간 불일치 없음"이었습니다. 보고서가 짚은 3개 GAP(카카오·네이버 연동, 커뮤니티 템플릿, 프로 "고급 연동")은 MVP에서 뺀 기능입니다. 다만 화면이 이 기능을 약속하지 않는다는 DoD가 없어 추적되지 않았고, SPEC과 TASK를 다시 대조하니 개발을 막거나 크래시·데이터 유실로 이어질 틈이 더 있었습니다. 아래처럼 고쳤습니다.
>
> | # | 틈 | 조치 | Task |
> |---|---|---|---|
> | 1 | MVP에서 뺀 3개 기능을 화면이 약속하지 않는지 확인할 방법이 없음 | "MVP 제외 범위 추적" 절을 새로 만들고, 금지 문구·UI 0건을 DoD에 추가 | 3.8, 3.23, 3.26, 4.3, 4.5 |
> | 2 | `package.json`을 4.3만 고칠 수 있어서, 앞 Task들이 테스트 도구(jsdom, Testing Library)를 설치할 수 없음 | **Task 1.0 신설.** `package.json`, `vite.config.ts`, 테스트 setup을 맨 앞 Task가 소유 | 1.0, 4.3 |
> | 3 | `*.test-d.ts`는 `npx vitest run`으로 실행되지 않음 | 일반 테스트 파일로 바꿔 `expectTypeOf`를 쓰고, `tsc`로 타입 확인 | 1.2 |
> | 4 | Toast를 띄운 뒤 navigate하면 화면이 unmount되어 Toast가 사라짐(3.10, 3.15) | **Task 2.19 신설.** 앱 루트에 전역 ToastProvider와 `renderWithProviders` 추가 | 2.19, 4.1 |
> | 5 | 스케줄 끄기가 실패(500·NETWORK)할 때의 처리가 TASK에 없음(SPEC API §5) | `disableSchedule` 실패 분기와 Switch 유지 추가 | 2.15, 3.14 |
> | 6 | 켜진 플로우의 트리거를 "수동"으로 바꿔 저장하면 PUT이 400을 받음 | manual이면 PUT 대신 DELETE로 해제 | 2.15, 3.9 |
> | 7 | 수동 실행 결과 중 NETWORK·TIMEOUT Toast, 400·429·409 테스트, INVALID_RESPONSE 처리가 빠짐 | 분기와 DoD 보강 | 2.14 |
> | 8 | 동기화 응답이 `limit=100`을 꽉 채우면 `lastSyncedAt`이 앞으로 가서 101번째 이후 기록이 영구 유실됨 | 100건을 받으면 마지막 `startedAt`을 커서로 저장 | 2.16 |
> | 9 | 예약 실행 결과가 Flow의 `lastRunStatus`에 반영되지 않아 홈 Badge가 계속 "실행 전" | 동기화 때 lastRun* 갱신 | 2.16 |
> | 10 | 플로우 50개 상한이 진입 버튼에만 있어서 `/flows/new`에 직접 들어오면 우회됨 | repo에서 `FlowLimitError`, 빌더에서 Toast | 2.3, 2.4, 3.9, 3.10 |
> | 11 | 템플릿 `input.text` 필수 경로와 "가져온 뒤 …" 안내 문구를 만드는 함수가 없음 | `missingFieldHint` 경로 목록과 `requiredFieldNotice` 추가 | 2.2, 2.10, 3.24 |
> | 12 | `error-alert-card` testid(F6-AC-3)가 Task에 없음 | DoD에 명시 | 3.18 |
> | 13 | 한도 초과 상태에서 예약 실행을 켤 수 있음 | API 호출 없이 QUOTA_EXCEEDED Toast | 2.15, 3.14 |
> | 14 | 실행 후 `refresh`보다 navigate가 먼저 되면 실행 상세가 "찾을 수 없어요"를 보여줌 | refresh → Toast → navigate 순서 고정 | 3.16 |
>
> 새로 정한 구현 결정은 문서 끝 "SPEC에 없어 새로 정한 구현 결정"에 모두 모았습니다. 기획 확인이 필요합니다.

> **이 문서의 공통 규칙**
> - **파일은 한 Task만 수정합니다.** 파일 하나는 정확히 한 Task의 `Files`에만 나옵니다. 뒤 Task는 앞 Task가 만든 파일을 **import만 하고 고치지 않습니다**. 페이지 파일(`src/pages/*Page.tsx`)은 **마지막 조립 Task 하나만** 만들고 수정합니다. 섹션 컴포넌트와 훅은 앞 Task에서 따로 만듭니다.
> - **경로:** SPEC 경로(`src/types/*.ts`, `src/navigation/types.ts`)를 따릅니다. `src/lib/types.ts`는 re-export만 하는 파일입니다.
> - **모든 Task가 끝나면 확인할 것:** ① `npx tsc --noEmit` 에러 0건 ② `npx vite build` 성공 ③ Task에 적힌 테스트 파일이 `npx vitest run <파일>`로 모두 통과.
> - **의존성 설치:** `package.json`은 Task 1.0만 수정합니다. 뒤 Task에서 새 패키지가 필요하면 Task 1.0으로 돌아가 추가합니다.
> - **라우팅·테스트 래퍼**
>   - 페이지·섹션 테스트는 Task 2.19의 `renderWithProviders(ui, { route, state })`를 씁니다. 이 래퍼는 `MemoryRouter`, `AppStateProvider`, `ToastProvider`, TDS Provider를 한꺼번에 감쌉니다.
>   - Provider가 필요 없는 BottomSheet 단위 테스트는 Task 1.0의 `TdsTestProvider`만 씁니다.
>   - 실제 라우트는 Task 4.1에서 연결합니다.
> - **Toast:** 모든 Toast는 Task 2.19의 `useAppToast().showToast(message)`로 띄웁니다. 컴포넌트 안에 TDS Toast를 직접 렌더링하지 않습니다(navigate 후에도 Toast가 남아야 함).
> - **새로 만들지 않는 것:** AdSlot, TossRewardAd, TossPurchase, localStorage 헬퍼, ScreenScaffold, SubmitFooter, Card, MiniBar, SummaryHero, CountUp, Sparkline, FloatingTabBar는 템플릿에 있으니 import만 합니다. 로그인 코드도 없습니다. 테스트에서는 `vi.mock`으로 대체합니다.
> - **서버 코드:** 이 저장소에 두지 않습니다. 외부 API는 `import.meta.env.VITE_API_BASE_URL`로만 호출합니다.

---

## Epic 1. 개발 환경 + TypeScript 타입

**Risk**
- Complexity: Low
- Risk factors
  - 페이지마다 `location.state` 형태를 다르게 가정하면 `undefined.map()` 크래시가 납니다(SplitMate 사고).
  - SPEC 경로와 지시 경로가 달라서 타입이 두 벌 생길 수 있습니다.
  - 테스트 도구가 설치되어 있지 않으면 뒤 Task 전부가 DoD를 확인할 수 없습니다.
- Mitigation
  - Task 1.0에서 테스트·빌드 환경과 `package.json`을 한 번에 고정합니다.
  - RouteState는 `src/navigation/types.ts` 한 곳에만 정의하고, `src/lib/types.ts`는 re-export만 합니다.
  - state를 받는 페이지의 DoD에는 모두 "state 없이 들어와도 크래시 없음"을 넣습니다.

### Task 1.0 (신규) 테스트·빌드 환경 + 패키지 스크립트
- Description
  - **먼저 확인할 것:** 템플릿의 `package.json`, `src/main.tsx`, `vite.config.ts`, `vitest.config.*` 유무, 그리고 TDS Provider 이름(`TDSMobileAITProvider` 또는 `TDSMobileProvider`)을 확인합니다.
  - `package.json`
    - 없는 devDependency만 추가합니다: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `@playwright/test`
    - 스크립트: `test`(`vitest run`), `typecheck`(`tsc --noEmit`), `check:policy`(`node scripts/check-policy.mjs`), `check:cors`(`node scripts/check-cors.mjs`), `test:e2e`(`playwright test`)
    - 분석 SDK(G-AC-6)는 추가하지 않습니다.
  - `vite.config.ts`
    - `build.target: ["es2017", "safari16"]`
    - `test: { environment: 'jsdom', setupFiles: ['src/test/setup.ts'], include: ['src/**/*.test.{ts,tsx}'] }`
    - 템플릿에 별도 `vitest.config.*`가 있으면 내용을 여기에 합치고 그 파일은 삭제합니다.
  - `src/test/setup.ts`
    - jest-dom matcher를 등록합니다.
    - 테스트마다 `localStorage.clear()`를 실행합니다.
    - `window.matchMedia`와 `Element.prototype.scrollIntoView`를 stub합니다.
    - `@apps-in-toss/web-framework`를 기본 mock합니다. jsdom에는 네이티브 브리지가 없기 때문입니다.
  - `src/test/TdsTestProvider.tsx`: `main.tsx`와 같은 TDS Provider로 children을 감쌉니다.
  - `src/env.d.ts`: `ImportMetaEnv`에 `VITE_API_BASE_URL`, `VITE_TOSS_AD_GROUP_ID`, `VITE_TOSS_AD_SLOT_ID`, `VITE_TOSS_IAP_SKU`, `VITE_TOSS_IAP_SKU_PRO`, `VITE_SHEET_SERVICE_ACCOUNT_EMAIL`을 `string | undefined`로 선언합니다(interface 병합).
  - `.env.example`: 위 6개 키를 빈 값으로 둡니다.
- DoD
  - `npx vitest run src/test/setup.test.ts`가 통과합니다. 이 테스트는 다음을 확인합니다.
    - `TdsTestProvider`로 TDS Button을 렌더링하면 `getByRole('button')`이 1개입니다.
    - 테스트 사이에 localStorage가 비워집니다.
  - `vite.config.ts`의 `build.target`이 정확히 `["es2017", "safari16"]`입니다.
  - `package.json`에 스크립트 5개가 있고, G-AC-6 금지 문자열은 0건입니다.
  - `npx tsc --noEmit`과 `npx vite build`가 성공합니다.
- Covers: G-AC-4(빌드 타깃), G-AC-6(의존성 추가 금지). 모든 Task 테스트의 전제입니다.
- Files: package.json, vite.config.ts, src/test/setup.ts, src/test/TdsTestProvider.tsx, src/test/setup.test.ts, src/env.d.ts, .env.example
- Depends on: none

### Task 1.1 도메인 엔티티 타입
- Description: SPEC Data Models의 타입을 그대로 옮깁니다.
  - `flow.ts`: Weekday, HHmm, Trigger, InputSource, AiTask, AiStep, Action, FlowDraft, RunStatus, Flow
  - `run.ts`: RunErrorCode, StepResult, RunLog
  - `plan.ts`: PlanTier, PlanState, UsageState, `RUN_LIMIT` 상수
  - `template.ts`: FlowTemplate
  - `contracts.ts`: ApiErrorBody, GenerateRequest/Response, RunRequest/Response, ListRunsQuery/Response, PutScheduleRequest/Response, DeleteScheduleResponse
- DoD
  - 5개 파일의 타입 이름과 필드가 SPEC 코드 블록과 똑같습니다.
  - 런타임 export는 `RUN_LIMIT` 하나뿐입니다.
  - `tsc --noEmit`이 통과합니다.
- Covers: 직접 AC 없음. F1~F8 모든 AC의 타입 전제입니다.
- Files: src/types/flow.ts, src/types/run.ts, src/types/plan.ts, src/types/template.ts, src/api/contracts.ts
- Depends on: Task 1.0

### Task 1.2 (수정) Navigation state 타입 + RouteState 맵
- Description: SPEC의 5개 LocationState 타입을 정의하고, 경로별 맵 `RouteState`를 추가합니다.
  ```ts
  export type RouteState = {
    '/flows/new': BuilderLocationState;
    '/generate': GenerateLocationState;
    '/generate/result': GenerateResultLocationState;
    '/runs': RunsLocationState;
    '/plan': PlanLocationState;
  };
  ```
  `src/lib/types.ts`는 `src/types/*`, `src/navigation/types.ts`, `src/api/contracts.ts`를 `export type * from`으로 다시 내보냅니다.
- DoD
  - `src/navigation/types.test.ts`(일반 vitest 파일)에서 `expectTypeOf<RouteState['/generate/result']>().toEqualTypeOf<{ prompt: string; draft: FlowDraft; missingFields: string[] } | null>()`를 씁니다. `npx vitest run`이 통과하고, `tsc --noEmit`에서도 타입 에러가 0건입니다.
  - 두 타입 파일 모두 런타임 export가 0개입니다.
- Covers: 직접 AC 없음. F3-AC-6, F4-AC-7, F4-AC-8, F6-AC-4, F8-AC-7의 state 계약 전제입니다.
- Files: src/navigation/types.ts, src/lib/types.ts, src/navigation/types.test.ts
- Depends on: Task 1.1

---

## Epic 2. Data Layer (저장소 · 검증기 · API 클라이언트 · 서비스 · 상태)

> 서버 API 라우트는 이 저장소에 만들지 않습니다. 이 Epic은 클라이언트 쪽 API 래퍼, 도메인 서비스, 전역 상태까지만 다룹니다.

**Risk**
- Complexity: High
- Risk factors
  - localStorage 한도(약 5M자)를 넘으면 `QuotaExceededError`가 납니다.
  - 손상된 JSON 때문에 첫 렌더에서 크래시할 수 있습니다.
  - KST 월 경계(UTC 15:00)를 잘못 계산할 수 있습니다.
  - 동기화할 때 runCount를 두 번 세거나, 페이지가 잘려 기록이 유실될 수 있습니다.
  - 구형 WebView에는 `crypto.randomUUID`와 `structuredClone`이 없습니다.
  - navigate하면서 Toast가 사라질 수 있습니다.
- Mitigation
  - 안전 저장소 코어(2.3)를 먼저 만들고, 모든 repo가 이 코어만 거치게 합니다.
  - KST 유틸(2.1)을 경계 시각 테스트로 먼저 고정합니다.
  - 실행·스케줄·동기화는 UI 없는 서비스(2.14~2.16)로 분리해 단위 테스트합니다.
  - 동기화는 커서 방식으로 저장합니다(2.16).
  - ID는 `getRandomValues`로, 복사는 JSON 직렬화로 구현합니다.
  - Toast는 전역 Provider(2.19) 하나로만 띄웁니다.

### Task 2.1 ID · KST 시간 유틸
- Description
  - `id.ts`
    - `newFlowId()`: `flow_` + base36 8자
    - `newRunId()`: `run_` + base36 12자
    - `newUuidV4()`
    - 모두 `crypto.getRandomValues`로 만들고 `randomUUID`는 쓰지 않습니다.
  - `time.ts`
    - `kstMonthKey(date)` → `'YYYY-MM'`
    - `kstDayKey(date)` → `'YYYY-MM-DD'`
    - `isInKstMonth(iso, monthKey)`
    - `formatKstDateTime(iso)` → "9월 17일 (목) 09:00"
    - `formatKstShort(iso)` → "9월 16일 09:00"
    - `formatKstDate(iso)` → "2026년 10월 16일"
    - `addDaysIso(iso, n)`
    - `lastNKstDays(now, 7)`
- DoD
  - `newFlowId()`를 1,000번 만들어도 전부 `/^flow_[0-9a-z]{8}$/`에 맞습니다.
  - `newRunId()`는 `/^run_[0-9a-z]{12}$/`, `newUuidV4()`는 F1-AC-8의 UUID 정규식에 맞습니다.
  - `kstMonthKey(new Date('2026-08-31T15:05:00Z')) === '2026-09'`이고, `'2026-08-31T14:59:59Z'`이면 `'2026-08'`입니다.
  - `formatKstDateTime('2026-09-17T00:00:00Z') === '9월 17일 (목) 09:00'`입니다.
  - `addDaysIso('2026-10-16T03:00:00.000Z', 30) === '2026-11-15T03:00:00.000Z'`입니다.
  - 파일 안에 `structuredClone`, `.at(`, `Object.hasOwn`, `replaceAll`이 없습니다.
- Covers: F1-AC-1, F1-AC-3, F1-AC-8, F5-AC-5, F8-AC-2, G-AC-4
- Files: src/lib/id.ts, src/lib/time.ts, src/lib/id.test.ts, src/lib/time.test.ts
- Depends on: Task 1.1

### Task 2.2 (수정) 플로우·실행 요약 문자열 포매터
- Description: 화면에 보이는 요약 문자열을 만드는 순수 함수들입니다.
  - `triggerLabel`: "수동 실행" / "매일 09:00" / "매주 월·수 18:00"
  - `inputLabel`: "뉴스 키워드 'AI'" / "구글 시트 A1:D50" / "텍스트 입력"
  - `aiTaskLabel`: 요약 / 분류 / 번역 / 직접 지시
  - `actionLabel`: 슬랙 전송 / 앱에 저장 / 시트에 기록
  - `actionsSummary`: 예) "슬랙 전송 외 1개"
  - `flowListSubtitle`, `triggerCardSummary`
  - `runStatusLabel`: 성공 / 실패 / 실행 전
  - `runTriggerLabel`: 수동 실행 / 예약 실행
  - `durationLabel`: 3200 → "3.2초"
  - `runRowSubtitle`
  - `missingFieldHint(path)`: 경로 패턴별 문구입니다. `N`은 숫자입니다.

    | 경로 | 문구 |
    |---|---|
    | `actions.N.webhookUrl` | "슬랙 Webhook 주소를 입력해야 해요" |
    | `actions.N.sheetUrl` | "기록할 구글 시트 주소를 입력해야 해요" |
    | `actions.N.sheetName` | "기록할 시트 이름을 입력해야 해요" |
    | `input.sheetUrl` | "읽어올 구글 시트 주소를 입력해야 해요" |
    | `input.text` | "처리할 텍스트를 입력해야 해요" |
    | `input.keyword` | "뉴스 키워드를 입력해야 해요" |
    | 그 밖의 경로 | "필요한 설정을 입력해야 해요" |

  - `requiredFieldNotice(path)`: `'가져온 뒤 ' + missingFieldHint(path)`
  - `KNOWN_HINT_PATTERNS`: 표에 있는 패턴 목록입니다. Task 2.10 무결성 테스트에서 씁니다.
- DoD
  - F2-AC-1의 A·B 입력으로 "매주 월·수 18:00 · 요약 · 슬랙 전송 외 1개"와 "매일 09:00 · 요약 · 앱에 저장"이 나옵니다.
  - `triggerCardSummary`가 "매일 09:00 · 뉴스 키워드 'AI'"를 반환합니다.
  - `runRowSubtitle({ startedAt: '2026-09-16T00:00:00Z', trigger: 'schedule', durationMs: 3200 })`가 "9월 16일 09:00 · 예약 실행 · 3.2초"를 반환합니다.
  - `runStatusLabel(null) === '실행 전'`입니다.
  - 요일은 입력 순서와 상관없이 월→일 순서로 정렬됩니다.
  - 표의 7행이 테이블 테스트로 정확히 일치하고, `requiredFieldNotice('actions.0.webhookUrl') === '가져온 뒤 슬랙 Webhook 주소를 입력해야 해요'`입니다.
- Covers: F2-AC-1, F3-AC-2, F3-AC-6, F4-AC-7, F6-AC-4, F7-AC-4
- Files: src/lib/flowFormat.ts, src/lib/flowFormat.test.ts
- Depends on: Task 2.1

### Task 2.3 (수정) 에러 정의 + 안전 저장소 코어
- Description
  - `errors.ts`
    - `ERROR_MESSAGES`: CP-2의 5개 코드와 정확한 문자열
    - `FLOW_LIMIT_MESSAGE = '플로우는 최대 50개까지 만들 수 있어요'`
    - `class StorageFullError`
    - `class FlowLimitError`
    - `class ApiError { code: string; status: number }`
  - `safeStorage.ts`
    - `readArray<T>(key)` → `{ value: T[]; corrupted: boolean }`
    - `readObject<T>(key, fallback, isValid)` → `{ value: T; corrupted: boolean }`
    - 파싱 실패나 형태 불일치: 원본을 `<key>:backup`에 저장하고, 기본값으로 덮어쓴 뒤 `corrupted: true`를 반환합니다.
    - 키가 없으면 `corrupted: false`입니다.
    - `writeJson(key, value)`: `QuotaExceededError`(name으로 판별, 또는 code 22/1014)를 `StorageFullError`로 바꿔 던집니다.
    - `readString` / `writeString`
- DoD
  - `"[{broken"`이 저장된 상태에서 `readArray('atb:flows')`는 `{ value: [], corrupted: true }`를 반환합니다. 이후 `atb:flows:backup === '[{broken'`이고 `atb:flows === '[]'`입니다.
  - `'{"a":1}'`도 `corrupted: true`로 복구됩니다.
  - 키가 없으면 `corrupted: false`이고 backup 키를 만들지 않습니다.
  - setItem mock이 `DOMException('', 'QuotaExceededError')`를 던지면 `writeJson`이 `StorageFullError`를 던집니다.
  - `new FlowLimitError().message === FLOW_LIMIT_MESSAGE`입니다.
- Covers: F1-AC-5, F1-AC-6, F8-AC-8
- Files: src/lib/errors.ts, src/lib/storage/safeStorage.ts, src/lib/storage/safeStorage.test.ts
- Depends on: Task 1.1

### Task 2.4 (수정) flowRepo + clientRepo
- Description
  - `flowRepo`
    - `list(): { flows; corrupted }`, `get(id)`, `count()`, `MAX_FLOWS = 50`
    - `create({ draft, source, templateId })`
      - 이미 50개면 저장하지 않고 `FlowLimitError`를 던집니다.
      - `enabled: false`로 만들고 `nextRunAt`, `lastRunAt`, `lastRunStatus`는 `null`입니다.
    - `update(id, draft)`: `updatedAt`만 바꿉니다.
    - `patch(id, partial)`, `remove(id)`
    - 용량 초과 시 실행 로그를 지우지 않고 곧바로 `StorageFullError`를 던집니다.
  - `clientRepo.ensure()`: `atb:clientId`가 없을 때만 UUID v4를 만듭니다.
- DoD
  - F1-AC-1 입력으로 `create`하면 id가 정규식에 맞고, `enabled === false`, `lastRunAt === null`, `createdAt === updatedAt`이며, 목록 길이는 1입니다.
  - `update` 후 `createdAt`은 그대로이고 `updatedAt`만 바뀝니다.
  - Quota mock 상태에서 `create`는 `StorageFullError`를 던지고, `atb:runs` 값은 호출 전과 같습니다.
  - 50개인 상태에서 `create`는 `FlowLimitError`를 던지고 길이는 50 그대로입니다. 49개면 성공해서 50이 됩니다.
  - 빈 저장소에서 `list()`는 `{ flows: [], corrupted: false }`입니다.
  - `ensure()`를 두 번 불러도 같은 UUID가 나옵니다.
- Covers: F1-AC-1, F1-AC-5, F1-AC-6, F1-AC-8, F2-AC-8(저장소 차원 방어)
- Files: src/lib/storage/flowRepo.ts, src/lib/storage/clientRepo.ts, src/lib/storage/flowRepo.test.ts, src/lib/storage/clientRepo.test.ts
- Depends on: Task 2.1, Task 2.3

### Task 2.5 runRepo (200개 상한 · 용량 재시도 · 동기화 메타)
- Description
  - `list()`: startedAt 내림차순
  - `get(id)`, `listByFlow(flowId, limit)`
  - `add(run)`
    - 200개를 넘으면 가장 오래된 것부터 지웁니다.
    - Quota 에러가 나면 가장 오래된 50개를 지우고 한 번 다시 시도합니다. 그래도 실패하면 `StorageFullError`를 던집니다.
  - `upsertMany(runs)` → `{ added: RunLog[]; replaced: { before; after }[] }`. 200개 상한과 Quota 재시도는 `add`와 같게 적용합니다.
  - `getLastSyncedAt` / `setLastSyncedAt`, `getLastSeenAt` / `setLastSeenAt`
  - `MAX_RUNS = 200`
- DoD
  - 로그 200개가 있을 때 `add(newRun)`을 하면 길이는 200이고, 가장 오래된 id는 빠지고, `newRun.id`가 들어 있습니다.
  - 첫 setItem만 Quota 에러를 내면 결과 개수는 (기존 − 50 + 1)입니다.
  - setItem이 항상 Quota 에러를 내면 `StorageFullError`의 message가 CP-2 문구입니다.
  - 빈 저장소에서 `list()`는 `[]`입니다.
  - 같은 id로 `upsertMany`를 해도 길이가 늘지 않습니다.
- Covers: F1-AC-2, F1-AC-5, F1-AC-8
- Files: src/lib/storage/runRepo.ts, src/lib/storage/runRepo.test.ts
- Depends on: Task 2.3

### Task 2.6 usageRepo (KST 월 초기화 · 손상 복구)
- Description
  - `usageRepo.get(now = new Date())` → `{ usage; corrupted }`
    - 저장된 month가 현재 KST 월과 다르면 `{ month: 현재, runCount: 0 }`을 저장하고 반환합니다.
    - 파싱에 실패해도 같은 값으로 복구하고, 원본은 backup에 보관합니다.
  - `increment(n = 1, now)`
- DoD
  - `{ month: '2026-08', runCount: 87 }`, now=`2026-08-31T15:05:00Z`이면 `{ month: '2026-09', runCount: 0 }`을 반환하고 저장합니다.
  - 값이 `"{month:"`이면 `{ month: 현재 KST, runCount: 0 }`과 `corrupted: true`를 반환합니다.
  - `increment(2)`를 하면 runCount가 2 늘어납니다.
- Covers: F1-AC-3, F2-AC-6
- Files: src/lib/storage/usageRepo.ts, src/lib/storage/usageRepo.test.ts
- Depends on: Task 2.1, Task 2.3

### Task 2.7 planRepo + aiNoticeRepo
- Description
  - `planRepo`
    - `get()`
      - 키가 없으면 free, `corrupted: false`
      - 손상됐으면 free로 보고 backup을 보관한 뒤 `corrupted: true`
    - `applyPurchase(tier, now)`
      - 같은 tier이고 아직 만료 전이면 `expiresAt + 30일`
      - 아니면 `now + 30일`
      - `purchasedAt`에는 `now`를 기록합니다.
    - `expireIfNeeded(now): boolean`
    - `runLimit(tier)`
  - `aiNoticeRepo`: `isAcked()`, `ack(now)`
- DoD
  - 빈 저장소에서 plan은 `{ tier: 'free', purchasedAt: null, expiresAt: null }`입니다.
  - `applyPurchase('starter', 2026-09-16T03:00:00Z)`는 `purchasedAt: '2026-09-16T03:00:00.000Z'`, `expiresAt: '2026-10-16T03:00:00.000Z'`를 저장합니다.
  - 그 상태에서 한 번 더 구매하면 `expiresAt === '2026-11-15T03:00:00.000Z'`입니다.
  - 만료된 pro에서 `expireIfNeeded`는 true를 반환하고 plan을 free로 저장합니다.
  - 값이 `"{tier:"`이면 free, `corrupted: true`이고 `atb:plan:backup === '{tier:'`입니다.
- Covers: F1-AC-8, F8-AC-2, F8-AC-4, F8-AC-6, F8-AC-8
- Files: src/lib/storage/planRepo.ts, src/lib/storage/aiNoticeRepo.ts, src/lib/storage/planRepo.test.ts
- Depends on: Task 2.1, Task 2.3

### Task 2.8 FlowDraft 검증기
- Description: `validateFlowDraft(draft): { valid; errors: Record<string, string> }`를 만듭니다.
  - 규칙 상수: 이름 30자, 텍스트 2000자, 지시문 500자, 키워드 20자, 액션 1~3개, 시트 이름 50자
  - 정규식: HHmm, range, sheetUrl, webhookUrl
  - 에러 키는 필드 경로입니다(예: `actions.0.webhookUrl`).
- DoD
  - F1-AC-4 표 15행을 테이블 기반 테스트로 검사합니다. 모든 행에서 `valid === false`이고 `errors[경로]`가 표의 문구와 정확히 같습니다.
  - F1-AC-1의 draft는 `{ valid: true, errors: {} }`입니다.
  - weekly의 days에 중복이 있으면 무효입니다.
- Covers: F1-AC-4
- Files: src/lib/validation/flowDraft.ts, src/lib/validation/flowDraft.test.ts
- Depends on: Task 1.1

### Task 2.9 런타임 가드 · 깊은 복사
- Description
  - `isSupportedDraft(x)`: trigger, input, aiTask, action의 type이 허용된 값인지, actions가 1~3개인지 확인합니다.
  - `parseBuilderState`, `parseGenerateState`, `parseGenerateResultState`, `parseRunsState`, `parsePlanState`: 유효하면 해당 LocationState를, 아니면 `null`을 반환합니다.
  - `deepCopyDraft`: JSON 직렬화로 복사합니다.
- DoD
  - `actions: []`나 `trigger.type: 'hourly'`는 `false`이고, F4-AC-1의 draft는 `true`입니다.
  - `parseGenerateResultState(null)`과 `parseGenerateResultState({ prompt: 'x' })`는 둘 다 `null`입니다.
  - `parseRunsState({ filter: 'weird' })`는 `null`입니다.
  - 복사본을 바꿔도 원본은 그대로입니다.
  - 파일 안에 `structuredClone`이 없습니다.
- Covers: F3-AC-6, F4-AC-5, F4-AC-8, F7-AC-5, G-AC-4
- Files: src/lib/validation/guards.ts, src/lib/validation/guards.test.ts
- Depends on: Task 1.2

### Task 2.10 (수정) 번들 템플릿 데이터 6개 + 무결성 테스트
- Description: F7-AC-1 표의 6개 템플릿을 정의합니다.
  - `tpl_news_slack`의 keyword는 `'AI'`입니다.
  - 사용자가 채워야 하는 필드는 `''`로 비우고, 그 경로를 `requiredFields`에 넣습니다.
    - text 입력을 쓰는 템플릿(`tpl_inquiry_classify_sheet`, `tpl_meeting_summary`)은 `input.text`도 requiredFields에 넣습니다.
  - classify·custom의 instruction과 google_sheet의 range는 유효한 기본값으로 채웁니다.
  - G-AC-5 금지어를 쓰지 않습니다.
- DoD
  - 템플릿이 6개이고, id·title·category·구성이 표와 같습니다.
  - 각 템플릿의 검증 에러 키 집합이 `requiredFields` 집합과 같습니다.
  - requiredFields를 아래 유효값으로 채우면 6개 모두 `valid: true`입니다.
    - webhookUrl: `https://hooks.slack.com/services/T/B/x`
    - sheetUrl: `https://docs.google.com/spreadsheets/d/abc`
    - sheetName: `Sheet1`
    - text: `샘플 텍스트`
  - 모든 requiredFields 경로가 `KNOWN_HINT_PATTERNS` 중 하나에 맞습니다. fallback 문구를 쓰는 경로가 0건입니다.
  - 금지어 정규식에 매치되는 곳이 없습니다.
- Covers: F7-AC-1, F7-AC-4, F7-AC-8, G-AC-5
- Files: src/data/templates.ts, src/data/templates.test.ts
- Depends on: Task 2.2, Task 2.8

### Task 2.11 API 클라이언트 (에러 매핑 · 타임아웃)
- Description: `api.request(method, path, body?, { timeoutMs })`와 get / post / put / delete를 만듭니다.
  - URL은 `VITE_API_BASE_URL + path`입니다.
  - 헤더는 `Content-Type: application/json`과 `X-Client-Id`(`clientRepo.ensure()`)입니다.
  - 에러는 이렇게 바꿉니다.
    - 2xx가 아니고 본문이 JSON: `ApiError(body.error, status)`
    - fetch reject: `NETWORK_ERROR`, status 0
    - 시간 초과로 abort: `TIMEOUT`, status 0
    - 본문이 JSON이 아님: `INVALID_RESPONSE`, 해당 status
- DoD: fetch mock 테스트 6개가 통과합니다.
  1. URL
  2. 헤더 2개
  3. 400 `FLOW_INVALID`
  4. reject → `NETWORK_ERROR`
  5. fake timer 30,000ms → `TIMEOUT`, `signal.aborted`가 true
  6. 200 응답 본문이 `<html>` → `INVALID_RESPONSE`
- Covers: F1-AC-7
- Files: src/api/client.ts, src/api/client.test.ts
- Depends on: Task 2.3, Task 2.4

### Task 2.12 엔드포인트 함수
- Description
  - `generateFlow(prompt)`: 타임아웃 20,000ms
  - `runFlow(runId, flow)`: `trigger: 'manual'`, 타임아웃 30,000ms
  - `listRuns(since, limit = 100)`
  - `putSchedule(flow)`: `timezone: 'Asia/Seoul'`
  - `deleteSchedule(flowId)`: 404 응답도 성공으로 봅니다.
- DoD
  - `generateFlow`의 body와 timeoutMs 20000이 맞습니다.
  - `runFlow`의 body에 runId, flow, trigger가 들어 있습니다.
  - `listRuns`의 URL에 `since=2026-09-15T00%3A00%3A00Z&limit=100`이 들어 있습니다.
  - `putSchedule`의 timezone이 맞습니다.
  - `deleteSchedule`은 404를 받아도 resolve되고, 500이면 `ApiError(status 500)`로 reject됩니다.
- Covers: F4-AC-1, F5-AC-1, F5-AC-5, F5-AC-7, F6-AC-1
- Files: src/api/endpoints.ts, src/api/endpoints.test.ts
- Depends on: Task 2.11

### Task 2.13 실행 지표 계산기
- Description
  - `monthStats(runs, now)`
  - `last7DaysCounts(runs, now)`: KST 기준, 오래된 날부터
  - `unseenFailureCount(runs, lastSeenAt)`
  - `filterRuns`, `sortByStartedDesc`
- DoD
  - success 8·failed 2이면 `rate 80`, `total 10`입니다.
  - now=`2026-09-16T12:00+09:00`이면 `[0,1,3,0,2,1,3]`입니다.
  - lastSeenAt 이후의 failed가 2건이면 2를 반환합니다.
  - lastSeenAt이 null이면 failed 전체 개수를 반환합니다.
  - 이번 달 run이 0건이면 `rate 0`, `total 0`이고 NaN이 나오지 않습니다.
- Covers: F2-AC-4, F6-AC-2, F6-AC-3
- Files: src/lib/runMetrics.ts, src/lib/runMetrics.test.ts
- Depends on: Task 2.1

### Task 2.14 (수정) 수동 실행 서비스
- Description: `executeManualRun(flow, now)`는 아래 네 가지 결과 중 하나를 반환합니다.
  - `quota_exceeded { tier, limit }`
    - `runCount >= RUN_LIMIT[tier]`이면 API를 호출하지 않습니다.
    - pro(null)는 이 결과가 나오지 않습니다.
  - `completed { run, toast }`
    - 200 응답을 받으면 runRepo.add, usage +1, Flow의 `lastRunAt`·`lastRunStatus` 갱신을 합니다.
    - toast는 "실행을 완료했어요" 또는 "실행에 실패했어요: {errorMessage}"입니다.
  - `local_failed { run, toast }`
    - NETWORK_ERROR: errorMessage에 CP-2 문구를 넣은 failed RunLog를 추가합니다. toast는 "네트워크 연결을 확인해주세요"입니다.
    - TIMEOUT: errorMessage "실행 응답 시간이 30초를 넘었어요"로 failed RunLog를 추가합니다. toast도 같은 문구입니다.
    - 두 경우 모두 RunLog id는 요청에 쓴 runId, `aiOutput: null`, `trigger: 'manual'`, `steps: []`입니다. Flow의 lastRun*은 failed로 갱신하고, usage는 그대로입니다.
  - `request_failed { toast: string | null }`: RunLog를 추가하지 않고 usage도 그대로입니다.
    - 500 또는 INVALID_RESPONSE: "실행 요청에 실패했어요. 다시 시도해주세요"
    - 400: "플로우 설정을 확인해주세요"
    - 429: "잠시 후 다시 시도해주세요"
    - 409: toast `null`
  - 저장 중 `StorageFullError`가 나면 `request_failed`로 반환하고 toast는 CP-2 STORAGE_FULL 문구입니다.
- DoD
  - free에서 runCount 100이면 fetch 0회이고 결과는 `quota_exceeded { tier: 'free', limit: 100 }`입니다. 99이면 fetch 1회입니다.
  - starter에서 runCount 1000이면 fetch 0회, 999이면 1회입니다.
  - 200 success면 runCount가 37→38이 되고 `lastRunStatus`는 `'success'`입니다.
  - 200 failed여도 runCount는 38이고 toast는 "실행에 실패했어요: {errorMessage}"입니다.
  - NETWORK_ERROR면 RunLog id가 요청한 runId와 같고, runCount는 37이며, toast는 "네트워크 연결을 확인해주세요"입니다.
  - TIMEOUT이면 errorMessage와 toast 문구가 맞습니다.
  - 500 / 400 / 429 / 409 / INVALID_RESPONSE 다섯 경우 모두 runs와 runCount가 그대로이고, toast가 표와 같습니다.
  - pro는 runCount가 5000이어도 실행됩니다.
- Covers: F5-AC-1, F5-AC-2, F5-AC-3
- Files: src/services/runService.ts, src/services/runService.test.ts
- Depends on: Task 2.4, Task 2.5, Task 2.6, Task 2.7, Task 2.12

### Task 2.15 (수정) 스케줄 서비스
- Description: `stopAllSchedules`를 뺀 모든 함수는 `{ ok: true, flow, toast? } | { ok: false, flow, toast }`를 반환합니다.
  - `enableSchedule(flow, now)`
    - 먼저 확인: 현재 플랜 한도를 넘었으면(`runCount >= limit`) API를 호출하지 않고 `{ ok: false, toast: '이번 달 실행 횟수를 모두 사용했어요' }`를 반환합니다.
    - 200: `enabled: true`와 nextRunAt을 저장합니다. toast는 "매일 09:00에 자동으로 실행돼요" 또는 "매주 월·수 18:00에 자동으로 실행돼요" 형식입니다.
    - 409: "등록할 수 있는 예약 실행 수를 넘었어요"
    - 400: "예약 설정을 확인해주세요"
    - 500·INVALID_RESPONSE: "예약 실행을 켜지 못했어요"
    - NETWORK·TIMEOUT: "네트워크 연결을 확인해주세요"
    - 실패하면 enabled는 false로 둡니다.
  - `disableSchedule(flow)`
    - 200이나 404면 `enabled: false, nextRunAt: null`로 저장합니다.
    - 500·INVALID_RESPONSE면 enabled를 그대로 두고 toast "예약 실행을 끄지 못했어요"를 반환합니다.
    - NETWORK·TIMEOUT이면 enabled를 그대로 두고 toast "네트워크 연결을 확인해주세요"를 반환합니다.
  - `resyncAfterEdit(flow)`: `flow.enabled`가 true일 때만 동작합니다.
    - `trigger.type === 'manual'`: PUT 대신 DELETE를 호출하고 `enabled: false, nextRunAt: null`로 저장합니다. DELETE 결과와 상관없이 로컬은 비활성화하고, 실패했을 때만 toast "예약 실행 갱신에 실패해 꺼졌어요"를 반환합니다.
    - daily·weekly: PUT을 호출합니다. 성공하면 nextRunAt을 갱신합니다. 실패하면 `enabled: false, nextRunAt: null`로 저장하고 toast "예약 실행 갱신에 실패해 꺼졌어요"를 반환합니다.
  - `deleteFlowWithSchedule(flow)`
    - enabled일 때만 DELETE를 호출합니다.
    - 실패하면 삭제를 멈춥니다. toast는 NETWORK 문구, 또는 500이면 "예약 실행을 끄지 못했어요"입니다.
    - 성공하면 flow를 지웁니다. runs는 남깁니다.
  - `stopAllSchedules()` → `{ stopped: string[]; failed: string[] }`
    - enabled인 플로우마다 DELETE를 1회씩 호출합니다.
    - 성공(200·404)한 플로우만 비활성화합니다. 실패한 플로우는 enabled를 유지해서 다음 동기화나 부팅 때 다시 시도합니다.
- DoD: 테스트 12개가 통과합니다.
  1. enable 200 → `nextRunAt: '2026-09-17T00:00:00Z'`
  2. enable 409 → enabled false, toast 문구 확인
  3. free에서 runCount 100일 때 enable → PUT 0회, toast "이번 달 실행 횟수를 모두 사용했어요"
  4. disable 404 → 비활성화
  5. disable 500 → enabled true 유지, "예약 실행을 끄지 못했어요"
  6. disable NETWORK → enabled true 유지, NETWORK 문구
  7. resync PUT 실패 → `enabled: false, nextRunAt: null`, toast 확인
  8. trigger를 manual로 바꾼 enabled 플로우를 resync → PUT 0회, DELETE 1회, `enabled: false`
  9. delete 중 DELETE 500 → flows 그대로
  10. enabled false인 플로우 delete → DELETE 0회
  11. enabled 2개에서 `stopAllSchedules` → DELETE 2회, `stopped` 길이 2
  12. 그중 1개가 500이면 `failed` 길이 1이고, 그 플로우는 `enabled: true` 유지
- Covers: F5-AC-5, F5-AC-6, F5-AC-7, F5-AC-8, F6-AC-7
- Files: src/services/scheduleService.ts, src/services/scheduleService.test.ts
- Depends on: Task 2.2, Task 2.4, Task 2.6, Task 2.7, Task 2.12

### Task 2.16 (수정) 실행 기록 동기화 서비스
- Description: `syncRuns(now)`는 아래 순서로 동작합니다.
  1. 요청 직전 시각 `requestedAt`을 기록합니다.
  2. `listRuns(lastSyncedAt ?? 30일 전, 100)`을 호출합니다.
  3. 받은 runs를 `upsertMany`로 합칩니다.
  4. 셀 개수를 구합니다. 이번 달(KST) run 중 새로 추가된 것과, 기존 errorCode가 TIMEOUT/NETWORK_ERROR였다가 교체된 것을 셉니다.
  5. usage를 늘립니다.
  6. Flow의 lastRun*을 갱신합니다. flowId가 로컬 플로우와 같고 받은 run의 `startedAt`이 기존 `lastRunAt`보다 늦으면 `lastRunAt`과 `lastRunStatus`를 바꿉니다.
  7. 커서를 갱신합니다.
     - 응답이 100건 미만이면 `lastSyncedAt = requestedAt`
     - 100건이면 `lastSyncedAt = 마지막(가장 늦은) run의 startedAt`. 잘린 뒷부분은 다음 동기화에서 받습니다.
  8. 현재 플랜 한도를 넘었고 enabled 플로우가 있으면 `stopAllSchedules()`를 호출합니다.
  - 반환값은 `{ ok: true, quotaStopped: boolean } | { ok: false }`입니다. `quotaStopped`는 stopped가 1건 이상일 때 true입니다.
  - 실패(NETWORK·TIMEOUT·400·500·INVALID_RESPONSE)하면 runs, usage, lastSyncedAt을 바꾸지 않습니다.
- DoD
  - F6-AC-1 상황에서 run_aaa는 교체되고 run_bbb는 추가되며, runCount는 40→42, lastSyncedAt은 `requestedAt`입니다.
  - 같은 응답으로 다시 동기화해도 runCount는 42입니다.
  - run_bbb의 flowId가 로컬 플로우와 같으면, 그 Flow의 `lastRunStatus`가 `'failed'`, `lastRunAt`이 `'2026-09-16T00:00:05Z'`로 바뀝니다.
  - 응답이 100건이면 lastSyncedAt이 100번째 run의 startedAt입니다.
  - NETWORK나 500이면 `{ ok: false }`이고 runs와 lastSyncedAt이 그대로입니다.
  - free에서 runCount 99일 때 3건이 들어오면 102가 되고, `quotaStopped: true`, DELETE는 2회입니다.
  - 한도 초과 상태라도 enabled 플로우가 0개면 DELETE 0회, `quotaStopped: false`입니다.
- Covers: F6-AC-1, F6-AC-6, F6-AC-7, F2-AC-1(예약 실행 상태 반영)
- Files: src/services/syncService.ts, src/services/syncService.test.ts
- Depends on: Task 2.5, Task 2.6, Task 2.15

### Task 2.17 앱 상태 Context
- Description: `AppStateProvider`와 `useAppState()`를 만듭니다.
  - 제공 값: `{ flows, runs, plan, usage, isFree, planExpiredOnBoot, consumeCorruption(key: 'flows' | 'usage' | 'plan'), refresh() }`
  - mount 때 1회 실행: `clientRepo.ensure()` → `planRepo.expireIfNeeded` → 각 repo 읽기
  - `consumeCorruption`은 useRef를 써서 key마다 true를 딱 한 번만 반환합니다.
- DoD
  - 빈 저장소에서 렌더하면 clientId가 생기고, free이며, flows가 0개입니다.
  - 만료된 pro로 렌더하면 `planExpiredOnBoot === true`이고 plan은 free입니다.
  - `consumeCorruption('flows')`는 처음 true, 두 번째 false를 반환합니다.
  - `refresh()` 후 repo 변경 내용이 반영됩니다.
- Covers: F1-AC-8, F2-AC-6, F8-AC-6, F8-AC-8
- Files: src/state/AppStateContext.tsx, src/state/AppStateContext.test.tsx
- Depends on: Task 2.4, Task 2.5, Task 2.6, Task 2.7

### Task 2.18 생성형 AI 첫 이용 고지 게이트
- Description: `useAiNoticeGate()` → `{ requestAck(): Promise<boolean>, dialog: ReactNode }`
  - ack가 이미 있으면 곧바로 true를 반환합니다.
  - 없으면 TDS AlertDialog를 띄웁니다.
    - 제목: "이 서비스는 생성형 AI를 활용합니다"
    - 본문: "AI가 만든 플로우와 실행 결과는 부정확할 수 있어요. 내용을 확인한 뒤 사용해주세요"
    - 버튼: "확인"
  - "확인"을 누르면 ack를 저장하고 true를 반환합니다. 다이얼로그를 "확인" 없이 닫으면 false를 반환합니다.
- DoD
  - 다이얼로그의 제목과 본문이 정확합니다.
  - "확인" 전에는 fetch가 0회입니다.
  - "확인" 후 `atb:aiNoticeAck`가 `{ackedAt}` 형태로 저장되고, 다시 마운트하면 다이얼로그가 뜨지 않습니다.
- Covers: G-AC-8
- Files: src/hooks/useAiNoticeGate.tsx, src/hooks/useAiNoticeGate.test.tsx
- Depends on: Task 1.0, Task 2.7

### Task 2.19 (신규) 전역 Toast Provider + 테스트 렌더 래퍼
- Description
  - `ToastProvider` / `useAppToast()` → `{ showToast(message: string) }`
    - **먼저 TDS에 `useToast`/`openToast` API가 있는지 확인합니다.** 있으면 그것을 감싸고, 없으면 Provider 안에서 TDS `Toast` 하나를 렌더링합니다.
    - 메시지는 큐에 넣어 한 번에 1개씩, 들어온 순서대로 보여줍니다.
    - Provider는 Routes 바깥에 두므로 navigate 뒤에도 Toast가 유지됩니다.
  - `renderWithProviders(ui, { route = '/', state, path })`
    - `TdsTestProvider` → `AppStateProvider` → `ToastProvider` → `MemoryRouter(initialEntries=[{ pathname: route, state }])` 순서로 감쌉니다.
    - `path`가 있으면 `<Routes><Route path={path} element={ui} /></Routes>`로 렌더링해서 `useParams`를 테스트할 수 있게 합니다.
    - 반환값에 `getLocation()`을 넣어 navigate 결과를 확인할 수 있게 합니다.
- DoD
  - `showToast('A')`와 `showToast('B')`를 연달아 부르면 A가 먼저 보이고, A가 닫힌 뒤 B가 보입니다.
  - 버튼을 누르면 `showToast('X')` 후 `navigate('/other')`하는 테스트에서, 이동한 뒤에도 "X"가 DOM에 있습니다.
  - `renderWithProviders(<Probe/>, { route: '/runs', state: { filter: 'failed' } })`에서 `useLocation().state.filter === 'failed'`입니다.
  - `path: '/flows/:flowId'`, `route: '/flows/flow_x'`이면 `useParams().flowId === 'flow_x'`입니다.
- Covers: F2-AC-6, F2-AC-8, F3-AC-4, F5-AC-7 등 모든 Toast AC의 전제입니다(navigate 후 Toast 유지).
- Files: src/state/ToastContext.tsx, src/test/renderWithProviders.tsx, src/state/ToastContext.test.tsx
- Depends on: Task 1.0, Task 2.17

---

## Epic 3. Core UI Pages

**Risk**
- Complexity: High
- Risk factors
  - 빌더, 플로우 상세, 실행 로그를 한 패킷에 넣으면 10분을 넘깁니다.
  - 여러 Task가 같은 페이지 파일을 고치면 충돌하고 덮어쓰기가 생깁니다.
  - `location.state`가 없을 때 크래시할 수 있습니다.
  - TDS 여백을 덮어써서 검수에서 반려될 수 있습니다.
  - 광고 게이트가 보여주는 순서를 깰 수 있습니다.
  - MVP에서 뺀 기능을 약속하는 문구가 섞일 수 있습니다.
- Mitigation
  - **섹션 컴포넌트와 훅을 먼저 만들고, 페이지 파일은 조립 Task 하나만 소유합니다.** 조립 Task는 필요한 섹션 Task 전부를 Depends on에 적습니다.
  - state를 받는 모든 페이지는 Task 2.9의 `parse*State`로 null을 먼저 확인합니다.
  - 모든 컴포넌트는 인라인 padding/margin 없이 `Spacing size`로만 간격을 둡니다.
  - 광고는 `PlanGatedAdSlot`(3.2) 하나를 통해서만 넣습니다.
  - Toast는 `useAppToast`(2.19)로만 띄웁니다.
  - MVP 제외 기능 문구는 DoD와 정적 검사(4.3)로 막습니다.

### Task 3.1 모바일 키보드 대응 훅
- Description: `useKeyboardAware()` → `{ onFieldFocus, footerOffset }`
  - 필드에 포커스하면 300ms 안에 `scrollIntoView({ block: 'center' })`를 호출합니다.
  - `visualViewport` resize를 구독해 `footerOffset = innerHeight - visualViewport.height`를 계산합니다. 이 값은 SubmitFooter를 감싼 flex 래퍼의 transform에만 씁니다.
  - `singleLineEnterBlur(e)`: Enter를 누르면 blur합니다.
- DoD
  - 포커스 후 300ms 안에 `scrollIntoView({block:'center'})`가 1회 호출됩니다.
  - viewport 높이가 800→500이면 offset은 300입니다.
  - `visualViewport`가 undefined여도 에러 없이 offset 0입니다.
- Covers: G-AC-10
- Files: src/hooks/useKeyboardAware.ts, src/hooks/useKeyboardAware.test.ts
- Depends on: Task 1.0

### Task 3.2 공용 표시 컴포넌트 + 플랜 게이트 광고 슬롯
- Description
  - `NotFoundState({ title, buttonLabel, onAction })`: `Asset.ContentIcon` + Paragraph.Text + `display="block"` Button
  - `FlowStageSummary({ draft })`
    - ListRow 3개: 트리거 요약 / AI 작업 / 액션 요약
    - URL은 평문으로만 보여주고 `<a>`를 쓰지 않습니다.
  - `RunStatusBadge({ status })`
  - `AiGeneratedBadge()`: `data-testid="ai-generated-badge"`, "AI가 생성한 결과입니다"
  - `PlanGatedAdSlot()`: `useAppState().isFree`일 때만 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`를 렌더링합니다.
- DoD
  - slack_webhook draft로 `FlowStageSummary`를 렌더링해도 `<a>`가 0개입니다.
  - Badge 문구가 정확합니다.
  - `NotFoundState` 버튼을 누르면 onAction이 1회 호출됩니다.
  - free에서는 AdSlot mock이 1개, starter·pro에서는 0개입니다.
  - `style={{ padding` / `margin` 사용이 0건입니다.
- Covers: G-AC-1, G-AC-9, F8-AC-3
- Files: src/components/NotFoundState.tsx, src/components/FlowStageSummary.tsx, src/components/RunStatusBadge.tsx, src/components/AiGeneratedBadge.tsx, src/components/PlanGatedAdSlot.tsx, src/components/shared.test.tsx
- Depends on: Task 2.2, Task 2.19

### Task 3.3 홈 — 플로우 목록 섹션 (HomeFlowSection)
- Description: `HomeFlowSection` 컴포넌트입니다. 페이지 파일은 Task 3.4가 소유합니다.
  - "AI로 만들기"(primary)와 "직접 만들기"(secondary)를 가로 2분할 flex로 놓고, 둘 다 `display="block"`입니다.
  - `data-testid="flow-list"`
    - ListRow를 updatedAt 내림차순으로 표시합니다.
    - 부제는 `flowListSubtitle`, 오른쪽은 RunStatusBadge입니다.
  - 목록이 비었을 때 `flow-empty`: `Asset.ContentIcon`, "아직 만든 플로우가 없어요", "템플릿 둘러보기"
  - 플로우가 50개 이상이면 navigate하지 않고 `showToast(FLOW_LIMIT_MESSAGE)`를 호출합니다.
- DoD
  - F2-AC-1 데이터로 렌더링하면 B, A 순서이고 부제와 Badge 문구가 AC와 같습니다.
  - "AI로 만들기"는 `navigate('/generate')`, "직접 만들기"는 `navigate('/flows/new')`를 state 없이 호출합니다. B 행은 `navigate('/flows/flow_b1c2d3e4')`입니다.
  - 목록이 비었으면 `flow-empty` 문구가 보이고, "템플릿 둘러보기"를 누르면 `navigate('/templates')`입니다.
  - 50개일 때 두 버튼 모두 navigate 0회이고 Toast가 뜹니다. 49개면 navigate 1회입니다.
- Covers: F2-AC-1, F2-AC-2, F2-AC-3, F2-AC-8
- Files: src/pages/home/HomeFlowSection.tsx, src/pages/home/HomeFlowSection.test.tsx
- Depends on: Task 2.17, Task 2.19, Task 3.2

### Task 3.4 (수정) 홈 `/` — 상태 행 + 페이지 조립
- Description
  - `HomeStatusRows`
    - 실패가 1건 이상일 때만 `home-failure-alert` ListRow "실패한 실행 {n}건이 있어요"를 보여줍니다. 누르면 `navigate('/runs', { state: { filter: 'failed' } })`입니다.
    - `usage-summary`
      - free·starter: "이번 달 실행 {n}/{limit}회" + MiniBar. 숫자는 천 단위 콤마를 붙입니다(예: "37/1,000회").
      - pro: "이번 달 실행 {n}회 · 무제한", MiniBar 없음
      - 누르면 `navigate('/plan')`입니다.
  - `HomePage`
    - ScreenScaffold 안에 Top "내 플로우" → HomeStatusRows → HomeFlowSection 순서로 놓고, 맨 아래 FloatingTabBar 높이만큼 Spacing을 둡니다.
    - `consumeCorruption('flows')`가 true면 Toast "저장된 데이터를 불러오지 못했어요"를 띄웁니다.
    - `location.state`는 읽지 않습니다.
- DoD
  - F2-AC-4 데이터에서 알림 문구와 navigate 인자가 맞습니다. 실패가 0건이면 알림 행이 DOM에 없습니다.
  - free에서 runCount 37이면 "이번 달 실행 37/100회"와 MiniBar 37%입니다. starter면 "이번 달 실행 37/1,000회"입니다. pro면 "이번 달 실행 37회 · 무제한"이고 MiniBar가 없습니다.
  - `atb:flows = "[{broken"`이면 Toast가 1회 뜨고 `flow-empty`가 보입니다. 다시 렌더링해도 Toast는 1회뿐입니다.
  - `atb:usage = "{month:"`이면 "이번 달 실행 0/100회"입니다.
- Covers: F2-AC-4, F2-AC-5, F2-AC-6
- Files: src/pages/home/HomeStatusRows.tsx, src/pages/HomePage.tsx, src/pages/HomePage.test.tsx
- Depends on: Task 3.3, Task 2.13

### Task 3.5 (수정) 빌더 — 초안 reducer + 레이아웃 컴포넌트
- Description: 페이지 파일은 Task 3.10이 소유합니다.
  - `useFlowBuilder(initialDraft)`
    - 액션: setName, setTrigger, setInput, setAiStep, addAction, moveAction(index, dir), removeAction
    - `dirty` 플래그
    - `DEFAULT_DRAFT` export: manual / text '' / summarize / `[]`
  - `visibleMissingFields(draft, missingFields)`: 해당 경로 값이 빈 문자열(`''`)인 항목만 남깁니다.
  - `BuilderLayout`
    - props: `{ title, draft, errors, missingFields, actionSection, onNameChange, onOpenTrigger, onOpenAi, onSave, saving, onBack, nameFieldRef }`
    - Top(뒤로가기)과 TextField "플로우 이름"(`enterKeyHint="done"`, useKeyboardAware)
    - `stage-card-trigger` → `stage-connector` → `stage-card-ai` → `stage-connector` → `stage-card-action`
    - 단계 라벨("1 트리거", "2 AI 처리", "3 액션")은 t6, 요약은 t5 타이포입니다.
    - 에러와 missingFields 힌트는 경로 접두어로 위치를 정하고, Card 안쪽 하단에 둡니다.
      - `name` → TextField 아래
      - `trigger.*`, `input.*` → trigger Card
      - `aiStep.*` → ai Card
      - `actions*` → action Card
    - SubmitFooter의 "저장" Button은 `display="block"`이고 `saving`이면 loading입니다. footerOffset을 적용합니다.
- DoD
  - `DEFAULT_DRAFT`로 렌더링하면 stage-card 3개가 순서대로, connector가 2개, "저장" 버튼이 있습니다.
  - `errors={ name: '플로우 이름을 입력해주세요', 'trigger.days': '요일을 1개 이상 선택해주세요', actions: '액션을 1개 이상 추가해주세요' }`를 넘기면 각 문구가 제자리에 보입니다.
  - `missingFields=['actions.0.webhookUrl']`이고 webhookUrl이 `''`면 `stage-card-action` 안에 "슬랙 Webhook 주소를 입력해야 해요"가 보입니다. 값을 채운 draft로 다시 렌더링하면 힌트가 사라집니다.
  - reducer 테스트
    - `[in_app, slack]`에서 `moveAction(1, 'up')`을 하면 `[slack, in_app]`입니다.
    - `removeAction`을 하면 해당 액션이 빠집니다.
    - `setName` 후 `dirty === true`입니다.
- Covers: F3-AC-1, F3-AC-3, F3-AC-5, F3-AC-6, G-AC-10
- Files: src/pages/builder/useFlowBuilder.ts, src/pages/builder/BuilderLayout.tsx, src/pages/builder/BuilderLayout.test.tsx
- Depends on: Task 2.2, Task 3.1, Task 3.2

### Task 3.6 빌더 — 트리거·입력 BottomSheet
- Description: `TriggerSheet({ open, trigger, input, onDone(trigger, input), onClose })`
  - 트리거: 수동 / 매일 / 매주
    - 매주를 고르면 요일 Chip 7개(월~일, 여러 개 선택)가 나옵니다.
    - 수동이면 시간 목록을 숨깁니다.
  - 시간: 00:00~23:30 ListRow 48개. 시트를 열면 선택된 시간이 가운데로 스크롤됩니다.
  - 입력 데이터
    - 텍스트: TextArea 2000자
    - 구글 시트: URL과 범위 TextField
    - 뉴스 키워드: TextField 20자
  - BottomSheet 안의 필드에 포커스하면 visualViewport 기준으로 시트 높이를 줄입니다.
  - "완료"를 누르면 `onDone`을 호출합니다.
- DoD
  - "매일" → "09:00" → "뉴스 키워드" → "AI" 입력 → "완료"를 하면 `onDone({type:'daily',time:'09:00'}, {type:'news_keyword',keyword:'AI'})`가 1회 호출됩니다.
  - "매주"를 고르면 Chip 7개가 나오고, 2개를 누르면 둘 다 선택 상태입니다.
  - 시간 행이 48개이고 첫 행은 "00:00", 마지막 행은 "23:30"입니다.
  - "수동"을 고르면 시간 행이 0개이고, 완료하면 `onDone({type:'manual'}, …)`입니다.
- Covers: F3-AC-2
- Files: src/pages/builder/TriggerSheet.tsx, src/pages/builder/TriggerSheet.test.tsx
- Depends on: Task 2.2, Task 3.1

### Task 3.7 빌더 — AI 처리 BottomSheet
- Description: `AiStepSheet({ open, aiStep, onDone, onClose })`
  - AI 작업 Chip 4개
  - 지시문 TextArea: 500자, useKeyboardAware
  - 번역을 고르면 언어 Chip 4개(ko/en/ja/zh)가 나옵니다.
  - 번역이 아닌 작업을 고르면 `targetLanguage`를 null로 바꿉니다.
- DoD
  - "번역" → "en" → "완료"를 하면 `onDone({ task:'translate', targetLanguage:'en', ... })`가 호출됩니다.
  - 이어서 "요약" → "완료"를 하면 `targetLanguage === null`입니다.
  - TextArea에 `maxLength={500}`이 있습니다.
- Covers: F3-AC-1, G-AC-10
- Files: src/pages/builder/AiStepSheet.tsx, src/pages/builder/AiStepSheet.test.tsx
- Depends on: Task 3.1

### Task 3.8 (수정) 빌더 — 액션 목록 · 액션 추가 BottomSheet
- Description
  - `ActionSection({ actions, onAdd, onMove, onRemove })`
    - 행마다 위로 / 아래로 / 삭제 아이콘 버튼이 있고, 크기는 flex 래퍼로 min 44×44px입니다.
    - 첫 행의 "위로"와 마지막 행의 "아래로"는 disabled입니다.
    - actions가 `[]`면 "액션을 추가해주세요"를 보여줍니다.
    - 3개면 "액션 추가"를 disabled로 만들고 "액션은 최대 3개까지 추가할 수 있어요"를 보여줍니다.
  - `ActionSheet`
    - 앱에 저장
    - 슬랙 보내기: Webhook TextField
    - 구글 시트에 기록: URL과 시트 이름 TextField, 그리고 평문 안내 "이 시트를 {VITE_SHEET_SERVICE_ACCOUNT_EMAIL} 계정에 편집자로 공유해주세요"
    - 카카오톡 보내기·네이버 캘린더 등록: disabled + Badge "준비 중". 누르면 Toast만 띄웁니다. **(MVP 제외 GAP-1)** 이 두 항목에는 입력 필드, OAuth 버튼, 외부 이동 코드를 두지 않습니다.
    - URL은 평문으로만 보여줍니다.
- DoD
  - 슬랙 액션을 추가하면 `onAdd({ type:'slack_webhook', webhookUrl:'https://hooks.slack.com/services/T01/B02/abc' })`가 호출됩니다.
  - 2번째 행의 "위로"는 `onMove(1,'up')`, "삭제"는 `onRemove(index)`를 호출합니다.
  - 액션이 3개면 추가 버튼이 disabled이고 보조 문구가 정확합니다.
  - "카카오톡 보내기"를 누르면 onAdd 0회에 Toast "카카오톡 연동은 준비 중이에요"가 뜹니다. 네이버는 "네이버 캘린더 연동은 준비 중이에요"입니다.
  - 카카오·네이버 행 안에 `input`과 `textarea`가 0개이고, 두 행 모두 "준비 중" Badge가 있습니다.
  - 구글 시트 안내 문구에서 env 값이 치환되어 보입니다.
  - `<a>`가 0개입니다.
- Covers: F3-AC-3, F3-AC-7, G-AC-1, G-AC-11
- Files: src/pages/builder/ActionSection.tsx, src/pages/builder/ActionSheet.tsx, src/pages/builder/ActionSection.test.tsx
- Depends on: Task 2.2, Task 2.19, Task 3.1, Task 3.2

### Task 3.9 (수정) 빌더 — 저장 훅 (검증 · 생성/수정 · 스케줄 재등록)
- Description: `useBuilderSave({ mode: 'new'|'edit', flowId, source, templateId })` → `{ save(draft): Promise<SaveResult>, saving }`
  - `SaveResult`는 넷 중 하나입니다.
    - `{ kind: 'invalid', errors, firstErrorPath }`
    - `{ kind: 'saved', flowId, toasts: string[] }`
    - `{ kind: 'storage_full', toast }`
    - `{ kind: 'limit', toast: FLOW_LIMIT_MESSAGE }`
  - 처리 순서
    1. `validateFlowDraft`로 검사합니다. `firstErrorPath`는 화면 순서(name → trigger·input → aiStep → actions) 기준 첫 경로입니다.
    2. new면 `create({ source: source ?? 'manual', templateId })`, edit면 `update`를 호출합니다. `FlowLimitError`는 `limit`, `StorageFullError`는 `storage_full`로 바꿉니다.
    3. edit이고 enabled면 `saving`을 켜고 `resyncAfterEdit`을 호출합니다. 트리거가 manual로 바뀐 경우도 여기서 처리됩니다. 실패하면 toast를 추가합니다.
    4. `refresh()`를 호출합니다.
  - toasts 첫 항목은 항상 "플로우를 저장했어요"입니다.
- DoD
  - F3-AC-4 입력이면 `saved`이고, `atb:flows`에 `source: 'manual'` 1개가 생깁니다.
  - edit이면 id와 createdAt은 그대로이고 updatedAt만 바뀝니다.
  - F3-AC-5 입력이면 `invalid`이고, `errors`에 문구 3개가 있으며, `firstErrorPath === 'name'`이고, flows는 그대로입니다.
  - `source: 'ai'`면 저장된 Flow가 `source: 'ai', templateId: null`입니다. `source: 'template'`이면 `templateId: 'tpl_news_slack'`입니다.
  - enabled 플로우를 수정할 때 PUT이 실패하면 `enabled: false, nextRunAt: null`로 저장되고, toasts에 "예약 실행 갱신에 실패해 꺼졌어요"가 들어갑니다.
  - enabled daily 플로우를 manual로 바꿔 저장하면 PUT 0회, DELETE 1회이고 `enabled: false`로 저장됩니다.
  - Quota mock이면 `storage_full`이고 toast는 CP-2 문구입니다.
  - flows 50개에서 new 저장이면 `limit`이고 flows 길이는 50 그대로입니다.
- Covers: F3-AC-4, F3-AC-5, F3-AC-6, F3-AC-8, F5-AC-6, F7-AC-5, F2-AC-8
- Files: src/pages/builder/useBuilderSave.ts, src/pages/builder/useBuilderSave.test.tsx
- Depends on: Task 2.8, Task 2.15, Task 2.17

### Task 3.10 (수정) 빌더 페이지 조립 — `/flows/new`, `/flows/:flowId/edit`
- Description: `FlowBuilderPage`는 이 Task만 소유합니다.
  - 초기화
    - `/flows/new`: Top 제목은 "새 플로우"입니다. `parseBuilderState(useLocation().state)`가 null이면 `DEFAULT_DRAFT`, 아니면 state의 draft와 missingFields로 채웁니다.
    - `/flows/:flowId/edit`: Top 제목은 "플로우 편집"입니다. state는 무시하고 `flowRepo.get`으로 불러옵니다. 없으면 NotFoundState("플로우를 찾을 수 없어요", "홈으로" → `navigate('/', { replace: true })`)를 보여줍니다.
  - BuilderLayout, TriggerSheet, AiStepSheet, ActionSection, ActionSheet를 useFlowBuilder로 연결합니다. missingFields 힌트는 `visibleMissingFields`로 거릅니다.
  - 저장 결과 처리
    - `invalid`: 에러를 표시하고, `firstErrorPath`에 해당하는 요소를 `scrollIntoView({ block: 'center' })`합니다.
    - `saved`: toasts를 순서대로 `showToast`하고 `navigate('/flows/<id>', { replace: true })`합니다.
    - `storage_full` / `limit`: Toast만 띄우고 화면을 유지합니다.
  - 뒤로가기: dirty면 AlertDialog "저장하지 않고 나갈까요?"(나가기 / 계속 편집)를 띄우고, "나가기"일 때만 `navigate(-1)`합니다.
- DoD
  - state 없이 들어오거나 `{ foo: 1 }` 같은 invalid state여도 크래시 없이 기본 초안과 제목 "새 플로우"가 보입니다.
  - F3-AC-6 state면 이름이 "아침 뉴스 요약"이고 action Card에 누락 힌트가 보입니다. Webhook을 입력하면 힌트가 사라집니다.
  - 트리거 Card → 매일 09:00 → 뉴스 키워드 "AI" → 완료를 하면 Card 요약이 "매일 09:00 · 뉴스 키워드 'AI'"입니다.
  - F3-AC-4 입력으로 저장하면 이동한 뒤에도 Toast "플로우를 저장했어요"가 DOM에 있고, 위치는 `/flows/<id>`(replace)입니다.
  - F3-AC-5 입력으로 저장하면 문구 3개가 보이고, 이름 TextField의 `scrollIntoView`가 호출되며, navigate는 0회입니다.
  - 이름을 바꾸고 뒤로가기를 누르면 다이얼로그가 뜹니다. "계속 편집"은 navigate 0회, "나가기"는 `navigate(-1)` 1회입니다.
  - `/flows/flow_notexist/edit`이면 "플로우를 찾을 수 없어요"가 보이고 "홈으로"는 replace navigate입니다.
  - Quota mock이면 STORAGE_FULL Toast가 뜨고 navigate는 0회입니다.
  - flows 50개에서 state 없이 `/flows/new`로 들어와 저장하면 Toast "플로우는 최대 50개까지 만들 수 있어요"가 뜨고 navigate는 0회입니다.
- Covers: F3-AC-1, F3-AC-2, F3-AC-4, F3-AC-5, F3-AC-6, F3-AC-8, F2-AC-8, G-AC-10
- Files: src/pages/builder/FlowBuilderPage.tsx, src/pages/builder/FlowBuilderPage.test.tsx
- Depends on: Task 2.9, Task 2.19, Task 3.5, Task 3.6, Task 3.7, Task 3.8, Task 3.9

### Task 3.11 AI 생성 — 제출 훅 (검증 · 로딩 · 에러 매핑)
- Description: `useGenerateSubmit({ requestAck, onSuccess, showToast })` → `{ submit(prompt), loading, inlineError }`
  1. trim 후 5자 미만이면 inlineError "5자 이상 입력해주세요"를 설정하고 API를 호출하지 않습니다.
  2. `requestAck()`가 true일 때만 계속합니다.
  3. inFlight ref로 중복 요청을 막고 `generateFlow(prompt.trim())`를 호출합니다.
  4. 200이고 `isSupportedDraft`면 `onSuccess({ prompt, draft, missingFields })`를 호출합니다.
  - 인라인 에러
    - "아직 지원하지 않는 요청이에요. 언제·무엇을·어디로 보낼지 드러나게 다시 적어주세요": 422, 200이지만 draft가 unsupported, INVALID_RESPONSE
    - "5자 이상 입력해주세요": 400 PROMPT_INVALID
  - Toast
    - 429: "잠시 후 다시 시도해주세요"
    - NETWORK: "네트워크 연결을 확인해주세요"
    - 500: "AI가 잠시 응답하지 않아요. 다시 시도해주세요"
    - TIMEOUT: "AI 응답이 지연되고 있어요. 다시 시도해주세요"
  - 끝나면 `loading`을 false로 되돌립니다.
- DoD
  - F4-AC-1 입력이면 fetch 1회, body가 정확하고, onSuccess 인자에 `missingFields: ['actions.0.webhookUrl']`가 들어 있습니다.
  - "뉴스"나 `"     "`이면 inlineError가 뜨고 fetch는 0회입니다.
  - pending 중 `submit`을 3회 호출해도 fetch 1회이고 `loading === true`입니다.
  - 422, `actions: []`, `trigger.type: 'hourly'` 세 경우 모두 UNSUPPORTED 문구가 뜨고 onSuccess는 0회입니다.
  - 429 / NETWORK / 500 / 20초 fake-timer 네 경우 모두 `showToast` 문구가 표와 같고, 이후 `loading === false`입니다.
  - ack가 거부 상태면 fetch 0회입니다.
- Covers: F4-AC-1, F4-AC-3, F4-AC-4, F4-AC-5, F4-AC-6, G-AC-8
- Files: src/pages/generate/useGenerateSubmit.ts, src/pages/generate/useGenerateSubmit.test.tsx
- Depends on: Task 2.9, Task 2.12

### Task 3.12 AI 생성 입력 페이지 — `/generate`
- Description: `GeneratePage`는 이 Task만 소유합니다.
  - Top "AI로 플로우 만들기", 안내 Paragraph.Text "하고 싶은 반복 업무를 한 문장으로 적어주세요"
  - TextArea
    - `maxLength={300}`, "n/300" 카운터
    - placeholder "예) 매일 오전 9시 뉴스 요약해서 슬랙에 보내줘"
    - Enter는 줄바꿈이고, useKeyboardAware를 씁니다.
  - 예시 Chip 3개: 가로 스크롤 flex
  - 초기값은 `parseGenerateState(state)?.prompt ?? ''`입니다.
  - mount 때 `requestAck()`를 호출하고 dialog를 렌더링합니다.
  - 로딩 중이면 버튼 위에 "AI가 플로우를 설계하고 있어요"를 보여주고, SubmitFooter "플로우 만들기"는 loading + disabled입니다.
  - 성공하면 `navigate('/generate/result', { state: { prompt, draft, missingFields } })`합니다.
  - `showToast`는 `useAppToast`로 넘깁니다.
- DoD
  - state 없이 들어오면 크래시 없이 TextArea가 비어 있습니다. `{ prompt: '매일 오전 9시 뉴스 요약해서 슬랙에 보내줘' }` state면 그 문장이 채워집니다.
  - ack가 없으면 고지 다이얼로그가 뜹니다.
  - Chip이 3개이고, 2번째를 누르면 TextArea 값이 "매주 월요일 시트 데이터 요약해서 슬랙에 보내줘"가 됩니다.
  - "뉴스"를 입력하면 "2/300"이 보이고, 제출하면 에러 문구가 뜨고 fetch는 0회입니다.
  - pending 중이면 로딩 문구가 보이고 버튼이 disabled입니다. 200 응답 후 navigate 인자가 AC와 같습니다.
  - NETWORK 에러 후 Toast가 뜨고, TextArea 값은 그대로이며, 버튼이 다시 활성화됩니다.
- Covers: F4-AC-1, F4-AC-2, F4-AC-3, F4-AC-4, F4-AC-6, G-AC-8, G-AC-10
- Files: src/pages/GeneratePage.tsx, src/pages/GeneratePage.test.tsx
- Depends on: Task 2.18, Task 2.19, Task 3.1, Task 3.11

### Task 3.13 AI 생성 결과 페이지 — `/generate/result`
- Description: `GenerateResultPage`
  - 먼저 state를 확인합니다.
    ```ts
    const state = parseGenerateResultState(useLocation().state);
    if (!state) return <Navigate to="/generate" replace />;
    ```
  - Top "AI가 만든 플로우"와 원문 prompt를 인용한 Paragraph.Text
  - `generated-preview` Card: AiGeneratedBadge + FlowStageSummary + missingFields마다 `missingFieldHint` ListRow
  - SubmitFooter "편집하고 저장하기"와 보조 Button "다시 만들기"
  - 무료 플랜이면 Card와 SubmitFooter를 함께 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`로 감쌉니다. 유료 플랜은 감싸지 않습니다.
- DoD
  - state가 null이거나 `{ prompt: 'x' }`면 `/generate`로 redirect되고, TossRewardAd mock 렌더는 0회입니다.
  - free에서 광고 mock이 children을 렌더링하면 Badge, "매일 09:00 · 뉴스 키워드 '뉴스'", "요약", "슬랙 전송", "슬랙 Webhook 주소를 입력해야 해요"가 보입니다.
  - pro면 TossRewardAd 없이 곧바로 preview가 보입니다.
  - "편집하고 저장하기"는 `navigate('/flows/new', { state: { draft, source: 'ai', templateId: null, missingFields: ['actions.0.webhookUrl'] } })`입니다.
  - "다시 만들기"는 `navigate('/generate', { replace: true, state: { prompt } })`입니다.
- Covers: F4-AC-7, F4-AC-8, G-AC-9, F8-AC-3
- Files: src/pages/GenerateResultPage.tsx, src/pages/GenerateResultPage.test.tsx
- Depends on: Task 2.9, Task 2.17, Task 3.2

### Task 3.14 (수정) 플로우 상세 — 예약 실행 행 (ScheduleRow)
- Description: `ScheduleRow({ flow, disabled, onChanged })`. 페이지 파일은 Task 3.17이 소유합니다.
  - `trigger.type === 'manual'`이면 Switch 대신 Paragraph.Text "수동으로만 실행하는 플로우예요"를 보여줍니다.
  - 그 밖에는 ListRow "예약 실행" + TDS Switch를 보여줍니다.
    - 켜기: 화면에서 먼저 켠 뒤 `enableSchedule`을 호출합니다. 실패(한도 초과 포함)하면 끄고 toast를 띄웁니다.
    - 끄기: 화면에서 먼저 끈 뒤 `disableSchedule`을 호출합니다. 실패하면 다시 켜고 toast를 띄웁니다.
    - 요청 중이거나 `disabled`면 Switch를 disabled로 둡니다.
    - 성공하면 `refresh()`와 `onChanged()`를 호출합니다.
  - 켜져 있으면 부제에 "다음 실행: {formatKstDateTime(nextRunAt)}"를 보여줍니다.
- DoD
  - daily 09:00 플로우에서 PUT 200을 받으면 `enabled: true`로 저장되고, 부제 "다음 실행: 9월 17일 (목) 09:00"와 Toast "매일 09:00에 자동으로 실행돼요"가 보이며, onChanged가 1회 호출됩니다.
  - 409면 Switch가 꺼지고 Toast "등록할 수 있는 예약 실행 수를 넘었어요"가 뜹니다. NETWORK면 Switch가 꺼지고 "네트워크 연결을 확인해주세요"가 뜹니다.
  - free에서 runCount 100이면 켜기에 PUT 0회, Switch 꺼짐, Toast "이번 달 실행 횟수를 모두 사용했어요"입니다.
  - 끄기에 200이나 404를 받으면 `enabled: false, nextRunAt: null`입니다.
  - 끄기에 500을 받으면 Switch가 켜진 상태로 돌아가고, `enabled: true`이며, Toast "예약 실행을 끄지 못했어요"가 뜹니다.
  - manual 플로우면 `role="switch"`가 0개이고 안내 문구가 보입니다.
  - `disabled`면 Switch가 disabled입니다.
- Covers: F5-AC-5, F5-AC-6, F5-AC-7
- Files: src/pages/flowDetail/ScheduleRow.tsx, src/pages/flowDetail/ScheduleRow.test.tsx
- Depends on: Task 2.1, Task 2.15, Task 2.19

### Task 3.15 플로우 상세 — 삭제 행 (DeleteFlowRow)
- Description: `DeleteFlowRow({ flow, disabled })`
  - "삭제" ListRow를 누르면 AlertDialog를 띄웁니다.
    - 제목: "'{name}' 플로우를 삭제할까요?"
    - 본문: "실행 기록은 그대로 남아요"
    - 버튼: "삭제" / "취소"
  - "삭제"를 누르면 `deleteFlowWithSchedule`을 호출합니다.
    - 성공: `refresh()` → `navigate('/', { replace: true })` → `showToast('플로우를 삭제했어요')`
    - 실패: toast만 띄웁니다.
- DoD
  - 다이얼로그 제목이 "'아침 뉴스 요약' 플로우를 삭제할까요?"입니다.
  - enabled 플로우는 DELETE 후 flows에서 빠지고, runs 길이는 그대로입니다. 위치가 `/`(replace)가 되고, 이동한 뒤에도 Toast가 DOM에 있습니다.
  - enabled false인 플로우는 DELETE fetch 0회입니다.
  - DELETE가 NETWORK 에러면 flows 그대로에 "네트워크 연결을 확인해주세요", 500이면 "예약 실행을 끄지 못했어요"이고, 두 경우 모두 navigate 0회입니다.
  - "취소"를 누르면 아무것도 바뀌지 않습니다. `disabled`면 행이 disabled입니다.
- Covers: F5-AC-7, F5-AC-8
- Files: src/pages/flowDetail/DeleteFlowRow.tsx, src/pages/flowDetail/DeleteFlowRow.test.tsx
- Depends on: Task 2.15, Task 2.19

### Task 3.16 (수정) 플로우 상세 — 지금 실행 푸터 (RunNowFooter)
- Description: `RunNowFooter({ flow, onBusyChange })`
  - SubmitFooter "지금 실행"(`display="block"`)
  - 누르면: `requestAck()` → inFlight ref로 중복 방지 → `executeManualRun` 호출
  - 요청 중에는 버튼을 loading + disabled로 두고 `onBusyChange(true)`를 호출합니다. 끝나면 **`refresh()`를 먼저 호출한 뒤** `onBusyChange(false)`를 호출합니다.
  - 결과별 처리
    - `completed`: `showToast(toast)` 후 `navigate('/runs/<id>')`
    - `local_failed` / `request_failed`: toast가 null이 아닐 때만 띄웁니다.
    - `quota_exceeded`: AlertDialog
      - 제목: "이번 달 실행 횟수를 모두 사용했어요"
      - 본문: free면 "무료 플랜은 월 100회까지 실행할 수 있어요", starter면 "스타터 플랜은 월 1,000회까지 실행할 수 있어요"
      - "요금제 보기" → `navigate('/plan', { state: { reason: 'quota_exceeded' } })`
      - "닫기"
  - AI 고지 dialog를 함께 렌더링합니다.
- DoD
  - F5-AC-1 상황이면 fetch 1회, runs +1, runCount 38, Toast "실행을 완료했어요"이고, 위치는 `/runs/run_...`입니다. 이동한 시점에 AppState.runs에 해당 run이 들어 있습니다.
  - runCount 100이면 fetch 0회이고 다이얼로그 문구가 정확합니다. "요금제 보기"를 누르면 state와 함께 navigate합니다.
  - starter에서 runCount 1000이면 본문이 "스타터 플랜은 월 1,000회까지 실행할 수 있어요"입니다.
  - NETWORK 에러면 Toast "네트워크 연결을 확인해주세요"가 뜨고 navigate 0회입니다. 409면 Toast 0회입니다.
  - pending 중 5회 눌러도 fetch 1회이고, `onBusyChange(true)`가 호출됩니다.
  - ack가 없으면 첫 탭에 고지 다이얼로그가 뜨고, "확인" 전에는 fetch 0회입니다.
- Covers: F5-AC-1, F5-AC-2, F5-AC-3, F5-AC-4, G-AC-8
- Files: src/pages/flowDetail/RunNowFooter.tsx, src/pages/flowDetail/RunNowFooter.test.tsx
- Depends on: Task 2.14, Task 2.17, Task 2.18, Task 2.19

### Task 3.17 플로우 상세 페이지 조립 — `/flows/:flowId`
- Description: `FlowDetailPage`는 이 Task만 소유합니다. `location.state`는 쓰지 않습니다.
  - `useParams`로 `flowRepo.get`을 호출합니다. 없으면 NotFoundState("플로우를 찾을 수 없어요", "홈으로" → `navigate('/', { replace: true })`)를 보여줍니다.
  - Top: 플로우 이름, 오른쪽 "편집" 텍스트 버튼(min 44×44px, → `/flows/:id/edit`)
  - `source === 'ai'`이면 Badge "AI 생성"
  - 배치 순서
    1. `flow-summary-card`(FlowStageSummary)
    2. ScheduleRow
    3. `recent-runs`: `listByFlow(id, 5)`, 최신순. 행을 누르면 `/runs/:id`. 없으면 "아직 실행한 적이 없어요"
    4. `PlanGatedAdSlot`
    5. DeleteFlowRow
    6. RunNowFooter
  - `busy` 상태 하나를 RunNowFooter의 onBusyChange로 받아 ScheduleRow, DeleteFlowRow, "편집"의 disabled에 연결합니다.
- DoD
  - DOM 순서가 `flow-summary-card`(ListRow 3개) → "예약 실행" → `recent-runs`입니다.
  - 실행 기록이 7개면 5행이 최신순으로, 0개면 "아직 실행한 적이 없어요"가 보입니다.
  - ai 플로우는 "AI 생성" Badge가 있고 manual 플로우는 없습니다.
  - webhook URL은 평문으로 보이고 `<a>`는 0개입니다.
  - "지금 실행" pending 중에는 Switch, 편집, 삭제가 모두 disabled입니다.
  - free면 AdSlot mock 1개, pro면 0개입니다.
  - `/flows/flow_notexist`면 "플로우를 찾을 수 없어요"가 보입니다.
  - "편집" 버튼 래퍼에 min 44×44px 스타일 규칙이 있습니다. 실제 크기는 Task 4.4 E2E에서 잽니다.
- Covers: F5-AC-4, F5-AC-8, G-AC-1, G-AC-9, G-AC-11
- Files: src/pages/flowDetail/FlowDetailPage.tsx, src/pages/flowDetail/FlowDetailPage.test.tsx
- Depends on: Task 3.2, Task 3.14, Task 3.15, Task 3.16

### Task 3.18 (수정) 실행 로그 — 지표 Card · 실패 알림 Card
- Description: 페이지 파일은 Task 3.21이 소유합니다.
  - `RunsMetrics({ runs, now })`
    - `run-summary-hero`: SummaryHero + CountUp "{rate}%", 라벨 "이번 달 성공률", 보조 "총 {n}회 실행"
    - `run-ratio-minibar`: 성공 : 실패 비율
    - `run-trend-sparkline`: 라벨 "최근 7일", 점 7개
  - `RunsErrorAlertCard({ count, onClick })`: count가 0보다 클 때만 `data-testid="error-alert-card"` Card "실패한 실행 {count}건이 있어요"를 렌더링합니다.
- DoD
  - success 8·failed 2이면 "80%"와 "총 10회 실행"이 보이고, MiniBar props는 8:2, Sparkline data는 `[0,1,3,0,2,1,3]`입니다.
  - `count=2`면 `error-alert-card` testid와 문구가 보이고, 누르면 onClick이 1회 호출됩니다. `count=0`이면 testid가 DOM에 없습니다.
- Covers: F6-AC-2, F6-AC-3
- Files: src/pages/runs/RunsMetrics.tsx, src/pages/runs/RunsErrorAlertCard.tsx, src/pages/runs/RunsMetrics.test.tsx
- Depends on: Task 2.13, Task 1.0

### Task 3.19 실행 로그 — 필터 Tab · 목록 · 페이지네이션 (RunLogList)
- Description: `RunLogList({ runs, filter, onFilterChange })`
  - TDS Tab "전체 / 성공 / 실패"
  - `run-log-list`
    - 행: 제목 flowName, 부제 `runRowSubtitle`, 오른쪽 RunStatusBadge
    - 20개씩 보여주고 "더 보기"(`display="block"`)를 누를 때마다 20개씩 늘립니다.
    - Tab을 바꾸면(`filter` prop이 바뀌면) 다시 20개로 돌아갑니다.
  - 필터 결과가 없으면 "해당하는 실행 기록이 없어요"를 보여줍니다.
  - 행을 누르면 `navigate('/runs/<id>')`합니다.
- DoD
  - 로그 45개(failed 12)에 `filter='failed'`면 "실패" Tab이 선택되어 있고 12행이 최신순입니다.
  - "전체"를 누르면 `onFilterChange('all')`이 호출됩니다. `filter='all'`로 다시 렌더링하면 20행 + "더 보기", 1회 누르면 40행, 2회 누르면 45행이 되고 버튼이 사라집니다.
  - 부제가 "9월 16일 09:00 · 예약 실행 · 3.2초" 형식입니다.
  - failed가 0개인데 `filter='failed'`면 빈 문구가 보입니다.
- Covers: F6-AC-4
- Files: src/pages/runs/RunLogList.tsx, src/pages/runs/RunLogList.test.tsx
- Depends on: Task 2.2, Task 2.13, Task 3.2

### Task 3.20 실행 로그 — 동기화 훅 + 한도 중지 다이얼로그
- Description
  - `useRunsSync()` → `{ syncing, syncFailed, quotaStopped, dismissQuota }`
    - mount 때 `syncRuns()`를 1회 호출하고, 끝나면 `refresh()`를 호출합니다.
  - `QuotaStoppedDialog({ open, onClose })`
    - 문구: "이번 달 실행 횟수를 모두 사용해 예약 실행을 멈췄어요"
    - "요금제 보기" → `navigate('/plan', { state: { reason: 'quota_exceeded' } })`
    - "닫기"
    - Task 4.1의 BootEffects도 이 컴포넌트를 import해서 씁니다.
- DoD
  - GET pending 중에는 `syncing === true`이고, resolve되면 false입니다.
  - F6-AC-1 응답 후 AppState runs에 run_bbb가 들어 있습니다.
  - NETWORK나 500이면 `syncFailed === true`이고 lastSyncedAt은 그대로입니다.
  - F6-AC-7 상황이면 `quotaStopped === true`이고 DELETE 2회입니다.
  - 다이얼로그 문구가 정확하고, "요금제 보기" navigate state가 맞습니다.
- Covers: F6-AC-1, F6-AC-5, F6-AC-6, F6-AC-7
- Files: src/pages/runs/useRunsSync.ts, src/components/QuotaStoppedDialog.tsx, src/pages/runs/useRunsSync.test.tsx
- Depends on: Task 2.16, Task 2.17, Task 2.19

### Task 3.21 실행 로그 페이지 조립 — `/runs`
- Description: `RunsPage`는 이 Task만 소유합니다.
  - 필터 초기값은 `parseRunsState(useLocation().state)?.filter ?? 'all'`입니다.
  - mount 시점의 `unseenFailureCount`를 스냅샷으로 잡고, 직후 `setLastSeenAt(now)`를 호출합니다.
  - 배치: Top "실행 로그" → RunsErrorAlertCard(누르면 filter를 `'failed'`로) → RunsMetrics → PlanGatedAdSlot → RunLogList
  - 상태별 표시
    - 로컬 runs 0개 + syncing: Skeleton ListRow 3개
    - 로컬 runs 0개 + 동기화 끝남: NotFoundState("아직 실행 기록이 없어요", "플로우 만들기" → `/flows/new`). 지표와 AdSlot은 렌더링하지 않습니다.
    - 로컬 runs 1개 이상: syncing이어도 곧바로 렌더링합니다.
  - `syncFailed`면 Toast "최신 실행 기록을 불러오지 못했어요"를 1회 띄웁니다.
  - `quotaStopped`면 QuotaStoppedDialog를 엽니다.
- DoD
  - state 없이 들어와도 크래시 없이 "전체" Tab입니다. `{ filter: 'failed' }` state면 "실패" Tab입니다.
  - runs가 `[]`이고 pending이면 Skeleton 3개입니다. `{runs:[]}`로 끝나면 빈 상태 문구가 보이고 hero, minibar, sparkline testid가 DOM에 없습니다.
  - 로컬 1개 + pending이면 Skeleton 0개, 행 1개입니다.
  - 로컬 10개 + NETWORK 에러면 10행이 유지되고 Toast는 1회입니다.
  - unseen failed 2건이면 `error-alert-card`가 지표 위에 보이고, 누르면 "실패" Tab이 됩니다. mount 후 `atb:runs:lastSeenAt`이 갱신되어, 이어서 HomePage를 렌더링하면 `home-failure-alert`가 없습니다.
  - free면 AdSlot mock이 hero 뒤, Tab 앞에 1개 있습니다.
  - F6-AC-7 상황이면 다이얼로그가 렌더링됩니다.
- Covers: F6-AC-1, F6-AC-2, F6-AC-3, F6-AC-4, F6-AC-5, F6-AC-6, F6-AC-7
- Files: src/pages/runs/RunsPage.tsx, src/pages/runs/RunsPage.test.tsx
- Depends on: Task 2.9, Task 3.2, Task 3.4, Task 3.18, Task 3.19, Task 3.20

### Task 3.22 실행 상세 — `/runs/:runId`
- Description: `RunDetailPage`. `useParams`만 쓰고 state는 쓰지 않습니다.
  - Top: flowName
  - `run-status-card`: RunStatusBadge + errorMessage + 시작 시각·소요 시간 ListRow
  - `run-steps`: 단계별 ListRow(제목 label, 부제 message). steps가 `[]`면(로컬 NETWORK/TIMEOUT 실패) 이 목록을 렌더링하지 않습니다.
  - `ai-output-card`: aiOutput이 null이 아닐 때만 AiGeneratedBadge + Paragraph.Text 전문
  - "플로우 보기"(`display="block"`)
    - 플로우가 있으면 `navigate('/flows/<flowId>')`
    - 없으면 disabled + "삭제된 플로우예요"
  - run이 없으면 NotFoundState("실행 기록을 찾을 수 없어요", "실행 로그로" → `navigate('/runs', { replace: true })`)
- DoD
  - F6-AC-8 데이터로 "실패"가 보이고, 단계가 3행 순서대로이며, 3번째 행 부제가 "Webhook 주소가 만료되었어요"입니다.
  - ai-output-card에 Badge와 전문이 보입니다. aiOutput이 null이면 Card가 DOM에 없습니다.
  - `steps: []`인 NETWORK_ERROR run이면 크래시 없이 errorMessage "네트워크 연결을 확인해주세요"가 보입니다.
  - 플로우가 없으면 버튼 disabled와 보조 문구가 보입니다.
  - `/runs/run_notexist`면 문구가 보이고 replace navigate합니다.
  - `<a>`가 0개입니다.
- Covers: F6-AC-8, G-AC-1, G-AC-9
- Files: src/pages/RunDetailPage.tsx, src/pages/RunDetailPage.test.tsx
- Depends on: Task 2.17, Task 3.2

### Task 3.23 (수정) 템플릿 목록 — `/templates`
- Description: `TemplatesPage`
  - Top "템플릿"
  - 분류 Chip "전체 / 리포트 / 알림 / 데이터 정리": 가로 스크롤 flex, 기본값 "전체"
  - `template-list` ListRow: 제목 + description. 누르면 `/templates/:id`로 이동합니다.
  - 필터 결과가 없으면 `Asset.ContentIcon` + "이 분류에는 아직 템플릿이 없어요"
  - 목록 뒤에 `PlanGatedAdSlot`
  - templates는 모듈에서 import하고, 테스트에서는 `vi.mock`으로 바꿀 수 있게 합니다.
  - **(MVP 제외 GAP-2)** 커뮤니티 업로드·공유·신고 UI와 관련 API 호출을 두지 않습니다.
- DoD
  - 첫 렌더에 6행이 보이고 fetch는 0회입니다.
  - "리포트"를 누르면 3행(`tpl_news_slack`, `tpl_sheet_weekly_slack`, `tpl_meeting_summary`), "알림"은 1행입니다.
  - templates를 `[]`로 mock하면 빈 문구가 보입니다.
  - 행을 누르면 `navigate('/templates/tpl_news_slack')`입니다.
  - free면 목록 뒤에 AdSlot mock 1개, pro면 0개입니다.
  - 화면 텍스트에 "업로드", "공유하기", "내 템플릿 올리기"가 0건입니다.
- Covers: F7-AC-1, F7-AC-2, F7-AC-3
- Files: src/pages/TemplatesPage.tsx, src/pages/TemplatesPage.test.tsx
- Depends on: Task 2.10, Task 2.17, Task 3.2

### Task 3.24 (수정) 템플릿 상세 — `/templates/:templateId`
- Description: `TemplateDetailPage`
  - Top: title, description Paragraph.Text
  - `template-stage-card` 3개
  - requiredFields마다 Paragraph.Text `requiredFieldNotice(path)`
  - SubmitFooter "내 플로우로 가져오기"(`display="block"`)
    - 플로우가 50개 이상이면 Toast "플로우는 최대 50개까지 만들 수 있어요"
    - 아니면 `navigate('/flows/new', { state: { draft: deepCopyDraft(t.draft), source: 'template', templateId: t.id, missingFields: t.requiredFields } })`
  - 템플릿이 없으면 NotFoundState("템플릿을 찾을 수 없어요", "템플릿 목록으로" → `navigate('/templates', { replace: true })`)
- DoD
  - Top "매일 아침 뉴스 요약 → 슬랙"이 보이고, Card 3개 문구("매일 09:00 · 뉴스 키워드 'AI'", "요약", "슬랙 전송")와 안내 "가져온 뒤 슬랙 Webhook 주소를 입력해야 해요"가 정확합니다.
  - 플로우 3개일 때 navigate state가 AC와 같습니다. 넘긴 draft를 바꿔도 원본 템플릿은 그대로입니다.
  - 플로우 50개면 navigate 0회이고 Toast가 뜹니다.
  - `/templates/tpl_notexist`면 문구가 보이고 replace navigate합니다.
- Covers: F7-AC-4, F7-AC-5, F7-AC-6, F7-AC-7
- Files: src/pages/TemplateDetailPage.tsx, src/pages/TemplateDetailPage.test.tsx
- Depends on: Task 2.9, Task 2.10, Task 2.19, Task 3.2

### Task 3.25 요금제 — 이용권 구매 영역 (PlanPurchaseArea)
- Description: `PlanPurchaseArea({ tier: 'starter' | 'pro' })`. 페이지 파일은 Task 3.26이 소유합니다. **먼저 템플릿 TossPurchase의 실제 props 시그니처를 확인하고**, 취소·실패 콜백이 있으면 그것을 씁니다.
  - SKU
    - starter: `import.meta.env.VITE_TOSS_IAP_SKU`
    - pro: `import.meta.env.VITE_TOSS_IAP_SKU_PRO`
    - `undefined`나 `''`이면 TossPurchase를 렌더링하지 않고 "지금은 구매할 수 없어요"를 보여줍니다.
  - starter 영역인데 pro를 이용 중이면 disabled로 두고 "프로 이용 중"을 보여줍니다.
  - `processProductGrant`: `planRepo.applyPurchase(tier, new Date())`를 호출하고 성공 값을 반환합니다.
  - `onPurchased`: `refresh()` 후 Toast "스타터 이용권이 적용됐어요" 또는 "프로 이용권이 적용됐어요"
  - 취소·실패로 grant가 호출되지 않으면 Toast "결제가 완료되지 않았어요"
- DoD
  - now=`2026-09-16T12:00+09:00`에 starter grant를 하면 `atb:plan`이 AC-2 값과 같고 Toast가 뜹니다.
  - pro grant면 `tier: 'pro'`, `expiresAt = purchasedAt + 30일`이고 Toast "프로 이용권이 적용됐어요"가 뜹니다.
  - starter 이용 중 다시 구매하면 expiresAt이 `2026-11-15T03:00:00.000Z`입니다.
  - 에러 콜백이 오면 plan은 free 그대로이고 Toast "결제가 완료되지 않았어요"가 뜹니다.
  - SKU가 `''`이면 TossPurchase mock 렌더 0회에 문구가 보입니다(pro도 같음).
  - pro 이용 중이면 starter 영역에 "프로 이용 중"이 보입니다.
- Covers: F8-AC-2, F8-AC-3, F8-AC-4, F8-AC-5
- Files: src/pages/plan/PlanPurchaseArea.tsx, src/pages/plan/PlanPurchaseArea.test.tsx
- Depends on: Task 2.7, Task 2.17, Task 2.19

### Task 3.26 (수정) 요금제 페이지 조립 — `/plan`
- Description: `PlanPage`는 이 Task만 소유합니다. 결제 화면이라 광고를 넣지 않습니다.
  - Top "요금제"
  - `parsePlanState(state)?.reason === 'quota_exceeded'`면 `quota-exceeded-notice` ListRow "이번 달 실행 횟수를 모두 사용했어요. 요금제를 올리면 바로 실행할 수 있어요"를 보여줍니다.
  - `current-plan-card`
    - "무료 플랜", "스타터 플랜 · 2026년 10월 16일까지", 또는 "프로 플랜 · {날짜}까지"
    - "이번 달 {n}/{limit}회 사용"(천 단위 콤마) + MiniBar. pro는 "이번 달 {n}회 사용 · 무제한"으로 표시하고 MiniBar는 없습니다.
  - `plan-card-free`, `plan-card-starter`, `plan-card-pro`
    - 가격(t3), 한도, 현재 플랜이면 Badge "이용 중"
    - starter와 pro Card 안에 PlanPurchaseArea
    - **(MVP 제외 GAP-3)** 혜택은 SPEC에 정의된 "실행 한도"와 "광고 제거"만 적습니다. 프로 Card에 "고급 연동"처럼 정의되지 않은 혜택 문구를 넣지 않습니다.
  - `consumeCorruption('plan')`이면 Toast "저장된 데이터를 불러오지 못했어요"
- DoD
  - free에서 runCount 37이면 "무료 플랜", "이번 달 37/100회 사용", MiniBar 37%가 보입니다.
  - Card가 free→starter→pro 순서이고, 가격 "₩0", "₩19,000 / 30일", "₩49,000 / 30일", 한도 "월 100회", "월 1,000회", "무제한"입니다. "이용 중"은 free Card에만 있습니다.
  - starter 구매 mock을 완료하면 current-plan-card가 "스타터 플랜 · 2026년 10월 16일까지", "이번 달 37/1,000회 사용"으로 바뀝니다.
  - `{reason:'quota_exceeded'}` state면 안내 문구가 정확합니다. state가 없으면 DOM에 없고 크래시도 없습니다.
  - `atb:plan = "{tier:"`면 free로 표시하고 Toast 1회, backup이 생깁니다. 키가 없으면 Toast 0회입니다.
  - AdSlot mock은 0개입니다.
  - 화면 텍스트에 "고급 연동"이 0건입니다.
- Covers: F8-AC-1, F8-AC-2, F8-AC-7, F8-AC-8
- Files: src/pages/PlanPage.tsx, src/pages/PlanPage.test.tsx
- Depends on: Task 2.9, Task 2.17, Task 2.19, Task 3.25

---

## Epic 4. Integration + Polish

**Risk**
- Complexity: Medium
- Risk factors
  - 라우트 순서가 틀리면 `/flows/:flowId`가 `/flows/new`를 가립니다.
  - 상세 화면에 탭바가 남을 수 있습니다.
  - 유료 플랜인데 광고가 남을 수 있습니다.
  - 검수 금지 패턴이나 MVP 제외 기능 문구가 섞일 수 있습니다.
  - 콘솔 에러가 나거나 44px 미만 터치 영역이 생길 수 있습니다.
  - 서버에 CORS 설정이 빠질 수 있습니다.
  - 통합 단계에서 페이지 파일이나 `package.json`을 다시 고치면 충돌이 납니다.
- Mitigation
  - 라우트 표를 테스트로 고정합니다(4.1).
  - 광고는 페이지 Task에서 `PlanGatedAdSlot`으로 이미 넣었으므로, 4.2는 **파일 수정 없이 통합 테스트만** 추가합니다.
  - 정책 검사를 스크립트로 반복합니다(4.3). `package.json`과 `vite.config.ts`는 Task 1.0 소유이므로 4.3은 읽기만 합니다.
  - E2E로 실제 값을 잽니다. 터치 보정은 전용 CSS 파일 하나로만 합니다(4.4).
  - CORS 스모크 스크립트를 둡니다(4.5).

### Task 4.1 (수정) 라우팅 · Provider · 하단 탭 · 부팅 처리
- Description
  - `App.tsx`
    - **먼저 `src/main.tsx`에 Router가 있는지 확인합니다.** `main.tsx`는 이 Task에서 수정하지 않습니다. Router가 없으면 App.tsx 안에서 `BrowserRouter`로 감쌉니다.
    - Provider 순서: `AppStateProvider` → `ToastProvider` → Routes
    - 라우트는 이 순서로 등록합니다: `/`, `/flows/new`, `/flows/:flowId/edit`, `/flows/:flowId`, `/generate`, `/generate/result`, `/runs`, `/runs/:runId`, `/templates`, `/templates/:templateId`, `/plan`, `*` → `/`
  - `TabBarLayout`: pathname이 `/`, `/templates`, `/runs`, `/plan`과 **정확히 같을 때만** FloatingTabBar를 렌더링합니다. 탭은 플로우 / 템플릿 / 실행 로그 / 요금제이고, 현재 경로 탭이 활성입니다.
  - `BootEffects`
    - `planExpiredOnBoot`면 Toast "이용권이 만료되어 무료 플랜으로 바뀌었어요"를 1회 띄웁니다.
    - 이때 runCount가 100 이상이고 enabled 플로우가 있으면 `stopAllSchedules()`를 호출합니다. `stopped`가 1건 이상이면 `refresh()` 후 QuotaStoppedDialog를 엽니다.
- DoD
  - 탭 4개 경로에서는 FloatingTabBar와 활성 탭이 보이고, `/flows/new`, `/flows/flow_x`, `/flows/flow_x/edit`, `/generate`, `/runs/run_x`, `/templates/tpl_news_slack`에서는 DOM에 없습니다.
  - `/flows/new`에서 FlowDetailPage가 아니라 FlowBuilderPage가 렌더링됩니다.
  - 빈 저장소로 첫 로드하면 clientId가 생기고, 다시 로드해도 같은 값입니다.
  - 만료된 pro + runCount 120 + enabled 1개로 로드하면 Toast 1회, DELETE 1회, 다이얼로그가 렌더링됩니다.
  - `/generate/result`에 state 없이 들어가면 `/generate`로 이동합니다.
  - 존재하지 않는 경로 `/foo`는 `/`로 이동합니다.
- Covers: F1-AC-8, F2-AC-7, F8-AC-6
- Files: src/App.tsx, src/components/TabBarLayout.tsx, src/components/BootEffects.tsx, src/App.test.tsx
- Depends on: Task 2.15, Task 2.19, Task 3.4, Task 3.10, Task 3.12, Task 3.13, Task 3.17, Task 3.20, Task 3.21, Task 3.22, Task 3.23, Task 3.24, Task 3.26

### Task 4.2 광고 배치 통합 검증 (파일 수정 없음)
- Description: `App` 전체를 렌더링해서 광고 위치와 플랜별 노출을 확인합니다. 페이지 파일은 고치지 않습니다. 테스트가 실패하면 광고를 넣은 해당 페이지 Task(3.13, 3.17, 3.21, 3.23)로 돌아가 고칩니다.
- DoD
  - free에서 `/runs`, `/templates`, `/flows/:id`에 AdSlot mock이 각각 1개 있습니다. `/runs`에서는 hero 뒤, Tab 앞입니다.
  - `planRepo.applyPurchase('pro')` 후 같은 경로들의 AdSlot이 0개이고, `/generate/result`의 TossRewardAd도 0개입니다.
  - `/flows/new`, `/generate`, `/plan`에서는 AdSlot이 0개입니다.
- Covers: F6-AC-2, F7-AC-1, F8-AC-3
- Files: src/__tests__/adPlacement.test.tsx
- Depends on: Task 4.1

### Task 4.3 (수정) 검수 정책 정적 검사
- Description: `scripts/check-policy.mjs`를 만듭니다. Node로 파일을 순회하고, 위반이 있으면 파일:라인을 출력하고 exit 1로 끝납니다. 인자 `--root <dir>`로 검사 루트를 바꿀 수 있습니다(fixture 테스트용). `src/test/`와 `*.test.*` 파일은 1~3, 6번 검사에서 제외합니다.
  - 검사 항목
    1. `src/`에서 `window.open(`, `window.location.href\s*=`, `href="http`
    2. `structuredClone|\.at\(|Object\.hasOwn|replaceAll`
    3. `설치하세요|다운로드|앱 설치|스토어에서`
    4. `package.json`과 `index.html`에서 `react-ga|@amplitude/|mixpanel|firebase|gtag|googletagmanager`
    5. `src/**/*.{ts,tsx,css}`에서 SPEC의 HEX 정규식
    6. **(MVP 제외 추적)** `src/`에서 `kakao_talk|naver_calendar|/api/templates|고급 연동`. 단 "카카오톡 연동은 준비 중이에요"와 "네이버 캘린더 연동은 준비 중이에요" 문자열은 허용합니다.
    7. `vite.config.ts`의 `build.target`이 `["es2017", "safari16"]`가 아니면 위반입니다(읽기만 함).
  - `package.json`과 `vite.config.ts`는 Task 1.0 소유이므로 이 Task에서 수정하지 않습니다.
- DoD
  - `npm run check:policy`가 exit 0입니다.
  - `scripts/__fixtures__/`에 `window.open('x')`, `color: #fff`, `type: 'kakao_talk'`를 각각 넣고 `--root`로 검사하면 exit 1이고 경로가 출력됩니다.
  - 7번 규칙이 target 누락 fixture를 잡아냅니다.
- Covers: G-AC-1, G-AC-4, G-AC-5, G-AC-6, G-AC-7
- Files: scripts/check-policy.mjs, scripts/check-policy.test.mjs, scripts/__fixtures__/violations.tsx, scripts/__fixtures__/vite.config.bad.ts
- Depends on: Task 1.0, Task 4.2

### Task 4.4 E2E — 콘솔 에러 0 · 터치 영역 44px
- Description: Playwright로 검증합니다.
  - 준비
    - 처음 한 번 `npx playwright install chromium`을 실행합니다.
    - `vite build && vite preview`로 띄웁니다.
    - API는 `page.route`로 mock합니다.
    - `atb:aiNoticeAck`를 미리 넣어 둡니다.
    - 뷰포트는 390×844입니다.
  - 테스트 1: `/`, `/flows/new`, `/generate`, `/runs`, `/templates`, `/plan`을 방문하는 동안 `console.error`가 0건입니다.
  - 테스트 2: 테스트 1의 경로와 `/flows/:id`, `/runs/:id`, `/templates/tpl_news_slack`에서 보이는 `button, a, [role="switch"], [role="tab"], [data-touch]`의 boundingBox가 모두 44px 이상입니다.
  - 위반이 나오면 `src/styles/touchTarget.css`에서만 flex 래퍼의 `min-width/min-height: 44px` 규칙으로 보정합니다. TDS padding은 건드리지 않습니다. 이 CSS는 `src/main.tsx`에서 import합니다.
- DoD
  - `npx playwright test e2e/policy.spec.ts`의 두 테스트가 모두 통과합니다.
  - 실패하면 selector와 크기가 출력됩니다.
- Covers: G-AC-2, G-AC-11
- Files: e2e/policy.spec.ts, playwright.config.ts, src/styles/touchTarget.css, src/main.tsx
- Depends on: Task 4.3

### Task 4.5 (수정) 외부 API CORS 스모크 검사 + 서버 계약 문서
- Description: 서버 코드는 만들지 않습니다.
  - `scripts/check-cors.mjs`
    - `API_BASE_URL`과 `APP_ORIGIN`으로 `OPTIONS /api/runs`를 보냅니다.
    - 헤더: `Origin`, `Access-Control-Request-Method: POST`, `Access-Control-Request-Headers: content-type,x-client-id`
    - 확인: status 204, Allow-Origin에 APP_ORIGIN, Allow-Headers에 `Content-Type`과 `X-Client-Id`(대소문자 무시)
  - `docs/api-server-contract.md`
    - 엔드포인트 5개, 에러 코드, CORS, 멱등 runId 규칙
    - `GET /api/runs`는 `startedAt` 오름차순이고 `limit`만큼 자릅니다. 클라이언트가 커서(마지막 startedAt)로 다음 페이지를 받는다는 점을 명시합니다.
    - **"MVP 제외 범위"** 절: 카카오톡·네이버 캘린더 액션 타입, `POST /api/templates`(커뮤니티 템플릿), 프로 "고급 연동"은 MVP 서버에서 구현하지 않습니다. 각 항목에 해당 Open Question 번호(1, 7, 3)를 적습니다.
- DoD
  - 테스트 안의 `node:http` mock 서버가 올바른 헤더로 응답하면 exit 0입니다.
  - `X-Client-Id`가 빠지면 exit 1이고 빠진 헤더 이름을 출력합니다.
  - 문서에 엔드포인트 5개, CORS 절, "MVP 제외 범위" 절(3개 항목)이 있습니다.
- Covers: G-AC-3
- Files: scripts/check-cors.mjs, scripts/check-cors.test.mjs, docs/api-server-contract.md
- Depends on: Task 2.12

---

## MVP 제외 범위 추적 (교차 검증 GAP 대응)

SPEC Assumptions와 Open Questions에서 뺀 기능이 화면이나 코드에서 "되는 것처럼" 보이지 않도록, 아래 Task의 DoD로 막습니다.

| GAP | SPEC 근거 | 막는 방식 | Task |
|---|---|---|---|
| GAP-1 카카오톡·네이버 캘린더 연동 | Assumptions #3, OQ #1, F3-AC-7 | "준비 중" Badge + disabled + Toast만 둡니다. 입력 필드 0개, `Action` 타입에 넣지 않음, 정적 검사로 `kakao_talk`·`naver_calendar` 0건 | 1.1, 3.8, 4.3, 4.5 |
| GAP-2 커뮤니티 템플릿 업로드 | Assumptions #9, OQ #7 | 번들 6개만 둡니다. 업로드·공유 문구 0건, `/api/templates` 호출 0건 | 2.10, 3.23, 4.3, 4.5 |
| GAP-3 프로 "고급 연동" | OQ #3 | 프로 혜택은 실행 한도 무제한과 광고 제거만 적습니다. "고급 연동" 문구 0건 | 3.26, 4.3, 4.5 |

---

## 파일 소유권 점검

| 이전에 겹치던(또는 겹칠 수 있던) 파일 | 이제 소유하는 Task 하나 | 비고 |
|---|---|---|
| src/pages/HomePage.tsx | 3.4 | 3.3 `home/HomeFlowSection.tsx` 분리 |
| src/pages/builder/FlowBuilderPage.tsx | 3.10 | 3.5 `BuilderLayout`, 3.6~3.8 시트·섹션, 3.9 `useBuilderSave` 분리 |
| src/pages/GeneratePage.tsx | 3.12 | 3.11 `generate/useGenerateSubmit.ts` 분리 |
| src/pages/flowDetail/FlowDetailPage.tsx | 3.17 | 3.14 `ScheduleRow`, 3.15 `DeleteFlowRow`, 3.16 `RunNowFooter` 분리 |
| src/pages/runs/RunsPage.tsx | 3.21 | 3.18 `RunsMetrics`, 3.19 `RunLogList`, 3.20 `useRunsSync` 분리 |
| src/pages/TemplatesPage.tsx | 3.23 | 광고는 3.2 `PlanGatedAdSlot` import, 4.2는 테스트 파일만 추가 |
| src/pages/PlanPage.tsx | 3.26 | 3.25 `plan/PlanPurchaseArea.tsx` 분리 |
| **package.json** | **1.0** (4.3에서 옮김) | 4.3·4.4는 수정하지 않음 |
| **vite.config.ts** | **1.0** (4.3에서 옮김) | 4.3은 읽기 검사만 |
| src/main.tsx | 4.4 | 4.1은 수정하지 않음 |
| Toast 렌더링 | 2.19 `ToastContext.tsx` | 각 화면은 `useAppToast`만 호출 |
| 테스트 래퍼 | 1.0 `TdsTestProvider`, 2.19 `renderWithProviders` | 다른 Task는 import만 |

테스트 파일을 포함한 모든 파일이 정확히 한 Task의 Files에만 나옵니다.

---

## AC Coverage

- Total ACs in SPEC: 67 (전역 G-AC 11 + F1~F8 기능 AC 8개 × 8 = 56)
- Covered by tasks: 67

| AC | Tasks |
|---|---|
| G-AC-1 | 3.2, 3.8, 3.17, 3.22, 4.3 |
| G-AC-2 | 4.4 |
| G-AC-3 | 4.5 |
| G-AC-4 | 1.0, 2.1, 2.9, 4.3 |
| G-AC-5 | 2.10, 4.3 |
| G-AC-6 | 1.0, 4.3 |
| G-AC-7 | 4.3 |
| G-AC-8 | 2.18, 3.11, 3.12, 3.16 |
| G-AC-9 | 3.2, 3.13, 3.17, 3.22 |
| G-AC-10 | 3.1, 3.5, 3.7, 3.10, 3.12 |
| G-AC-11 | 3.8, 3.17, 4.4 |
| F1-AC-1 | 2.1, 2.4 |
| F1-AC-2 | 2.5 |
| F1-AC-3 | 2.1, 2.6 |
| F1-AC-4 | 2.8 |
| F1-AC-5 | 2.3, 2.4, 2.5 |
| F1-AC-6 | 2.3, 2.4 |
| F1-AC-7 | 2.11 |
| F1-AC-8 | 2.1, 2.4, 2.5, 2.7, 2.17, 4.1 |
| F2-AC-1 | 2.2, 2.16, 3.3 |
| F2-AC-2 | 3.3 |
| F2-AC-3 | 3.3 |
| F2-AC-4 | 2.13, 3.4 |
| F2-AC-5 | 3.4 |
| F2-AC-6 | 2.6, 2.17, 2.19, 3.4 |
| F2-AC-7 | 4.1 |
| F2-AC-8 | 2.4, 2.19, 3.3, 3.9, 3.10 |
| F3-AC-1 | 3.5, 3.7, 3.10 |
| F3-AC-2 | 2.2, 3.6, 3.10 |
| F3-AC-3 | 3.5, 3.8 |
| F3-AC-4 | 2.19, 3.9, 3.10 |
| F3-AC-5 | 3.5, 3.9, 3.10 |
| F3-AC-6 | 2.2, 2.9, 3.5, 3.9, 3.10 |
| F3-AC-7 | 3.8 |
| F3-AC-8 | 3.9, 3.10 |
| F4-AC-1 | 2.12, 3.11, 3.12 |
| F4-AC-2 | 3.12 |
| F4-AC-3 | 3.11, 3.12 |
| F4-AC-4 | 3.11, 3.12 |
| F4-AC-5 | 2.9, 3.11 |
| F4-AC-6 | 3.11, 3.12 |
| F4-AC-7 | 2.2, 3.13 |
| F4-AC-8 | 2.9, 3.13 |
| F5-AC-1 | 2.12, 2.14, 3.16 |
| F5-AC-2 | 2.14, 3.16 |
| F5-AC-3 | 2.14, 3.16 |
| F5-AC-4 | 3.16, 3.17 |
| F5-AC-5 | 2.1, 2.12, 2.15, 3.14 |
| F5-AC-6 | 2.15, 3.9, 3.14 |
| F5-AC-7 | 2.12, 2.15, 3.14, 3.15 |
| F5-AC-8 | 2.15, 3.15, 3.17 |
| F6-AC-1 | 2.12, 2.16, 3.20, 3.21 |
| F6-AC-2 | 2.13, 3.18, 3.21, 4.2 |
| F6-AC-3 | 2.13, 3.18, 3.21 |
| F6-AC-4 | 2.2, 3.19, 3.21 |
| F6-AC-5 | 3.20, 3.21 |
| F6-AC-6 | 2.16, 3.20, 3.21 |
| F6-AC-7 | 2.15, 2.16, 3.20, 3.21 |
| F6-AC-8 | 3.22 |
| F7-AC-1 | 2.10, 3.23, 4.2 |
| F7-AC-2 | 3.23 |
| F7-AC-3 | 3.23 |
| F7-AC-4 | 2.2, 2.10, 3.24 |
| F7-AC-5 | 2.9, 3.9, 3.24 |
| F7-AC-6 | 3.24 |
| F7-AC-7 | 3.24 |
| F7-AC-8 | 2.10 |
| F8-AC-1 | 3.26 |
| F8-AC-2 | 2.1, 2.7, 3.25, 3.26 |
| F8-AC-3 | 3.2, 3.13, 3.25, 4.2 |
| F8-AC-4 | 2.7, 3.25 |
| F8-AC-5 | 3.25 |
| F8-AC-6 | 2.7, 2.17, 4.1 |
| F8-AC-7 | 3.26 |
| F8-AC-8 | 2.3, 2.7, 2.17, 3.26 |

- Uncovered: 0

**state를 받는 화면 점검:** state를 받는 화면 5개 모두 DoD에 "state 없이, 또는 invalid state로 직접 들어와도 크래시 없이 기본값으로 렌더링하거나 redirect한다"가 들어 있습니다.

| 경로 | Task |
|---|---|
| `/flows/new` | 3.10 |
| `/generate` | 3.12 |
| `/generate/result` | 3.13 |
| `/runs` | 3.21 |
| `/plan` | 3.26 |

---

## SPEC에 없어 새로 정한 구현 결정 (기획 확인 필요)

1. 이용권을 다시 사면 `purchasedAt`을 새 구매 시각으로 기록합니다(Task 2.7).
2. 첫 동기화에서 `lastSyncedAt`이 없으면 `since`를 30일 전으로 잡습니다(Task 2.16).
3. starter를 쓰는 중에 pro를 사면 `now + 30일`로 새로 계산합니다(Task 2.7).
4. 동기화 응답이 `limit`(100건)을 꽉 채우면 `lastSyncedAt`을 요청 시각이 아니라 마지막 run의 `startedAt`으로 저장합니다. 이렇게 해야 잘린 기록이 유실되지 않습니다(Task 2.16).
5. 동기화한 예약 실행 결과로 Flow의 `lastRunAt`과 `lastRunStatus`를 갱신합니다. 홈 Badge에 예약 실행 결과를 보여주기 위해서입니다(Task 2.16).
6. 수동 실행이 NETWORK·TIMEOUT으로 끝나면 Flow의 `lastRunStatus`를 `failed`로 갱신하고, RunLog의 `steps`는 `[]`로 둡니다. TIMEOUT Toast는 errorMessage와 같은 문구입니다(Task 2.14).
7. 수동 실행 응답이 INVALID_RESPONSE면 500과 같은 Toast를 띄우고, 저장 중 용량이 부족하면 STORAGE_FULL Toast를 띄웁니다(Task 2.14).
8. 월 한도를 넘은 상태에서 예약 실행을 켜면 API를 호출하지 않고 Toast "이번 달 실행 횟수를 모두 사용했어요"를 띄웁니다(Task 2.15, 3.14).
9. 켜진 플로우의 트리거를 "수동"으로 바꿔 저장하면 PUT 대신 DELETE로 해제합니다(Task 2.15, 3.9).
10. 한도 초과로 일괄 중지할 때 DELETE가 실패한 플로우는 enabled를 유지하고, 다음 동기화나 부팅 때 다시 시도합니다(Task 2.15).
11. `/flows/new`에 URL로 직접 들어와도 플로우 50개 상한을 저장 시점에 다시 검사합니다(Task 2.4, 3.9, 3.10).
12. starter 한도 초과 다이얼로그 본문은 "스타터 플랜은 월 1,000회까지 실행할 수 있어요"입니다(Task 3.16).
13. 빌더의 누락 필드 힌트는 사용자가 해당 값을 채우면 사라집니다(Task 3.5, 3.10).
14. 템플릿 requiredFields 경로별 안내 문구는 Task 2.2 표를 따르며, text 입력 템플릿은 `input.text`도 필수 경로로 둡니다(Task 2.2, 2.10).