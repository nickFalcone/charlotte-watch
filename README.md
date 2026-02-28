# Charlotte Watch

**Real-time dashboard for Charlotte, NC metro area**

Monitor weather, flights, traffic alerts, transit, power outages, news, and markets — all in one place.

**Live:** [clt.watch](https://clt.watch)

## Table of Contents

- [What is Charlotte Watch?](#what-is-charlotte-watch)
- [For Developers](#for-developers)
  - [Quick Start](#quick-start)
  - [Environment Variables](#environment-variables)
  - [Project Structure](#project-structure)
  - [Contributing](#contributing)
- [Deployment](#deployment)

---

## What is Charlotte Watch?

Charlotte Watch is a real-time monitoring dashboard for residents of the Charlotte, NC metro area. It aggregates critical information from multiple sources into a single, customizable interface.

### Widgets

Each widget is an independently updating panel on the dashboard. Widgets can be rearranged and resized, and each refreshes on its own schedule so data stays current without a page reload.

| Widget | Description |
|--------|-------------|
| **Alerts** | Unified feed from 9 sources with AI-powered BLUF summary and interactive map |
| **Weather** | Current conditions, NWS alerts, forecast, radar map, air quality, and pollen |
| **Flights** | Live aircraft positions around CLT, arrivals/departures board, and FAA status |
| **LYNX Transit** | Real-time vehicle positions on Blue and Gold Lines, service alerts |
| **News** | Charlotte-area RSS news parsed and categorized by AI |
| **Markets** | Real-time stock quotes for CLT-area public companies |

### Alert Sources

The Alerts widget aggregates from 9 sources simultaneously:

- **NWS** — National Weather Service warnings and advisories
- **FAA** — CLT airport delays and ground stops
- **NCDOT** — Traffic incidents and construction
- **Duke Energy** — Power outage reports
- **CATS** — Charlotte Area Transit service disruptions
- **CMPD** — Charlotte-Mecklenburg Police advisories
- **CFD** — Charlotte Fire Department alerts
- **CMS** — Charlotte-Mecklenburg Schools notifications
- **HERE** — Real-time traffic flow incidents

---

## For Developers

### Quick Start

**Option 1: Basic development (no API functions)**

```bash
npm install
npm run dev
# Open http://localhost:5173
```

Most widgets work without API keys. Stocks, AI summaries, air quality, pollen, and some alert feeds require keys.

**Option 2: Full development (with API functions)**

```bash
npm install
cp .env.example .dev.vars  # Then fill in your API keys
npm run dev:pages
# Open http://localhost:8788
```

This mode uses Wrangler to run Cloudflare Pages Functions locally, which is required for AI summaries, stock quotes, and any endpoint that needs API keys.

### Prerequisites

- Node.js 18+
- npm

### Available Scripts

```bash
# Development
npm run dev             # Vite dev server only (no serverless functions)
npm run dev:pages       # Full dev with Cloudflare Pages Functions (requires wrangler)

# Build
npm run build           # TypeScript compile + Vite production build
npm run preview         # Preview the production build locally

# Quality checks (run after every change)
npm run check:fix       # Format + lint (auto-fix) + type-check
npm run check           # Format + lint + type-check (read-only)

# Individual checks
npm run type-check      # TypeScript type checking (frontend)
npm run type-check:functions  # TypeScript type checking (functions/)
npm run lint            # ESLint
npm run lint:fix        # ESLint with auto-fix
npm run format          # Prettier format
npm run format:check    # Prettier check (no write)

# Tests
npm test                # Run all tests once
npm run test:watch      # Run tests in watch mode

# Workers
npm run deploy:cache-warmer  # Deploy the cache warmer worker to Cloudflare
```

**Always run before committing:**

```bash
npm run check:fix
```

---

### Environment Variables

Copy `.env.example` to set up your local environment:

- `.env.local` — used by `npm run dev` (Vite dev server). Vite loads these via `loadEnv(...)`, and the values are read only by server-side dev middlewares/proxies.
- `.dev.vars` — used by `wrangler pages dev` and Cloudflare Pages Functions/Workers in deployment.

Environment variables are never bundled into client-side code. They are only read in server-side contexts (Vite dev server middleware and Cloudflare Functions) and are not exposed directly to the browser.
| Variable | Purpose | Required |
|----------|---------|---------|
| `AI_PROVIDER` | AI provider: `openai` or `anthropic` | For AI summaries |
| `OPENAI_API_KEY` | OpenAI API key | If `AI_PROVIDER=openai` |
| `ANTHROPIC_API_KEY` | Anthropic API key | If `AI_PROVIDER=anthropic` |
| `FINNHUB_API_KEY` | Stock quotes (Markets widget) | For Markets widget |
| `RAPIDAPI_KEY` | CATS Twitter, CFD Twitter, CMS Twitter, AeroDataBox | For transit/alerts/flights board |
| `HERE_API_KEY` | Real-time traffic flow | For HERE traffic alerts |
| `GOOGLE_API_KEY` | Air quality and pollen data | For Weather widget extras |
| `TRANSIT_LAND_API_KEY` | CATS Blue/Gold Line vehicle positions | For LYNX transit map |
| `DUKE_OUTAGE_URL` | Duke Energy outage API endpoint | For Duke outage alerts |
| `DUKE_OUTAGE_AUTH` | Duke Energy auth (Base64-encoded) | For Duke outage alerts |
| `OPENSKY_CLIENT_ID` | OpenSky Network username | Optional — increases rate limits |
| `OPENSKY_CLIENT_SECRET` | OpenSky Network password | Optional — increases rate limits |

#### Where to Get API Keys

| Service | Purpose | Free Tier | Sign Up |
|---------|---------|-----------|---------|
| OpenAI | AI alert/weather summaries | Yes (limited) | [platform.openai.com](https://platform.openai.com) |
| Anthropic | AI alert/weather summaries | Yes (limited) | [console.anthropic.com](https://console.anthropic.com) |
| Finnhub | Stock quotes | Yes | [finnhub.io](https://finnhub.io) |
| RapidAPI | CATS/CFD/CMS Twitter, AeroDataBox flights | Varies | [rapidapi.com](https://rapidapi.com) |
| HERE Technologies | Traffic flow data | Yes | [developer.here.com](https://developer.here.com) |
| Google Cloud | Air quality + pollen | Yes (limited) | [console.cloud.google.com](https://console.cloud.google.com) |
| Transitland | CATS vehicle positions | Yes | [transit.land](https://www.transit.land) |
| OpenSky Network | Live aircraft positions | Yes (anonymous OK) | [opensky-network.org](https://opensky-network.org) |

---

### Project Structure

```
charlotte-watch/
├── src/
│   ├── components/
│   │   ├── widgets/          # Dashboard widgets (Weather, Flights, Alerts, etc.)
│   │   └── common/           # Reusable UI primitives
│   ├── services/             # API client functions
│   ├── alerts/               # Per-source alert fetchers (NWS, FAA, NCDOT, etc.)
│   ├── hooks/                # Custom React hooks
│   ├── utils/
│   │   └── queryKeys.ts      # Centralized TanStack Query keys
│   ├── data/
│   │   └── transitRoutes.ts  # Blue/Gold Line geometry and station coordinates
│   ├── types/                # TypeScript type definitions
│   ├── stores/               # Zustand state (layout, theme)
│   ├── prompts/              # AI system prompts (JSON)
│   └── assets/icons/         # Material Design SVG icons
├── functions/                # Cloudflare Pages Functions (serverless API proxies)
│   ├── api/                  # API routes (/api/*)
│   └── _lib/                 # Shared utilities for functions
├── workers/
│   └── cache-warmer.ts       # Cloudflare Worker — pre-warms KV cache for news
├── public/
│   └── _headers              # CSP and security headers
└── docs/                     # Documentation
    ├── DEVELOPMENT.md
    ├── DEPLOYMENT.md
    ├── CONVENTIONS_*.md
    └── GUIDE_*.md
```

### Architecture

**Frontend:** React 18 + TypeScript, TanStack Query, Styled Components, Radix UI, Vite

**Backend:** Cloudflare Pages Functions (17 serverless API routes), Cloudflare KV for response caching (30 seconds to 6 hours depending on endpoint)

**Cache Warmer:** A separate Cloudflare Worker (`workers/cache-warmer.ts`) pre-fetches and LLM-parses RSS news feeds on a schedule, writing results to KV so the News widget loads instantly.

**Key Patterns:**
- Centralized query keys (`src/utils/queryKeys.ts`) — never inline query key strings
- All API keys server-side only — never in client code or `.env` files loaded by Vite
- CSP enforced via `public/_headers`

---

### Contributing

Contributions are welcome. Before you start:

1. Read [AGENTS.md](./AGENTS.md) for coding conventions and critical rules
2. Check `docs/` for relevant guides (widgets, API integration, accessibility, etc.)
3. Run `npm run check:fix` before committing
4. Write tests for new features — test failures block CI

**For AI coding agents:** See [AGENTS.md](./AGENTS.md) for full instructions including query key conventions, accessibility requirements (WCAG 2.2 AAA), and API patterns.

---

## Deployment

Deploys automatically via GitHub Actions on push to `master` (production) and on pull requests (preview deployments).

**Quick checklist:**

1. Create a Cloudflare Pages project (Direct Upload method)
2. Set GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT`
3. Set environment variables in the Cloudflare Pages dashboard (same keys as `.dev.vars`)
4. Push to `master` or open a PR

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for full instructions, including the cache warmer worker deployment.

---

## License

MIT

## Acknowledgments

- Weather: [National Weather Service](https://weather.gov)
- Flights: [FAA](https://faa.gov), [OpenSky Network](https://opensky-network.org), [AeroDataBox](https://rapidapi.com/aedbx-aedbx/api/aerodatabox)
- Traffic: [NCDOT](https://ncdot.gov), [HERE Technologies](https://here.com)
- Transit: [CATS](https://charlottenc.gov/cats), [Transitland](https://transit.land)
- Power outages: [Duke Energy](https://duke-energy.com)
- Market data: [Finnhub](https://finnhub.io)
- Air quality / pollen: [Google](https://developers.google.com/maps/documentation/air-quality)
- Icons: [Material Design Icons](https://fonts.google.com/icons)

Built for the Charlotte community.
