// @ai-factory:wiring-first — 스캐폴드가 설계(SPEC 화면 표·패킷 목록)로부터 결정론으로 깐 라우트 골격이다.
// 진입점(App.tsx) 패킷: 처음부터 다시 쓰지 마라 — SPEC과 경로를 대조·보완하고, 전역 Provider(광고/결제 SDK·앱 상태)를
//   <Routes>를 감싸는 자리에 끼워라. 라우트 경로는 지우지 말고 고쳐라(화면 파일은 이 경로로 navigate한다).
// 화면 패킷: 이 파일을 건드리지 마라 — 자기 페이지 파일(자리 페이지)만 통째로 교체한다.
import { lazy, Suspense, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppStateProvider, useAppState } from './hooks/AppStateContext';
import { ToastProvider, useAppToast } from './hooks/ToastProvider';
import { FloatingTabBar, type TabItem } from './components/FloatingTabBar';
import Home from './pages/Home';
import Generate from './pages/Generate';
import GenerateResult from './pages/GenerateResult';
import Builder from './pages/Builder';
import FlowDetail from './pages/FlowDetail';
import RunDetail from './pages/RunDetail';
import Runs from './pages/Runs';
import Templates from './pages/Templates';
import TemplateDetail from './pages/TemplateDetail';
import Plan from './pages/Plan';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

const TABS: TabItem[] = [
  { label: '플로우', path: '/' },
  { label: '템플릿', path: '/templates' },
  { label: '실행 로그', path: '/runs' },
  { label: '요금제', path: '/plan' },
];

const TAB_ROOT_PATHS = TABS.map((tab) => tab.path);

const PLAN_EXPIRED_TOAST = '이용권이 만료되어 무료 플랜으로 바뀌었어요';

// 탭-루트 4개 경로에서만 하단 탭바를 그린다(상세·폼 화면은 자체 CTA가 하단을 쓴다).
function TabBarGate() {
  const { pathname } = useLocation();
  if (!TAB_ROOT_PATHS.includes(pathname)) return null;
  return <FloatingTabBar items={TABS} />;
}

// @AI:NOTE — 만료 판정·free 전환은 AppStateProvider가 부팅 시 1회 한다. 여기선 그 결과를 Toast로 1회만 알린다.
function PlanExpiryNotice() {
  const { planExpiredOnBoot } = useAppState();
  const { showToast } = useAppToast();
  const shownRef = useRef(false);

  useEffect(() => {
    if (!planExpiredOnBoot || shownRef.current) return;
    shownRef.current = true;
    showToast(PLAN_EXPIRED_TOAST);
  }, [planExpiredOnBoot, showToast]);

  return null;
}

export default function App() {
  return (
    // @ai-factory:providers — 전역 Provider는 <Routes>를 감싸는 이 자리에 둔다(main.tsx는 @AI:ANCHOR, 수정 금지).
    <AppStateProvider>
      <ToastProvider>
        <PlanExpiryNotice />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/generate/result" element={<GenerateResult />} />
          <Route path="/flows/new" element={<Builder />} />
          <Route path="/flows/:flowId" element={<FlowDetail />} />
          <Route path="/flows/:flowId/edit" element={<Builder />} />
          <Route path="/runs/:runId" element={<RunDetail />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/templates/:templateId" element={<TemplateDetail />} />
          <Route path="/plan" element={<Plan />} />
          {DevTdsGallery && (
            <Route
              path="/__tds-gallery"
              element={
                <Suspense fallback={null}>
                  <DevTdsGallery />
                </Suspense>
              }
            />
          )}
          {/* 미정의 경로 → 홈. NotFound 화면이 설계에 생기면 이 줄을 그 화면으로 바꿔라. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <TabBarGate />
      </ToastProvider>
    </AppStateProvider>
  );
}
