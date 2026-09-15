🇰🇷 [English](./README.md)

# AgentTaskBoard — AI 기반 워크플로우 자동화

자동화된 워크플로우를 AI로 생성하고, 관리하며, 실행할 수 있는 토스 미니앱입니다. 예약된 트리거, 다양한 입력 소스, Slack, Google Sheets 등의 통합을 통해 데이터 처리와 작업을 자동화할 수 있습니다.

## 기능

- 🤖 **AI 기반 워크플로우 생성** — 자연어 설명에서 워크플로우 설정을 AI가 자동으로 생성
- 🔨 **워크플로우 빌더** — 트리거, AI 처리 단계, 다단계 작업으로 워크플로우를 수동으로 생성
- 📋 **워크플로우 템플릿** — 일반적인 자동화 패턴을 위한 사전 구축 템플릿
- ⏰ **유연한 스케줄링** — 수동 실행, 매일, 또는 사용자 정의 주간 일정으로 워크플로우 트리거
- 📊 **다양한 입력 소스** — 텍스트, Google Sheets, 뉴스 키워드로부터 데이터 수집
- 🔗 **다중 작업 파이프라인** — 워크플로우당 최대 3개의 연속 작업 구성 (인앱, Slack 웹훅, Google Sheets 추가)
- 📈 **실행 로그** — 모든 워크플로우 실행을 추적하며, 단계별 결과와 오류 진단 확인
- 💳 **구독 플랜** — 무료, 스타터, 프로 티어로 사용량 할당과 기능 접근 제어
- 🎯 **AI 공지 준수** — 한국 규제에 따른 AI 생성 콘텐츠 첫 사용 공지 내장

## 기술 스택

- **프론트엔드 프레임워크** — React 18 + TypeScript + Vite
- **UI 컴포넌트** — Toss Design System (@toss/tds-mobile)
- **스타일링** — Emotion
- **라우팅** — React Router v7
- **상태 관리** — React Context + localStorage
- **테스팅** — Vitest + @testing-library/react
- **시각 테스팅** — Playwright
- **플랫폼** — App-in-Toss WebView (CSR만 지원, SSR 불가)

## 시작하기

### 설치

```bash
npm install
```

### 개발 및 테스팅

```bash
# 타입 검사
npx tsc --noEmit

# 단위 테스트 실행
npx vitest run

# 시각 회귀 테스트 실행
npm run test:visual

# 시각 스냅샷 업데이트
npm run test:visual:update
```

### 프로덕션 빌드

```bash
# 프로덕션 빌드
npx vite build

# 토스 CDN에 배포 (CI/CD 파이프라인에서 처리)
npx ait deploy --api-key <KEY>
```

## 환경 변수

| 변수 | 설명 | 필수 |
|---|---|---|
| `VITE_API_BASE_URL` | 외부 API 서버 베이스 URL (예: `https://api.example.com`) | 예 |
| `VITE_TOSS_AD_GROUP_ID` | 토스 광고 배너 그룹 ID (무료 플랜 사용자용) | 선택 |
| `VITE_TOSS_AD_SLOT_ID` | 토스 광고 리워드 슬롯 ID (AI 생성 미리보기 게이트용) | 선택 |
| `VITE_TOSS_IAP_SKU` | 인앱 구매 상품 SKU (플랜 업그레이드용) | 선택 |

예시:
```env
VITE_API_BASE_URL=https://api.agenttaskboard.com
VITE_TOSS_AD_GROUP_ID=atb-banner-001
VITE_TOSS_AD_SLOT_ID=atb-generate-preview
VITE_TOSS_IAP_SKU=atb.starter.monthly
```

## 프로젝트 구조

```
src/
  pages/              # 페이지 컴포넌트 (Home, Builder, FlowDetail, RunDetail 등)
  components/         # 재사용 UI 컴포넌트 (ScreenScaffold, Card, StateView, FloatingTabBar 등)
  api/                # API 클라이언트 및 서버 통합
  hooks/              # 커스텀 React 훅 (AppStateContext, ToastProvider 등)
  services/           # 비즈니스 로직 서비스 (검증, 포맷팅, 메트릭 등)
  lib/                # 유틸리티 (스토리지 헬퍼, 검증자, 포매터, 템플릿 등)
  types/              # TypeScript 도메인 타입 (Flow, FlowDraft, RunLog, Plan 등)
  navigation/         # 라우트 및 네비게이션 상태 타입
  data/               # 정적 데이터 (템플릿, 샘플 데이터)
  styles/             # 전역 스타일 및 CSS 변수
  __tests__/          # 단위 및 통합 테스트
```

## 핵심 개념

### 워크플로우 (Flows)

워크플로우는 다음으로 구성됩니다:
- **입력** — 데이터 소스 (텍스트, Google Sheet 범위, 뉴스 키워드)
- **트리거** — 실행 일정 (수동, 매일 HH:mm, 특정 요일 주간)
- **AI 단계** — 처리 작업 (요약, 분류, 번역, 사용자 정의 명령)
- **작업** — 1~3개의 연속 작업 (인앱, Slack 웹훅, Google Sheets 추가)

워크플로우는 빌더를 통해 수동으로 생성하거나 `/generate`를 통해 AI가 생성할 수 있습니다.

