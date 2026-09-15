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

/** 토스트 알림 - 모든 액션 컴포넌트에서 호출 (구현: 패킷 0007) */
export type useToastFn = () => { show: (message: string, type?: 'success' | 'error' | 'info') => void };

/** HTTP 클라이언트 - 0006(서비스)에서 호출하여 백엔드와 통신 (구현: 패킷 0005) */
export type apiClientFn = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: any) => Promise<any>;
