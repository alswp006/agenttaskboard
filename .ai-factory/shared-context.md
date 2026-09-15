# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** 도메인 엔티티 - 모든 패킷이 참조 (구현: 패킷 0001) */
export type Flow = { id: string; name: string; description?: string; trigger: Trigger; actions: Action[]; enabled: boolean; createdAt: string; updatedAt: string };

/** 실행 로그 항목 - Run.logs 배열의 요소 (구현: 패킷 0001) */
export type Log = { timestamp: string; level: 'info' | 'warn' | 'error'; message: string };

/** 실행 기록 - 0006, 0013-0015가 사용 (구현: 패킷 0001) */
export type Run = { id: string; flowId: string; status: 'pending' | 'running' | 'success' | 'failed'; startedAt: string; completedAt?: string; logs: Log[] };

/** 트리거 설정 - Builder 컴포넌트(0011-0012)와 저장소(0003)가 공유 (구현: 패킷 0001) */
export type Trigger = { type: string; config: Record<string, any> };

/** 액션 설정 - Builder(0011-0012)와 저장소(0003)가 공유 (구현: 패킷 0001) */
export type Action = { id: string; type: string; config: Record<string, any>; enabled: boolean };

/** 템플릿 - 0009, 0016-0017에서 사용 (구현: 패킷 0001) */
export type Template = { id: string; name: string; description: string; flow: Omit<Flow, 'id' | 'createdAt' | 'updatedAt'>; category: string };

/** 라우팅 상태 - 0019 라우터가 관리, 모든 페이지가 참조 (구현: 패킷 0001) */
export type RouteState = { path: string; params: Record<string, string>; state?: Record<string, any> };

/** Flow 조회 - 0008, 0012-0013이 호출 (구현: 패킷 0003) */
export type getFlowFn = (id: string) => Promise<Flow | null>;

/** Flow 저장 - 0012(Builder)가 호출, id 반환 (구현: 패킷 0003) */
export type saveFlowFn = (flow: Flow) => Promise<string>;

/** Flow 목록 - 0008(Home)에서 호출 (구현: 패킷 0003) */
export type listFlowsFn = (filter?: { enabled?: boolean }) => Promise<Flow[]>;

/** Run 조회 - 0014-0015가 호출 (구현: 패킷 0003) */
export type getRunFn = (id: string) => Promise<Run | null>;

/** Run 목록 - 0015(Runs 대시보드)에서 호출 (구현: 패킷 0003) */
export type listRunsFn = (flowId?: string, limit?: number) => Promise<Run[]>;

/** Flow 실행 시작 - 0013(FlowDetail)에서 호출 (구현: 패킷 0006) */
export type executeFlowFn = (flowId: string) => Promise<Run>;

/** Run 실시간 구독 - 0014(RunDetail), 0015(Runs)가 호출, 구독 해제 함수 반환 (구현: 패킷 0006) */
export type subscribeToRunFn = (runId: string, callback: (run: Run) => void) => () => void;

/** Flow 검증 - 0011(Builder reducer), 0012(Builder)가 호출 (구현: 패킷 0004) */
export type validateFlowFn = (flow: Omit<Flow, 'id' | 'createdAt' | 'updatedAt'>) => { valid: boolean; errors: string[] };

/** 시간 표시 포매팅 - 0014-0015 페이지가 호출 (구현: 패킷 0004) */
export type formatDurationFn = (ms: number) => string;

/** 통계 계산 - 0008(Home), 0013(FlowDetail), 0015(Runs)에서 호출 (구현: 패킷 0004) */
export type calculateMetricsFn = (runs: Run[]) => { totalRuns: number; successRate: number; avgDuration: number; lastRun?: string };

/** 앱 전역 상태 - 모든 페이지 컴포넌트가 훅으로 호출 (구현: 패킷 0007) */
export type useAppStateFn = () => { user?: { id: string; email: string }; plan: 'free' | 'pro'; flows: Flow[]; setFlows: (flows: Flow[]) => void };

/** 토스트 알림 - 모든 액션 컴포넌트에서 호출 (구현: 패킷 0007
```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
/**
 * Domain Types — Shared across all layers.
 * Re-exports only; declarations live in src/types/*.ts(도메인 엔티티),
 * src/navigation/types.ts(RouteState 계약), src/api/contracts.ts(API 요청/응답).
 * 구현: 패킷 0001(엔티티·RouteState), 패킷 0005(API 계약).
 */
