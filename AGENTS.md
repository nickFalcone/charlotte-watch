# AGENTS.md

Real-time Charlotte, NC dashboard (weather, flights, traffic, alerts, stocks) built with React, TypeScript, and TanStack Query.

## About This File

This file provides instructions for AI coding agents working on the Charlotte Monitor dashboard.

**Important:** `CLAUDE.md` is a symlink to this file. **NEVER edit CLAUDE.md directly** — only modify `AGENTS.md` when explicitly instructed by the user. Both files show identical content, but all edits must go through `AGENTS.md`.

## Quick Reference

```bash
npm run dev          # Start dev server
npm run build        # Production build (also runs typecheck)
npm test             # Run tests
npm run check:fix    # Format, lint, and typecheck (run after every change)
```

**Most Important Rules:**
1. Read `src/utils/queryKeys.ts` for all query keys - never use inline strings
2. Never expose API keys in client code - use Cloudflare Functions
3. Ask before adding dependencies or editing CSP
4. Run `npm run check:fix` after every code change
5. Never create git commits unless explicitly requested

## Critical Rules

### 1. Query Keys Are Centralized
**Always use `src/utils/queryKeys.ts`, never inline strings**

```typescript
// ❌ Bad
useQuery(['weather'], fetchWeather)

// ✅ Good
useQuery(queryKeys.weather.current, fetchWeather)
```

### 2. API Keys Stay Server-Side
**Use Cloudflare Functions for authenticated APIs, never expose keys in client code**

All API keys must be in Cloudflare environment variables and accessed through serverless functions in `functions/`. Never put API keys in client-side code, even in `.env` files.

### 3. Ask Before Adding Dependencies
**Prefer existing packages; use caret versions (e.g., `^1.2.3`)**

- **Adding new packages:** Always ask the user first
- **Updating existing packages:** Minor/patch updates are OK, ask before major version bumps
- **Version format:** Always use caret (`^1.2.3`) not exact versions

### 4. Ask Before Editing CSP
**When adding a new external origin (API or image host), `public/_headers` may need updating**

Before modifying `public/_headers`, **always ask the user**. Adding any new external origin (API endpoint, image host, script source, tile server) requires CSP changes. See [CSP and security headers](./docs/CSP_AND_HEADERS.md).

### 5. No Emojis in Code or UI
**Use SVG icons or plain text instead**

Never write emojis in:
- Code (comments, strings, JSX)
- Markdown files
- UI text or labels
- Accessibility labels

For visual elements, use SVG icons from `src/assets/icons/`. For accessibility labels, use plain text descriptions (e.g., "Warning" not "⚠️").

### 6. Do Not Create or Modify SVG Files
**Unless the user explicitly instructs you to**

Do not create, edit, or alter any `.svg` files in `src/assets/icons/`. Use existing SVGs as-is. If an icon is needed, ask the user or suggest they add one. See [Icons](./docs/ICONS.md).

### 7. Accessibility (WCAG 2.2 AAA)
**New or changed UI must meet WCAG 2.2 AAA standards**

All UI changes must include:
- Text alternatives for images/icons (alt text, aria-label)
- Named controls (descriptive button/link text, not "click here")
- Keyboard access (tab navigation, enter/space activation)
- Visible focus indicators
- Adequate target size (44×44px minimum)
- No emojis in UI text

See [Accessibility](./docs/ACCESSIBILITY.md) for full requirements.

### 8. No Git Commits
**Do NOT create commits, branches, or PRs unless explicitly requested**

The user manages version control manually. After making changes:
- Do NOT run `git add`, `git commit`, or `git push`
- Do NOT create branches or pull requests
- DO run `npm run check:fix` to validate your changes

### 9. Use Plan Mode for Complex Changes
**For features touching 3+ files or requiring architectural decisions**

Before implementing changes that:
- Modify 3 or more files
- Require architectural decisions
- Add new features (not bug fixes)
- Could be implemented multiple ways

Propose a plan first so the user can approve the approach.

