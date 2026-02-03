# Charlotte Watch

**Real-time dashboard for Charlotte, NC metro area**

Monitor weather, flight delays, traffic, power outages, transit alerts, and market updates—all in one place.

[Live Demo](https://charlotte-watch.pages.dev) (if deployed)

## Table of Contents

- [What is Charlotte Watch?](#what-is-charlotte-watch)
- [Screenshots](#screenshots)
- [Features](#features)
- [For Developers](#for-developers)
  - [Quick Start](#quick-start)
  - [Environment Variables](#environment-variables)
  - [Project Structure](#project-structure)
  - [Contributing](#contributing)
- [Deployment](#deployment)

## What is Charlotte Watch?

Charlotte Watch is a real-time monitoring dashboard built for residents of the Charlotte, NC metro area. It aggregates critical information from multiple sources into a single, easy-to-read interface:

- **Weather**: Current conditions, radar, and National Weather Service alerts
- **Aviation**: CLT airport delays, ground stops, and FAA advisories
- **Alerts**: AI-summarized BLUF (Bottom Line Up Front) summary of all active alerts
- **Traffic**: Real-time congestion, construction, and incidents from NCDOT
- **Transit**: CATS bus and rail service disruptions
- **Power**: Duke Energy outage reports
- **Markets**: Real-time stock quotes for major indices

Built with React, TypeScript, and TanStack Query. Deployed on Cloudflare Pages with serverless functions for API proxies and AI-powered alert summarization.

## Screenshots

<!-- Add screenshots here -->
_Screenshots coming soon_

## Features

- Real-time data from official sources (NWS, FAA, NCDOT, Duke Energy, CATS)
- AI-powered alert summaries using OpenAI or Anthropic
- Dark/light theme with persistent preferences
- Responsive widget-based layout
- Privacy-focused: no tracking, no ads, no user data collection
- Fast: Cloudflare CDN + edge caching + optimized React rendering

## Why Charlotte Watch?

Instead of checking multiple websites and apps for weather, traffic, flight delays, and transit alerts, Charlotte Watch consolidates everything into one dashboard. The AI-powered BLUF (Bottom Line Up Front) summary gives you the most critical information first, so you can make informed decisions quickly.

Perfect for:
- Daily commuters checking traffic and transit
- Travelers monitoring CLT airport delays
- Residents tracking severe weather and power outages
- Anyone who wants a quick overview of what's happening in Charlotte

---

## For Developers

### Quick Start

**Option 1: Basic development (no AI features)**
```bash
npm install
npm run dev
# Open http://localhost:5173
```

**Option 2: Full development (with AI summaries and API functions)**
```bash
npm install
cp .env.example .dev.vars  # Then add your API keys
npm run dev:pages
# Open http://localhost:8788
```

### Prerequisites
- Node.js 18+
- npm (or yarn/pnpm)
- (Optional) API keys for AI summaries and other features

### Available Scripts
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

**Before committing, always run:**
```bash
npm run check:fix    # Auto-format, lint, and type-check
```

### Environment Variables

Most features work without API keys (weather, traffic, transit alerts display raw data). API keys are **only required** for:

- **AI alert summaries** (OpenAI or Anthropic)
- **Stock quotes** (Finnhub)
- **Flight tracking** (OpenSky Network - optional credentials for higher rate limits)

#### Local Development Setup

Create `.dev.vars` in the project root (used by Wrangler for local development):

```bash
# Required for AI summaries
AI_PROVIDER=openai                    # or "anthropic"
OPENAI_API_KEY=sk-your-key-here      # if using OpenAI
# ANTHROPIC_API_KEY=sk-ant-...       # if using Anthropic

# Required for stock quotes
FINNHUB_API_KEY=your-finnhub-key

# Optional: OpenSky Network credentials (higher rate limits)
OPENSKY_CLIENT_ID=your-username
OPENSKY_CLIENT_SECRET=your-password
```

See `.env.example` for a complete list of available environment variables.

#### Where to Get API Keys

| Service | Purpose | Free Tier | Sign Up |
|---------|---------|-----------|---------|
| OpenAI | AI alert summaries | Yes (limited) | [platform.openai.com](https://platform.openai.com) |
| Anthropic | AI alert summaries | Yes (limited) | [console.anthropic.com](https://console.anthropic.com) |
| Finnhub | Stock quotes | Yes | [finnhub.io](https://finnhub.io) |
| OpenSky Network | Flight tracking | Yes (anonymous), better with account | [opensky-network.org](https://opensky-network.org) |

**Note:** API functions only work with `npm run dev:pages` (uses Wrangler) or in production. Regular `npm run dev` will show raw alerts without AI summaries.

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

### Project Structure

```
charlotte-watch/
├── src/
│   ├── components/
│   │   ├── widgets/          # Dashboard widgets (Weather, Flights, Alerts, etc.)
│   │   └── Widget/           # Widget wrapper components
│   ├── services/             # API client functions
│   ├── hooks/                # Custom React hooks
│   ├── utils/                # Utility functions (including queryKeys.ts)
│   ├── types/                # TypeScript type definitions
│   ├── stores/               # State management
│   ├── prompts/              # AI prompts (BLUF summary, etc.)
│   └── assets/               # Icons and static assets
├── functions/                # Cloudflare Pages Functions (serverless API)
│   ├── api/                  # API routes (/api/*)
│   └── _lib/                 # Shared utilities for functions
├── docs/                     # Documentation
│   ├── DEVELOPMENT.md        # Full development guide
│   ├── DEPLOYMENT.md         # Deployment instructions
│   ├── CONVENTIONS_*.md      # Coding conventions
│   └── GUIDE_*.md            # Feature implementation guides
└── public/
    └── _headers              # CSP and security headers
```

### Architecture Overview

**Frontend:**
- React 18 with TypeScript
- TanStack Query for data fetching and caching
- Styled Components for styling
- Vite for build tooling

**Backend:**
- Cloudflare Pages Functions (serverless, edge-deployed)
- API proxies to avoid CORS and keep API keys secure
- AI summarization using OpenAI or Anthropic APIs

**Data Sources:**
- National Weather Service (NWS) - Weather alerts and forecasts
- FAA - Flight delays and ground stops
- NCDOT - Traffic and construction
- Duke Energy - Power outages
- CATS (Charlotte Area Transit) - Transit alerts
- HERE Maps - Real-time traffic flow
- Finnhub - Stock market data

**Key Patterns:**
- Centralized query keys (`src/utils/queryKeys.ts`)
- Widget-based architecture for easy extensibility
- Serverless functions for API key security
- CSP-compliant external resource loading

### Contributing

Contributions are welcome! Please:

1. Read [AGENTS.md](./AGENTS.md) (symlinked as CLAUDE.md) for coding conventions
2. Run `npm run check:fix` before committing
3. Write tests for new features
4. Follow existing patterns (see `docs/CONVENTIONS_*.md`)
5. Ask before adding new dependencies or modifying CSP headers

**For AI coding agents:** This project includes detailed instructions in [AGENTS.md](./AGENTS.md) covering query keys, API patterns, accessibility requirements (WCAG 2.2 AAA), and more.

### Testing

```bash
npm test              # Run all tests once
npm run test:watch    # Run tests in watch mode
```

Tests are required for CI. See [docs/TESTING.md](./docs/TESTING.md) for conventions.

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

## Deployment

The project deploys automatically via GitHub Actions on push to `master` (production) or pull requests (preview).

**Quick deployment checklist:**

1. Create Cloudflare Pages project (Direct Upload method)
2. Set GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT`
3. Set environment variables in Cloudflare Pages dashboard (same keys as `.dev.vars`)
4. Push to `master` or open a PR

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed instructions.

---

## License

MIT (or specify your license)

## Acknowledgments

- Weather data: [National Weather Service](https://weather.gov)
- Flight data: [FAA](https://faa.gov), [OpenSky Network](https://opensky-network.org)
- Traffic data: [NCDOT](https://ncdot.gov), [HERE Technologies](https://here.com)
- Transit data: [CATS (Charlotte Area Transit System)](https://charlottenc.gov/cats)
- Power outage data: [Duke Energy](https://duke-energy.com)
- Market data: [Finnhub](https://finnhub.io)
- Icons: [Material Design Icons](https://fonts.google.com/icons)

Built with love for the Charlotte community.