### 실행 로그 (Runs)

각 워크플로우 실행은 다음과 함께 기록됩니다:
- 트리거 유형 (수동 또는 예약)
- 단계별 결과 (입력 가져오기, AI 처리, 작업 전달)
- 오류 진단 (네트워크, 할당량, 인증 실패를 위한 오류 코드 포함)
- AI 출력 스냅샷 (결과 검토 및 감사용)

### 플랜

세 가지 구독 티어:
- **무료** — 월 제한된 실행, 기본 기능, 배너 광고, AI 생성 시 리워드 광고 게이트
- **스타터** — 증가된 할당량, 광고 없음
- **프로** — 최대 할당량, 우선 지원

## 주요 기능 상세

### AI 기반 생성 (`/generate`)
- 사용자가 자연어로 워크플로우 설명 제공
- AI가 완전한 FlowDraft 생성
- 저장 전 미리보기 (무료 사용자의 경우 리워드 광고로 게이트됨)
- 준수: 첫 사용자에게 CP-2 (G-AC-8)에 따른 AI 공지 표시

### 워크플로우 빌더 (`/flows/new`, `/flows/:flowId/edit`)
- 수동 흐름 생성을 위한 단계별 양식
- 입력 소스 선택기 (텍스트, Google Sheets, 뉴스 키워드)
- 트리거 설정 (매일 시간 또는 주간 일정)
- AI 단계 편집기 (작업 유형, 명령, 대상 언어)
- 작업 파이프라인 빌더 (최대 3개 작업)
- 사용자 친화적 메시지와 함께 오류 검증

### 실행 및 모니터링
- 흐름 상세 또는 일정 페이지에서 워크플로우 수동 실행
- 상태 배지가 있는 실시간 실행 로그 보기
- 단계별 결과 및 오류 상세 정보 검사
- 준수 범위 내에서 실행 결과 다운로드 또는 공유

### 구독 관리 (`/plan`)
- 현재 플랜 티어 및 사용 할당량 보기
- 인앱 구매를 통해 업그레이드/다운그레이드
- 할당량 리셋 일정 보기 (월간, 플랜 청구 정렬)

## 배포

이 앱은 **토스 CDN**에 독립 미니앱으로 배포됩니다. 빌드 프로세스는:

1. **로컬 빌드** — `npx vite build`로 `dist/`에 정적 SPA 생성
2. **CI 검증** — 병합 전 타입 검사, 테스트, 린팅 통과
3. **토스 배포** — 파이프라인이 `npx ait deploy`로 CDN에 업로드
4. **런타임** — 토스 WebView에서 앱 실행 (CSR만 지원, SSR 불가)

**배포 제약:**
- G-AC-1에 따른 외부 도메인 이탈(Outlinks) 금지
- G-AC-2에 따른 콘솔 에러 0개 보장
- G-AC-3에 따른 외부 API의 CORS 적절히 설정
- G-AC-6에 따른 외부 분석 도구 금지, SDK `Analytics`만 사용
- G-AC-7에 따른 HEX 색상 하드코딩 금지, `var(--tds-color-*)` 사용

## 테스팅

### 단위 및 통합 테스트
```bash
npx vitest run
```
`src/__tests__/`의 테스트는 다음을 사용합니다:
- Vitest (테스트 러너)
- @testing-library/react (컴포넌트 테스팅)
- TDS 및 SDK API용 Mock 헬퍼

### 시각 회귀 테스트
```bash
npm run test:visual
```
Playwright가 모든 주요 라우트의 스크린샷을 캡처하고 베이스라인(`e2e/__shots__/`)과 비교합니다. 레이아웃 깨짐, 흰 화면, 단위 테스트에서 감지할 수 없는 텍스트 오버플로우를 잡습니다.

### 제출 전 체크리스트
1. `npx tsc --noEmit` — 모든 TypeScript 에러 수정
2. `npx vitest run` — 모든 테스트 통과
3. `npm run test:visual` — 시각 회귀 없음
4. 수동 스모크 테스트: 4개 탭 루트 및 하위 라우트 모두 네비게이트
5. 브라우저 콘솔 깨끗함: `console.error` 호출 0개

## 준수 및 표준

- **연령** — 사용자는 19세 이상이어야 함 (G-AC-5에 따른 미성년자 대상 콘텐츠 금지)
- **외부 링크** — G-AC-1에 따른 외부 도메인 이탈 금지
- **분석** — G-AC-6에 따른 SDK `Analytics`만 사용, 외부 도구(GA, Amplitude 등) 금지
- **색상** — G-AC-7에 따른 TDS 시맨틱 색상만 사용, HEX 하드코딩 금지
- **웹 API** — G-AC-4에 따른 Android 7+ / iOS 16+ 호환, 최신 전용 API 금지
- **AI 공지** — G-AC-8 및 G-AC-9에 따른 첫 사용자 AI 공지 표시, 결과에 라벨 표시
- **햅틱** — UI 디자인 스펙에 따른 주요 CTA의 성공 피드백
- **다크 모드** — 모든 TDS 컴포넌트가 자동으로 지원, 라이트 모드 전용 색상 금지

## 라이센스

MIT
