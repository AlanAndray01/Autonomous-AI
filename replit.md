# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Gemini 2.5 Flash (via Replit AI Integrations)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### AI Assistant (Expo mobile app)

- **Directory**: `artifacts/ai-assistant/`
- **Preview path**: `/`
- **Type**: Expo React Native (mobile + web preview)
- **Purpose**: Autonomous Android AI voice assistant companion app

#### Features:
- Voice command interface with animated microphone button
- Gemini AI command parser (converts voice → structured JSON action plan)
- Multi-step action execution visualization
- Command history with session details
- Voice profile enrollment + voice lock security system
- Architecture reference with Android code snippets
- App shortcuts (YouTube, Spotify, Settings, etc.)

#### Screens:
- `app/(tabs)/index.tsx` — Main voice assistant interface
- `app/(tabs)/history.tsx` — Command history browser
- `app/(tabs)/security.tsx` — Voice profile enrollment + voice lock
- `app/(tabs)/architecture.tsx` — Android architecture guide + APK build steps

#### Key Components:
- `components/VoicePulse.tsx` — Animated microphone orb with pulse rings
- `components/WaveformBar.tsx` — Audio waveform visualization
- `components/ActionCard.tsx` — Action plan step card
- `components/AppShortcut.tsx` — Quick-launch app button
- `components/CommandHistoryItem.tsx` — History list item
- `components/GlowBackground.tsx` — Ambient glow atmosphere

#### Services:
- `services/geminiService.ts` — Command parse API calls + formatting helpers
- `context/AssistantContext.tsx` — App-wide state (status, history, voice profile)

### API Server

- **Directory**: `artifacts/api-server/`
- **Routes**: `/api/assistant/parse` — Gemini-powered command parser

#### Environment Variables (auto-set):
- `AI_INTEGRATIONS_GEMINI_BASE_URL` — Replit AI proxy URL
- `AI_INTEGRATIONS_GEMINI_API_KEY` — Replit AI proxy key
