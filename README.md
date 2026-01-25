# charlotte-watch
What's going on, Charlotte?

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
npm install
```

### Development Scripts
```bash
# Start development server
npm run dev

# Start with Cloudflare Pages Functions (for AI summaries, API proxies)
npm run dev:pages

# Build for production
npm run build

# Preview production build
npm run preview

# Quality checks (recommended before committing)
npm run check:fix    # Format + lint with auto-fix + type-check
npm run check        # Format + lint + type-check (read-only)

# Individual commands
npm run type-check   # Type checking
npm run lint         # Linting
npm run lint:fix     # Auto-fix linting issues
npm run format       # Format code
npm run format:check # Check code formatting
```

### Development Workflow

**Quick start (no AI features):**
1. `npm install`
2. `npm run dev`
3. Open http://localhost:5173

**Full development (with AI summaries and API functions):**
1. `npm install`
2. Copy `.env.example` to `.dev.vars` and add API keys (see below)
3. `npm run dev:pages`
4. Open http://localhost:8788

**Before committing:**
```bash
npm run check:fix    # Auto-format, lint, and type-check
```

### Environment Variables

For local development with API functions (AI summaries, stock quotes, etc.), create `.dev.vars`:

```bash
# .dev.vars (Wrangler local development)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here

# Alternative: Anthropic API
# AI_PROVIDER=anthropic
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# Other optional APIs (see .env.example for full list)
```

**Note:** API functions (including AI summarization) only work with `npm run dev:pages` or in production. Regular `npm run dev` will show alerts without AI summaries.

**Full development guide:** See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)

### Code Quality
This project uses:
- **ESLint** for JavaScript/TypeScript linting
- **Prettier** for code formatting
- **TypeScript** for type checking

### VS Code Setup
The project includes VS Code settings and recommended extensions:
- Auto-format on save
- ESLint auto-fix on save
- Recommended extensions for React/TypeScript development

## Project Structure
```
src/
├── components/
│   ├── widgets/          # Dashboard widgets
│   └── Widget/           # Widget wrapper components
├── types/                # TypeScript type definitions
├── utils/                # Utility functions and API clients
└── stores/               # State management
functions/
├── api/                  # Cloudflare Pages Functions (API routes)
└── _lib/                 # Shared utilities for functions
```

### SVG Icon Styling

The project uses Material Design icons from Google Fonts. Most icons have light fills (`#e3e3e3`) for dark mode visibility.

**For light-fill SVGs** (like those from Material Design), use this filter pattern:

```typescript
filter: ${props =>
  props.theme.name === 'dark'
    ? 'brightness(0) invert(1)'  // Dark mode: black → white
    : 'brightness(0)'             // Light mode: any color → black
};
```

**For black SVGs** (`#000`), use:

```typescript
filter: ${props =>
  props.theme.name === 'dark'
    ? 'invert(1) brightness(0.9)'  // Dark mode: black → light gray
    : 'none'                        // Light mode: keep black
};
```

See `ThemeToggle.tsx` and `Dashboard.styles.ts` (`CrownIcon`, `EmptyStateIcon`) for examples.

## Deploying to Cloudflare Pages via GitHub Actions

The project deploys automatically via GitHub Actions when you push to `master` (production) or open a pull request (preview).

### Required GitHub Secrets

Set these in your repository under **Settings > Secrets and variables > Actions**:

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages edit permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

### Required GitHub Variables (or Secrets)

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_PAGES_PROJECT` | Name of your Cloudflare Pages project |

### Cloudflare Pages Setup

1. Create a new Pages project in Cloudflare dashboard (Direct Upload method)
2. Note the project name for the `CLOUDFLARE_PAGES_PROJECT` variable
3. Set environment variables in **Pages > Your Project > Settings > Environment variables**:
   - `OPENSKY_CLIENT_ID`
   - `OPENSKY_CLIENT_SECRET`
   - `FINNHUB_API_KEY`
   - `AI_PROVIDER` (openai or anthropic)
   - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
   - Other API keys as needed (see `.env.example`)

### Local Development with Pages Functions

```bash
# Build and serve with Wrangler (includes API functions)
npm run dev:pages

# Open http://localhost:8788
```

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed deployment instructions.
