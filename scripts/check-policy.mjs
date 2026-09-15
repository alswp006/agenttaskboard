#!/usr/bin/env node
// 토스 검수 정책 정적 검사. 의존성 0(순수 node ESM).
//
//   node scripts/check-policy.mjs [rootDir]   — rootDir 생략 시 <cwd>/src
//   위반 0건 → exit 0, 1건 이상 → 위반 내역 출력 후 exit 1
//
// 모듈로 import하면 checkPolicy(rootDir)만 노출하고 CLI 블록(process.exit)은 실행하지 않는다.
// 규칙은 이 파일의 RULES 한 곳에만 정의한다 — src/test/policy.test.ts도 이것을 import해서 쓴다.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCAN_EXT = /\.(ts|tsx|js|jsx|mjs|css)$/;
const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);

/**
 * 테스트 파일은 규칙 위반을 **픽스처 문자열로 일부러** 담는다(예: '#3182F6', '앱 설치하세요').
 * 출시 번들에 들어가지 않으므로 검사 대상이 아니다. rootDir 기준 상대 경로로 판정한다.
 */
function isTestFile(rel) {
  const parts = rel.split(path.sep);
  if (parts.includes("__tests__") || parts[0] === "test") return true;
  const base = parts[parts.length - 1];
  return /\.(test|spec)\.[jt]sx?$/.test(base) || base.startsWith("__");
}

/** 규칙을 설명하는 주석이 규칙 위반으로 잡히지 않게 한다(forbidden-patterns.mjs와 같은 관례). */
function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("<!--");
}

const HEX_RE = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/;
const VAR_FALLBACK_RE = /var\(\s*--[\w-]+\s*,[^)]*\)/g;
const BANNED_ANALYTICS = [
  "mixpanel-browser",
  "amplitude-js",
  "@amplitude/analytics-browser",
  "react-ga",
  "react-ga4",
  "universal-analytics",
];
const BANNED_IMPORT_RE = new RegExp(
  `(?:from\\s*|import\\s*\\(?\\s*|require\\(\\s*)["'](?:${BANNED_ANALYTICS.map((s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")).join("|")})["']`,
);

export const RULES = [
  {
    id: "hex-color",
    message: "HEX 색상 하드코딩 — var(--tds-color-*)/var(--adaptive*) 사용(다크모드)",
    // `var(--x, #hex)` CSS 커스텀 프로퍼티 폴백은 정석이라 지우고 본다.
    test: (line) => HEX_RE.test(line.replace(VAR_FALLBACK_RE, "var(--x)")),
  },
  {
    id: "install-prompt",
    message: "앱 설치 유도 문구 금지",
    test: (line) => /설치하세요|다운로드|앱 설치|스토어에서/.test(line),
  },
  {
    id: "legacy-api",
    message: "Android 7 / iOS 16 WebView 미지원 API",
    test: (line) => /structuredClone\(|navigator\.clipboard|ResizeObserver\(|BroadcastChannel\(/.test(line),
  },
  {
    id: "banned-analytics",
    message: "외부 분석 SDK 금지 — @apps-in-toss/web-framework Analytics 사용",
    test: (line) => BANNED_IMPORT_RE.test(line),
  },
  {
    id: "external-nav",
    message: "외부 도메인 이탈 금지 — window.open / 외부 URL location 이동",
    test: (line) =>
      /\bwindow\.open\s*\(/.test(line) ||
      /location\.href\s*=(?!=)\s*["'`]https?:/.test(line) ||
      /location\.(?:assign|replace)\s*\(\s*["'`]https?:/.test(line),
  },
];

function collectFiles(rootDir) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIRS.has(name)) continue;
      const full = path.join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (SCAN_EXT.test(name) && !isTestFile(path.relative(rootDir, full))) out.push(full);
    }
  };
  walk(rootDir);
  return out.sort();
}

/** @returns {{ violations: Array<{rule: string, file: string, line: number, text: string}>, ok: boolean }} */
export function checkPolicy(rootDir) {
  const violations = [];
  for (const file of collectFiles(rootDir)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      for (const rule of RULES) {
        if (rule.test(line)) {
          violations.push({ rule: rule.id, file, line: i + 1, text: line.trim().slice(0, 120) });
        }
      }
    });
  }
  return { violations, ok: violations.length === 0 };
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isCli) {
  const rootDir = path.resolve(process.argv[2] ?? path.join(process.cwd(), "src"));
  const { violations, ok } = checkPolicy(rootDir);
  if (ok) {
    console.log(`policy: 위반 0건 (${rootDir})`);
    process.exit(0);
  }
  const messages = Object.fromEntries(RULES.map((r) => [r.id, r.message]));
  console.log(`policy: 위반 ${violations.length}건 (${rootDir})`);
  for (const v of violations) {
    console.log(`  [${v.rule}] ${path.relative(process.cwd(), v.file)}:${v.line}  ${v.text}`);
    console.log(`      → ${messages[v.rule]}`);
  }
  process.exit(1);
}
