import { test, expect } from '@playwright/test';

// nightcrew Sentinel smoke 팩 — Factory 산출(§7.1)
// 핵심 막: 드래그&드롭 업무 플로우 빌더(트리거→AI처리→액션 3단계 시각화), 한국 서비스 네이티브 연동(카카오톡 발송, 네이버 캘린더, 구글 스프레드시트), 자연어로 플로우 생성('매일 오전 9시 뉴스 요약해서 슬랙에 보내줘' 입력 → 자동 설정), 실행 로그 및 에러 알림 대시보드, 커뮤니티 플로우 템플릿 공유 마켓(검증된 자동화 레시피 제공)
// 토스 브릿지 의존 구간(로그인·결제)은 외부 재현 불가 — 화면 도달 확인까지만.
const ROUTES = ["/","/Builder","/FlowDetail","/Generate","/GenerateResult"];
// WebView 밖 실행에서만 나는 콘솔 에러는 무시(앱인토스 관례 — toss visual-smoke 템플릿 계승)
const IGNORED_CONSOLE = [/SafeAreaInsets/i, /granite/i, /apps-in-toss/i];

for (const route of ROUTES) {
  test(`smoke: ${route} 렌더링과 콘솔 에러 없음`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !IGNORED_CONSOLE.some((re) => re.test(msg.text()))) errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(route);
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
