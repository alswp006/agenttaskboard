# AgentTaskBoard

앱인토스 (Vite + React + TDS) AI 에이전트에게 업무를 위임하는 것이 일상이 된 2026년, 비개발자 직장인이 복잡한 코딩 없이 AI 에이전트 업무 파이프라인을 시각적으로 설계·실행·모니터링하는 노코드 오케스트레이션 툴 Cursor·Claude Agent·n8n 등 AI 에이전트 툴이 쏟아지지만, 비개발자가 쓰기엔 여전히 코드·API 이해가 필요함. '엑셀 데이터 정리 → 요약 리포트 → 이메일 발송' 같은 반복 업무를 AI에게 맡기고 싶은데 자동화 설정이 너무 복잡. 기존 RPA 툴(Zapier 등)은 영어에 비쌈.

## Tech Stack

- React 18.0.0
- TypeScript
- Vitest

## Routes

| Path | Description |
|------|-------------|
| `/Builder` | Builder |
| `/FlowDetail` | FlowDetail |
| `/Generate` | Generate |
| `/GenerateResult` | GenerateResult |
| `/Home` | Home |
| `/Plan` | Plan |
| `/RunDetail.test` | RunDetailtest |
| `/RunDetail` | RunDetail |
| `/Runs` | Runs |
| `/TemplateDetail` | TemplateDetail |
| `/Templates.test` | Templatestest |
| `/Templates` | Templates |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Development

```bash
pnpm typecheck    # Type checking
pnpm test         # Run tests
pnpm build        # Production build
```

## Design Documents

See `.ai-factory/` directory for full design artifacts:
- `prd.md` — Product Requirements Document
- `spec.md` — Technical Specification
- `task.md` — Epic/Task Breakdown

---
Built with [AI Factory](https://github.com/alswp006/ai-factory) · Last synced: 2026-09-16
