# AGENTS.md

Real-time Charlotte, NC dashboard (weather, flights, traffic, alerts, stocks) built with React, TypeScript, and TanStack Query.

## Critical Rules

1. **Query keys are centralized** — Always use `src/utils/queryKeys.ts`, never inline strings
2. **API keys stay server-side** — Use Netlify functions for authenticated APIs, never expose keys in client code
3. **Ask before adding dependencies** — Prefer existing packages; use caret versions (e.g., `^1.2.3`)

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build (also runs typecheck)
npm test         # Run tests
```

## Before You Code

**Development workflow:** See [Development Guide](./docs/DEVELOPMENT.md) for quality checks and testing

| Task | Read First |
|------|------------|
| Adding/modifying React components | [React Conventions](./docs/CONVENTIONS_REACT.md) |
| Working with API data | [Data Fetching Patterns](./docs/CONVENTIONS_DATA_FETCHING.md) |
| Creating a new widget | [Widget Guide](./docs/GUIDE_WIDGETS.md) |
| Adding a new alert source | [Alert Sources Guide](./docs/ADDING_ALERT_SOURCES.md) |
| Integrating a new external API | [API Integration Guide](./docs/GUIDE_API_INTEGRATION.md) |
| Deploying or configuring env vars | [Deployment](./docs/DEPLOYMENT.md) |
| Map/tile layer changes | [Map Tiles](./docs/MAP_TILES.md) |

## After Making Changes

**IMPORTANT for AI Agents:** After making code changes, always run:

```bash
npm run check:fix
```

This command:
1. **Formats** code with Prettier
2. **Lints** with ESLint (auto-fixes issues)
3. **Type-checks** with TypeScript

**Do NOT run git commit.** The user will handle commits manually.