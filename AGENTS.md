# AGENTS.md

Real-time Charlotte, NC dashboard (weather, flights, traffic, alerts, stocks) built with React, TypeScript, and TanStack Query.

## Critical Rules

1. **Query keys are centralized** — Always use `src/utils/queryKeys.ts`, never inline strings
2. **API keys stay server-side** — Use Netlify functions for authenticated APIs, never expose keys in client code
3. **Ask before adding dependencies** — Prefer existing packages; use caret versions (e.g., `^1.2.3`)
4. **Ask before editing CSP** — When adding a new external origin (API, script, or image host), `public/_headers` may need to be updated. **Ask the user before editing** `public/_headers`. See [CSP and security headers](./docs/CSP_AND_HEADERS.md).
5. **No emojis** — Never write emojis in code, markdown, comments, UI strings, or anywhere in the codebase.
6. **Do not create or modify SVG files** — Unless the user explicitly instructs you to, do not create, edit, or alter any `.svg` files (e.g. in `src/assets/icons/`). Use existing SVGs as-is; if an icon is needed, ask the user or suggest they add one.

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
| Adding external origins (APIs, scripts, images) or changing CSP | [CSP and security headers](./docs/CSP_AND_HEADERS.md) |

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