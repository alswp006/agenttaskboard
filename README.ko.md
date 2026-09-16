🇰🇷 [English](./README.md)

# AgentTaskBoard — 토스용 AI 기반 워크플로우 자동화

AgentTaskBoard는 토스 플랫폼용 미니앱으로, 사용자가 AI 기반 워크플로우를 생성, 관리, 실행할 수 있게 해줍니다. 커스텀 자동화 흐름을 만들고, 자연어로 생성하며, 템플릿을 저장하고, 실행 로그를 추적할 수 있습니다—모두 세련된 모바일 우선 인터페이스 내에서.

## 기능

- 🔄 **흐름 빌더** — 여러 액션 유형으로 자동화 워크플로우를 생성하는 드래그 앤 드롭 인터페이스
- 🤖 **AI 생성** — 생성형 AI를 사용하여 자연어 설명으로 완전한 워크플로우 생성
- 📋 **템플릿 관리** — 6개의 번들 템플릿이 포함된 워크플로우 템플릿을 저장하고 재사용
- 📊 **실행 로그** — 최대 200개의 최근 워크플로우 실행을 상세한 결과 및 상태와 함께 추적
- 💳 **유연한 요금제** — 월별 실행 한도 및 한도 추적이 있는 무료 및 유료 플랜
- 📈 **사용 대시보드** — 실행 한도, 저장소 사용량, 플랜 상태 모니터링
- 🎯 **실행 상세 정보** — 개별 실행의 상세한 결과 및 출력 보기

## 기술 스택

- **프레임워크** — Vite 6.3 + React 18 + TypeScript 5.8
- **라우팅** — React Router 7.5
- **UI 컴포넌트** — Toss Design System (@toss/tds-mobile)
- **앱 통합** — App-in-Toss SDK (@apps-in-toss/web-framework)
- **스타일링** — Emotion (@emotion/react, @emotion/styled)
- **상태 관리** — React Context API + localStorage
- **테스팅** — Vitest + @testing-library/react + Playwright (visual)
- **아이콘** — lucide-react

## 시작하기

### 사전 요구사항

- Node.js 18+ 및 npm

### 설치

```bash
npm install
```

### 프로덕션 빌드

```bash
npm run build
```

배포 준비가 완료된 프로덕션 최적화 번들을 `dist/` 디렉토리에 생성합니다.

### 토스 배포

App-in-Toss 배포를 위해 빌드하고 준비하려면:

```bash
npm run build
npx ait build
```

그 후 토스 개발자 콘솔을 통해 검토용 빌드를 제출하세요.

## 환경 변수

| 변수 | 설명 | 필수 |
|---|---|---|
| `VITE_API_BASE_URL` | 백엔드 API 서버 기본 URL | 예 |
| `VITE_TOSS_AD_GROUP_ID` | 토스 배너 광고 그룹 ID | 아니오 |
| `VITE_TOSS_AD_SLOT_ID` | 토스 리워드 광고 슬롯 ID | 아니오 |

환경 변수는 `.env`(git 무시됨) 또는 `.env.local`에서 로드됩니다.

## 프로젝트 구조

```
src/
  ├── pages/              # 페이지 컴포넌트 (Home, Generate, Builder 등)
  ├── components/         # 재사용 가능한 UI 컴포넌트 (Card, StateView, FloatingTabBar 등)
  ├── hooks/              # 커스텀 훅 (AppStateContext, ToastProvider)
  ├── lib/                # 유틸리티, 타입, 저장소 헬퍼
  │   ├── types.ts        # 공유 도메인 타입 및 RouteState 계약
  │   ├── format.ts       # 포맷팅 유틸리티
  │   ├── errors.ts       # 에러 코드 및 메시지
  │   └── storage.ts      # localStorage 헬퍼
  ├── __tests__/          # Vitest 유닛 및 통합 테스트
  ├── App.tsx             # 라우팅 및 전역 제공자가 있는 메인 앱
  └── main.tsx            # React 루트 및 TDS 제공자 설정
public/
  └── index.html          # HTML 진입점
e2e/
  ├── visual-smoke.spec.ts # Playwright 시각적 회귀 테스트
  └── __shots__/          # 시각적 회귀 스냅샷
```

## 배포

### 빌드 프로세스

```bash
npm run build
```

프로덕션 빌드:
- Android 7+ / iOS 16+ 호환성을 위해 ES2017 및 Safari 16+를 대상으로 함
- 모든 SDK 의존성 포함 (외부화되지 않음)
- `dist/` 디렉토리로 출력

### App-in-Toss 배포

1. **번들 빌드**
   ```bash
   npm run build
   npx ait build
   ```

2. **검토 제출**
   - 토스 개발자 콘솔 접속
   - 검토 흐름을 통해 빌드된 번들 업로드
   - 앱이 토스 가이드라인 준수 여부를 검토받습니다

3. **검토 기준**
   - 외부 도메인 이동 없음 (모든 흐름이 앱 내에서만 진행)
   - 프로덕션 빌드의 콘솔 에러 0개
   - 백엔드의 CORS 헤더 올바르게 설정
   - 연령 제한 준수 (19세 이상 사용자만)
   - 외부 분석 도구 없음 (SDK 분석만 사용)

## 라이선스

MIT
