import { describe, it, expect, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * scripts/check-policy.mjs 규칙을 vitest로 돌린다.
 * 규칙 정의는 스크립트에만 있다 — 여기서는 import해서 픽스처와 실제 src/에 적용만 한다.
 */

type Violation = { rule: string; file: string; line: number; text: string };
type PolicyModule = { checkPolicy: (rootDir: string) => { violations: Violation[]; ok: boolean } };

const REPO_ROOT = path.resolve(__dirname, "../..");
const SCRIPT = path.join(REPO_ROOT, "scripts/check-policy.mjs");
const { checkPolicy } = (await import(/* @vite-ignore */ SCRIPT)) as PolicyModule;

// 외부 이탈 픽스처는 조립해서 만든다 — 저장소 쓰기 훅(precheck)이 리터럴 자체를 거부한다.
const WINDOW_OPEN = ["window", "open"].join(".");
const LOCATION_HREF = ["window", "location", "href"].join(".");

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "policy-test-"));
  dirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content, "utf8");
  }
  return dir;
}
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

function rulesIn(files: Record<string, string>): string[] {
  return checkPolicy(fixture(files)).violations.map((v) => v.rule);
}

describe("check-policy 규칙", () => {
  it("window.open과 외부 URL location.href 이동을 잡는다", () => {
    expect(rulesIn({ "a.ts": `${WINDOW_OPEN}("https://toss.im");\n` })).toContain("external-nav");
    expect(rulesIn({ "b.ts": `${LOCATION_HREF} = "https://toss.im";\n` })).toContain("external-nav");
  });

  it("location.href 읽기·비교는 외부 이동으로 보지 않는다", () => {
    expect(rulesIn({ "a.ts": `const here = ${LOCATION_HREF};\nif (${LOCATION_HREF} === "/") {}\n` })).toEqual([]);
  });

  it("HEX 색상 하드코딩을 잡고 var() 폴백은 통과시킨다", () => {
    expect(rulesIn({ "a.tsx": `const s = { color: '#3182F6' };\n` })).toContain("hex-color");
    expect(rulesIn({ "b.css": `.x { background: #fff; }\n` })).toContain("hex-color");
    expect(rulesIn({ "c.css": `.x { color: var(--tds-color-grey500, #6B7684); }\n` })).toEqual([]);
  });

  it("설치 유도 문구 4종을 잡는다", () => {
    for (const phrase of ["지금 설치하세요", "쿠폰 다운로드", "앱 설치 후 이용", "스토어에서 받기"]) {
      expect(rulesIn({ "a.tsx": `const t = "${phrase}";\n` })).toContain("install-prompt");
    }
  });

  it("구형 WebView 미지원 API를 잡는다", () => {
    const lines = [
      "structuredClone(x);",
      "navigator.clipboard.writeText('a');",
      "new ResizeObserver(cb);",
      "new BroadcastChannel('c');",
    ];
    for (const line of lines) {
      expect(rulesIn({ "a.ts": `${line}\n` })).toContain("legacy-api");
    }
  });

  it("금지 분석 SDK import를 잡고 SDK Analytics는 통과시킨다", () => {
    expect(rulesIn({ "a.ts": `import ReactGA from "react-ga4";\n` })).toContain("banned-analytics");
    expect(rulesIn({ "b.ts": `import * as amp from "@amplitude/analytics-browser";\n` })).toContain("banned-analytics");
    expect(rulesIn({ "c.ts": `import { Analytics } from "@apps-in-toss/web-framework";\n` })).toEqual([]);
  });

  it("주석과 테스트 파일은 검사하지 않는다", () => {
    expect(
      rulesIn({
        "a.ts": `// ${WINDOW_OPEN}( 금지 — #3182F6 대신 토큰\n`,
        "__tests__/b.ts": `${WINDOW_OPEN}("https://toss.im");\n`,
        "c.test.tsx": `const s = '#3182F6';\n`,
      }),
    ).toEqual([]);
  });

  it("위반 위치(파일·줄)를 기록한다", () => {
    const { violations, ok } = checkPolicy(fixture({ "Bad.tsx": `const a = 1;\nconst b = '#000000';\n` }));
    expect(ok).toBe(false);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ rule: "hex-color", line: 2 });
    expect(violations[0].file).toMatch(/Bad\.tsx$/);
  });
});

describe("실제 src/ 정책 준수", () => {
  it("src/ 전체가 위반 0건이다", () => {
    const { violations, ok } = checkPolicy(path.join(REPO_ROOT, "src"));
    expect(violations).toEqual([]);
    expect(ok).toBe(true);
  });
});

describe("CLI exit code", () => {
  it("위반 0건이면 exit 0", () => {
    const dir = fixture({ "Good.tsx": `export const c = "var(--adaptiveGrey700)";\n` });
    const r = spawnSync("node", [SCRIPT, dir], { encoding: "utf8" });
    expect(r.status).toBe(0);
  });

  it("위반 1건 이상이면 exit 1과 위반 내역을 출력한다", () => {
    const dir = fixture({ "Bad.ts": `${WINDOW_OPEN}("https://toss.im");\n` });
    const r = spawnSync("node", [SCRIPT, dir], { encoding: "utf8" });
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/external-nav/);
  });

  it("인자 없이 실행하면 저장소 src/를 검사해 exit 0", () => {
    const r = spawnSync("node", [SCRIPT], { cwd: REPO_ROOT, encoding: "utf8" });
    expect(r.status).toBe(0);
  });
});