export * from '@/types/flow';
export * from '@/types/run';
export * from '@/types/plan';
export * from '@/types/template';
export * from '@/navigation/types';
export * from '@/api/contracts';

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  api/
    client.ts
    contracts.ts
    endpoints.ts
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  data/
    templates.ts
  hooks/
  lib/
    contract.ts
    errors.ts
    format.ts
    metrics.ts
    repos/
    safeStorage.ts
    storage.ts
    time.ts
    types.ts
    utils.ts
    validateDraft.test.ts
    validateDraft.ts
  main.tsx
  navigation/
    types.ts
  pages/
    FlowDetail.tsx
    Generate.tsx
    GenerateResult.tsx
    Home.tsx
    Plan.tsx
    RunDetail.tsx
    Runs.tsx
    TemplateDetail.tsx
    Templates.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  test/
    setup.ts
  types/
    flow.ts
    plan.ts
    run.ts
    template.ts
  vite-env.d.ts

### Exports (src/lib/)
- contract.ts: export type Flow =; export type Log =; export type Run =; export type Trigger =; export type Action =; export type Template =; export type RouteState =; export type getFlowFn = (id: string) => Promise<Flow | null>
- errors.ts: export const ERROR_CODES =; export class FlowLimitError extends Error
- format.ts: export function format(draft: FlowDraft): string; export function formatDuration(ms: number): string
- metrics.ts: export interface SuccessRateResult; export function calculateSuccessRateLastWeek(runs: RunLog[]): SuccessRateResult; export function calculateMetrics(runs: ContractRun[]):
- repos/clientRepo.ts: export const clientRepo =
- repos/flowRepo.ts: export interface CreateFlowInput; export const flowRepo =
- repos/planRepo.ts: export const planRepo =
- repos/runRepo.ts: export interface SyncMeta; export const runRepo =
- repos/shared.ts: export function readEntity<T>( key: string, defaultValue: T, isValid: (v: unknown) => boolean = () => true ): T; export function writeEntity<T>(key: string, value: T): void
- repos/usageRepo.ts: export const usageRepo =
- safeStorage.ts: export interface SafeReadResult<T>; export function readSafeStorage<T = any>(key: string, defaultValue: any): SafeReadResult<T>; export function writeSafeStorage<T>(key: string, value: T): void
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- time.ts: export function getKSTMonth(date: Date): string; export function getKSTDayWindow(date: Date, days: number):; export function generateUUID(): string; export function generateFlowId(): string; export function generateRunId(): string
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string
- validateDraft.ts: export interface ValidateDraftResult; export function validateDraft(draft: FlowDraft, missingFields: string[] = []): ValidateDraftResult; export function validateFlow( flow: Omit<ContractFlow, 'id' | 'createdAt' | 'updatedAt'> ):

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd

### Module Dependencies (import graph)
  lib/format.ts → imports: lib/types
  lib/metrics.ts → imports: lib/types, lib/contract, lib/time
  lib/safeStorage.ts → imports: lib/errors
  lib/types.ts → imports: types/flow, types/run, types/plan, types/template, navigation/types, api/contracts
  lib/validateDraft.ts → imports: lib/types, lib/contract
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 도메인 타입 + RouteState 계약 (files: src/types/flow.ts, src/types/run.ts, src/types/plan.ts, src/types/template.ts, src/navigation/types.ts)
- 0002: 안전 저장소 코어 + KST/ID 유틸 + 테스트 환경 (files: src/lib/errors.ts, src/lib/safeStorage.ts, src/lib/time.ts, vite.config.ts, src/test/setup.ts)
- 0003: 엔티티 저장소 (flow·run·usage·plan·client) (files: src/lib/repos/flowRepo.ts, src/lib/repos/runRepo.ts, src/lib/repos/usageRepo.ts, src/lib/repos/planRepo.ts, src/lib/repos/clientRepo.ts)
- 0004: 검증기 · 포매터 · 지표 · 번들 템플릿 6개 (files: src/lib/validateDraft.ts, src/lib/format.ts, src/lib/metrics.ts, src/data/templates.ts, src/lib/validateDraft.test.ts)
- 0005: API 계약 타입 + 클라이언트 + 엔드포인트 (files: src/api/contracts.ts, src/api/client.ts, src/api/endpoints.ts, src/lib/types.ts, src/api/client.test.ts)