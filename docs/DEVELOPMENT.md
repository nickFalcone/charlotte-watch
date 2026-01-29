# Development Workflow

This guide covers the development workflow and quality checks for the Charlotte Watch project.

## Quick Reference

```bash
# Development
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build locally

# Quality Checks (run before committing!)
npm run check:fix    # Format + lint with auto-fix + type-check (⭐ recommended)
npm run check        # Format + lint + type-check (read-only)

# Individual Commands
npm run format       # Auto-format code with Prettier
npm run lint:fix     # Auto-fix ESLint issues
npm run type-check   # Verify TypeScript compilation
```

## Development Workflow

### 1. Making Changes

1. Create/edit files as needed
2. Save your work
3. Dev server hot-reloads automatically

### 2. Quality Checks (After Making Changes)

**ALWAYS run quality checks after making changes:**

```bash
npm run check:fix
```

This command runs three checks in sequence:
1. **Prettier** — Auto-formats all code for consistency
2. **ESLint** — Lints and auto-fixes issues (unused vars, React hooks rules, etc.)
3. **TypeScript** — Verifies type safety and compilation

**Why this matters:**
- ✅ Prevents broken code from being committed
- ✅ Maintains consistent code style across the team
- ✅ Catches type errors early
- ✅ Ensures fast CI/CD pipeline (no formatting/linting failures)

### 3. If Checks Fail

**TypeScript Errors:**
- Fix the reported type errors
- Re-run `npm run type-check` to verify

**ESLint Errors (that auto-fix can't resolve):**
- Review the reported issues
- Fix manually (often requires code changes)
- Some rules are warnings and can be temporarily ignored with `// eslint-disable-next-line`

**Prettier Formatting:**
- Should auto-fix with `npm run format`
- If issues persist, check `.prettierrc` and `.prettierignore`

## Testing Changes

### Manual Testing

1. **Start dev server:** `npm run dev`
2. **Open browser:** http://localhost:5173
3. **Test your changes:** Verify functionality, check browser console for errors
4. **Check widgets:** Ensure all widgets load correctly

### Build Testing

Before major commits, verify production build works:

```bash
npm run build        # Creates dist/ folder
npm run preview      # Serves production build locally
```

## Git Workflow (For Human Developers)

**Note:** AI agents should NOT run git commands. Only humans commit code.

```bash
# 1. Make changes
# 2. Run quality checks
npm run check:fix

# 3. Review changes
git status
git diff

# 4. Stage changes
git add .

# 5. Commit with descriptive message
git commit -m "feat: add new weather widget metric"

# 6. Push to remote
git push
```

## Server-Side Caching

Pages Functions use **Cloudflare KV** (`CACHE` binding) to share responses across all clients, reducing upstream API calls and AI costs.

### What is cached

| Endpoint | Cache key | TTL | Notes |
|---|---|---|---|
| `/api/news-charlotte-parsed` | `news:parsed` | 12 hours | Parsed news events (AI pipeline) |
| `/api/summarize-alerts` | `summary:<hash>` | 15 minutes | Alert BLUF summary, keyed by alert set hash |
| `/api/cats-alerts` | `alerts:cats` | 15 minutes | CATS transit alerts |
| `/api/duke-outages` | `alerts:duke` | 15 minutes | Duke Energy outage data |
| `/api/here-flow` | `alerts:here` | 15 minutes | HERE traffic flow |
| `/api/faa-status` | `alerts:faa` | 15 minutes | FAA airport status |
| `/api/opensky-auth` | `alerts:opensky-auth` | 5 minutes | OpenSky auth token (short TTL) |
| `/api/opensky-states` | -- | Not cached | Real-time aircraft positions (15s polling) |
| `/api/finnhub-quote` | `stock:quote:<SYMBOL>` | 15 minutes | Stock quotes, per symbol |
| `/api/finnhub-profile` | `stock:profile:<SYMBOL>` | 24 hours | Company profiles, per symbol |

### Production setup

The KV namespace must be bound as `CACHE` in the Cloudflare Pages dashboard under **Settings > Bindings**. Without this binding, cache reads/writes will fail gracefully (requests still succeed, but every call hits upstream).

### Local development

The Vite dev plugins for `/api/news-charlotte-parsed` and `/api/summarize-alerts` use an in-memory `Map`-based cache with the same TTLs. Other alert endpoints are proxied directly in dev and are not cached locally.

## Common Issues

### "Module not found" after adding new files
- Restart dev server: `Ctrl+C` then `npm run dev`
- Clear Vite cache: `rm -rf node_modules/.vite`

### ESLint warnings about `.eslintignore`
- `.eslintignore` is deprecated in ESLint 9+
- All ignore patterns are now in `eslint.config.js`

### TypeScript errors in IDE but builds pass
- Restart TypeScript server in your IDE
- VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

### Hot reload not working
1. Check terminal for errors
2. Restart dev server
3. Hard refresh browser (`Ctrl+Shift+R`)

## IDE Setup

### VS Code (Recommended)

Install these extensions (see `.vscode/extensions.json`):
- ESLint
- Prettier
- TypeScript and JavaScript Language Features

**Settings:** Project includes `.vscode/settings.json` with:
- Format on save (Prettier)
- ESLint auto-fix on save
- TypeScript strict mode

### Cursor

Same extensions as VS Code. AGENTS.md provides AI-specific guidance.

## Performance Tips

### Fast Iteration
- Use `npm run dev` (with HMR) for rapid development
- Only run `npm run build` when testing production behavior

### Faster Type Checking
- IDE provides instant feedback (use it!)
- Only run `npm run type-check` before committing

### Skip Checks During Experimentation
- It's okay to skip checks during rapid prototyping
- **But always run before committing!**

## Production Build

The production build:
1. Type-checks with `tsc -b`
2. Bundles with Vite (minification, code splitting, tree shaking)
3. Outputs to `dist/` folder

Netlify runs this automatically on every push to `main`.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Environment variables
- Netlify configuration
- Function deployment
- Custom domain setup