## Project Structure

```
charlotte-monitor/
├── src/
│   ├── components/
│   │   ├── widgets/          # Dashboard widgets (Weather, Flights, etc.)
│   │   └── ...               # Shared UI components
│   ├── hooks/                # Custom React hooks
│   ├── services/             # API client functions
│   ├── utils/
│   │   └── queryKeys.ts      # Centralized TanStack Query keys
│   └── assets/
│       └── icons/            # SVG icons (do not modify)
├── functions/                # Cloudflare Functions (serverless API proxies)
├── public/
│   └── _headers              # CSP and security headers
└── docs/                     # Documentation
```

## Development Workflow

### Before You Code

Read the relevant guide first:

| Task | Read First |
|------|------------|
| Accessibility (WCAG 2.2 AAA) | [Accessibility](./docs/ACCESSIBILITY.md) |
| Adding/modifying React components | [React Conventions](./docs/CONVENTIONS_REACT.md) |
| Working with API data | [Data Fetching Patterns](./docs/CONVENTIONS_DATA_FETCHING.md) |
| Creating a new widget | [Widget Guide](./docs/GUIDE_WIDGETS.md) |
| Adding a new alert source | [Alert Sources Guide](./docs/ADDING_ALERT_SOURCES.md) |
| Integrating a new external API | [API Integration Guide](./docs/GUIDE_API_INTEGRATION.md) |
| Deploying or configuring env vars | [Deployment](./docs/DEPLOYMENT.md) |
| Map/tile layer changes | [Map Tiles](./docs/MAP_TILES.md) |
| Using or adding icons | [Icons](./docs/ICONS.md) |
| Adding external origins or changing CSP | [CSP and security headers](./docs/CSP_AND_HEADERS.md) |

See [Development Guide](./docs/DEVELOPMENT.md) for quality checks and testing.

### After Making Changes

**Required after every code change:**

```bash
npm run check:fix
```

This command:
1. Formats code with Prettier
2. Lints with ESLint (auto-fixes issues)
3. Type-checks with TypeScript

**If you modified component logic or hooks:**

```bash
npm test
```

If tests fail, fix them before marking your work complete. Do not ignore test failures.

## What to Ask vs. What to Do

### Always Ask First

- Adding new npm packages
- Modifying `public/_headers` (CSP)
- Creating git commits, branches, or PRs
- Adding new external API integrations
- Changing build configuration
- Modifying SVG files
- Adding new environment variables

### You Can Proceed Autonomously

- Bug fixes in existing code
- Updating existing dependencies (minor/patch versions)
- Adding tests for existing code
- Refactoring within a single component (same functionality)
- Fixing TypeScript/ESLint errors
- Updating documentation (except CLAUDE.md)

### When in Doubt

Ask the user. It's better to clarify requirements than to make assumptions.

## Common Patterns

### Adding a Query

1. Add key to `src/utils/queryKeys.ts`
2. Create service function in `src/services/`
3. Use in component with `useQuery(queryKeys.yourKey, serviceFunction)`

### Adding a Widget

1. Read [Widget Guide](./docs/GUIDE_WIDGETS.md)
2. Create component in `src/components/widgets/`
3. Create matching `.styles.ts` file
4. Add to grid in `App.tsx`
5. Add tests

### Handling Errors

- Use TanStack Query's built-in error handling
- Display user-friendly error messages
- Log errors to console in development
- Never expose API keys or sensitive data in error messages

## Performance Considerations

- Lazy load widgets when possible
- Use React.memo() for expensive components
- Debounce rapid API calls
- Keep bundle size minimal (check with `npm run build`)

## Getting Help

If you're unsure about:
- Architecture decisions → Ask the user
- Which pattern to follow → Check `docs/`
- Whether to add a dependency → Ask the user
- CSP requirements → Read `docs/CSP_AND_HEADERS.md` first, then ask

---

**Remember:** This is a production dashboard. Prioritize stability, accessibility, and security over new features.
