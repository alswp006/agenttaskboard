🇺🇸 [한국어](./README.ko.md)

# AgentTaskBoard — AI-powered workflow automation for Toss

AgentTaskBoard is a mini-app for the Toss platform that enables users to create, manage, and execute AI-generated workflows. Build custom automation flows, generate them from natural language, save templates, and track execution logs—all within a sleek mobile-first interface.

## Features

- 🔄 **Flow Builder** — Drag-and-drop interface to create automation workflows with multiple action types
- 🤖 **AI Generation** — Generate complete workflows from natural language descriptions using generative AI
- 📋 **Template Management** — Save and reuse workflow templates with 6 bundled templates included
- 📊 **Execution Logs** — Track up to 200 recent workflow executions with detailed results and status
- 💳 **Flexible Pricing** — Free and paid plans with monthly execution quotas and quota tracking
- 📈 **Usage Dashboard** — Monitor execution quota, storage usage, and plan status
- 🎯 **Run Details** — View detailed results and output from individual executions

## Tech Stack

- **Framework** — Vite 6.3 + React 18 + TypeScript 5.8
- **Routing** — React Router 7.5
- **UI Components** — Toss Design System (@toss/tds-mobile)
- **App Integration** — App-in-Toss SDK (@apps-in-toss/web-framework)
- **Styling** — Emotion (@emotion/react, @emotion/styled)
- **State Management** — React Context API + localStorage
- **Testing** — Vitest + @testing-library/react + Playwright (visual)
- **Icons** — lucide-react

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Building for Production

```bash
npm run build
```

This generates a production-optimized bundle in `dist/` ready for deployment.

### Toss Deployment

To build and prepare for App-in-Toss deployment:

```bash
npm run build
npx ait build
```

Then submit the build through the Toss developer console for review.

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL for backend API server | Yes |
| `VITE_TOSS_AD_GROUP_ID` | Toss banner ad group ID | No |
| `VITE_TOSS_AD_SLOT_ID` | Toss reward ad slot ID | No |

Environment variables are loaded from `.env` (git-ignored) or `.env.local`.

## Project Structure

```
src/
  ├── pages/              # Page components (Home, Generate, Builder, etc.)
  ├── components/         # Reusable UI components (Card, StateView, FloatingTabBar, etc.)
  ├── hooks/              # Custom hooks (AppStateContext, ToastProvider)
  ├── lib/                # Utilities, types, and storage helpers
  │   ├── types.ts        # Shared domain types and RouteState contracts
  │   ├── format.ts       # Formatting utilities
  │   ├── errors.ts       # Error codes and messages
  │   └── storage.ts      # localStorage helpers
  ├── __tests__/          # Vitest unit and integration tests
  ├── App.tsx             # Main app with routing and global providers
  └── main.tsx            # React root and TDS provider setup
public/
  └── index.html          # HTML entry point
e2e/
  ├── visual-smoke.spec.ts # Playwright visual regression tests
  └── __shots__/          # Visual regression snapshots
```

## Deployment

### Build Process

```bash
npm run build
```

The production build:
- Targets ES2017 and Safari 16+ for Android 7+ / iOS 16+ compatibility
- Includes all SDK dependencies (never externalized)
- Outputs to `dist/` directory

### App-in-Toss Deployment

1. **Build the bundle**
   ```bash
   npm run build
   npx ait build
   ```

2. **Submit for review**
   - Access the Toss developer console
   - Upload the built bundle through the review flow
   - The app will be reviewed for compliance with Toss guidelines

3. **Review criteria**
   - No external domain navigation (all flows stay within the app)
   - Zero console errors in production build
   - CORS headers properly configured on backend
   - Compliance with age restrictions (19+ users only)
   - No external analytics tools (SDK analytics only)

## License

MIT
