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
// Domain types — add your app-specific types here
export {};

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
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
  hooks/
  lib/
    contract.ts
    storage.ts
    types.ts
    utils.ts
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
  types/
    flow.ts
    plan.ts
    run.ts
    template.ts
  vite-env.d.ts

### Exports (src/lib/)
- contract.ts: export type Flow =; export type Log =; export type Run =; export type Trigger =; export type Action =; export type Template =; export type RouteState =; export type getFlowFn = (id: string) => Promise<Flow | null>
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

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
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 도메인 타입 + RouteState 계약 (files: src/types/flow.ts, src/types/run.ts, src/types/plan.ts, src/types/template.ts, src/navigation/types.ts)

## Available exports from existing files
// src/App.tsx
export default function App() {

// src/components/AdSlot.tsx
export function AdSlot({ adGroupId, className, variant, theme }: AdSlotProps) {

// src/components/Amount.tsx
export function Amount({

// src/components/BottomCTA.tsx
export function SubmitFooter({
export function ButtonStack({

// src/components/Card.tsx
export function Card({

// src/components/CountUp.tsx
export function CountUp({

// src/components/FloatingTabBar.tsx
export type TabItem = {
export function FloatingTabBar({ items }: { items: TabItem[] }) {

// src/components/MiniBar.tsx
export function MiniBar({

// src/components/PageShell.tsx
export function PageShell({ children, style }: { children: ReactNode; style?: CSSProperties }) {

// src/components/ScreenScaffold.tsx
export function ScreenScaffold({

// src/components/Sparkline.tsx
export function Sparkline({

// src/components/StateView.tsx
export function EmptyState({
export function LoadingState({

// src/components/SummaryHero.tsx
export function SummaryHero({

// src/components/TossPurchase.tsx
export interface TossPurchaseResult {
export function TossPurchase({

// src/components/TossRewardAd.tsx
export function TossRewardAd({

// src/lib/contract.ts
export type Flow = { id: string; name: string; description?: string; trigger: Trigger; actions: Action[]; enabled: boolean; createdAt: string; updatedAt: string };
export type Log = { timestamp: string; level: 'info' | 'warn' | 'error'; message: string };
export type Run = { id: string; flowId: string; status: 'pending' | 'running' | 'success' | 'failed'; startedAt: string; completedAt?: string; logs: Log[] };
export type Trigger = { type: string; config: Record<string, any> };
export type Action = { id: string; type: string; config: Record<string, any>; enabled: boolean };
export type Template = { id: string; name: string; description: string; flow: Omit<Flow, 'id' | 'createdAt' | 'updatedAt'>; category: string };
export type RouteState = { path: string; params: Record<stri

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(4), general(12), testing(2), ui(3)

Key lessons (verify against actual code before applying):
- [general] 화면·라우팅 등 소비자 모듈은 그것이 import하는 생산자 모듈이 병합된 뒤에만 병합하고, 순서를 지킬 수 없으면 소비자 병합과 동시에 최소 플레이스홀더를 만들어 매 병합 직후 타입체크와 빌드가 항상 통과하도록 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 전역 라우팅·탭바·Provider 배선은 개별 화면보다 먼저(초반 20% 안에) 완료하고 미구현 화면은 스텁 라우트로 연결해, 시간 예산이 소진돼도 앱이 항상 실행 가능한 상태를 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 저장·데이터 접근 등 기반 계층 패킷은 이를 import 하는 화면 패킷보다 반드시 먼저 완료·병합하고, 미완료면 상위 화면 패킷 병합을 차단하라 — 빈 기반 모듈 하나가 전 라우트 스모크를 무너뜨린다. (60% · 타 앱 1회 — 맹신 금지)
- [general] 외부에서 들어온 모든 값(라우터 state, 로컬 저장소, 부분 입력 폼)은 사용 직전에 배열·객체 기본값으로 정규화하고, 테이블/맵 조회 결과는 존재 확인 후에만 하위 속성이나 length에 접근하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 의존 그래프 최하층의 타입·계약 파일은 런타임 코드 0줄의 순수 선언으로 가장 먼저 단독 타입체크를 통과시키고, 파일 생성은 셸 명령이 아닌 허용된 편집 도구로만 하게 강제하라. (60% · 타 앱 1회 — 맹신 금지)