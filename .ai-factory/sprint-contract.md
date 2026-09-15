# Sprint Contract: 광고 배치·정책 정적 검사 + 최종 폴리시

## 만들 항목

1. **scripts/check-policy.mjs** — Node.js 정적 검사 스크립트
   - src/ 전체 소스 수집 후 정규식으로 위반 패턴 검사
   - window.open, window.location.href, HEX 색상, 설치 유도 문구, 구형 API, 금지 분석 SDK 검출

2. **src/__tests__/policy.test.ts** — vitest 정책 검사
   - scripts/check-policy.mjs 규칙을 TDD 테스트로 검증
   - 금지 문구·API 패턴 7~10개 테스트

3. **src/__tests__/adPlacement.test.tsx** — 광고 배치 검증
   - Pro 플랜 시 AdSlot/TossRewardAd 렌더 0건 확인
   - 커스텀 버튼·탭 터치 영역 44×44px 검증

## 사용 타입

- `@/types/plan.Plan` — 플랜 정보 (isPro 판정용)
- `@/api/contracts.AdPlacement` — 광고 배치 데이터 (테스트 픽스처)

## 검증 방법

1. `npm run check:policy` → scripts/check-policy.mjs 실행 (빌드 전 자동화 가능)
2. `npx vitest run src/__tests__/policy.test.ts` → 7~10개 TDD 테스트 통과
3. `npx vitest run src/__tests__/adPlacement.test.tsx` → Pro 플랜 AdSlot 0건 + 터치 영역 44px 확인

## 절대 금지

- ❌ App.tsx / main.tsx 수정
- ❌ scripts/check-policy.mjs에서 파일 생성/삭제
- ❌ 정책 검사 규칙을 code에 하드코딩 (mjs/ts에만 정의)
