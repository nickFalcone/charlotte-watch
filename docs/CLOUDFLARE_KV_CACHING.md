# Server-Side Caching (Cloudflare KV)

All Pages Functions under `functions/api/` use a shared **Cloudflare KV namespace** (`CACHE` binding) to cache upstream API responses and AI-generated content. This reduces redundant upstream calls, lowers AI costs, and ensures all clients see consistent data within each TTL window.

---

## Architecture overview

```
Client  -->  Pages Function  -->  KV CACHE hit?  --yes-->  return cached response
                                       |
                                      no
                                       |
                                  upstream fetch / AI call
                                       |
                                  CACHE.put (non-fatal)
                                       |
                                  return fresh response
```

- **Cache reads/writes are wrapped in try/catch.** A KV failure never blocks the response; it logs the error and falls through to the upstream path.
- **No stale-while-revalidate.** Simple "hit or miss" strategy for most endpoints. The news endpoint uses a separate write path (see Cache warming below).
- **Client-side React Query is unchanged.** Clients still refetch on their normal intervals; they just receive cached server responses faster.

---

## Cloudflare dashboard setup

These steps must be completed in the Cloudflare dashboard before caching works in production:

1. **Create a KV namespace** -- Workers & Pages > KV > Create namespace. Name: `CHARLOTTE_MONITOR_CACHE`.
2. **Bind to Pages project** -- Workers & Pages > Pages > project > Settings > Functions > KV namespace bindings. Variable name: `CACHE`, namespace: `CHARLOTTE_MONITOR_CACHE`. Bind for both Production and Preview.
3. **Environment variables** -- Caching does not change which env vars are required. All upstream API keys (`RAPIDAPI_KEY`, `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`, `DUKE_OUTAGE_AUTH`, `TRANSIT_LAND_API_KEY`, `HERE_API_KEY`, etc.) are still needed for cache misses.

The TypeScript binding is already declared in `functions/_lib/env.ts`:
```ts
CACHE: KVNamespace;
```

---

## Cached endpoints

### AI-powered endpoints

| Endpoint | File | Cache key | TTL | Notes |
|---|---|---|---|---|
| `GET /api/news-charlotte-parsed` | `functions/api/news-charlotte-parsed.ts` | `news:parsed` | 12 hours (43200s) | Read-only; populated by `workers/cache-warmer.ts` on cron schedule |
| `POST /api/summarize-alerts` | `functions/api/summarize-alerts.ts` | `summary:<hash>` | 15 minutes (900s) | Keyed by client-provided `hash` from request body |

### Raw alert proxy endpoints

| Endpoint | File | Cache key | TTL | Notes |
|---|---|---|---|---|
| `GET /api/cats-alerts` | `functions/api/cats-alerts.ts` | `alerts:cats` | 15 minutes (900s) | Single global key |
| `GET /api/duke-outages` | `functions/api/duke-outages.ts` | `alerts:duke` | 15 minutes (900s) | Single global key; includes detail enrichment |
| `GET /api/here-flow` | `functions/api/here-flow.ts` | `alerts:here` | 15 minutes (900s) | Single key (params are fixed by allowlist) |
| `GET /api/faa-status` | `functions/api/faa-status.ts` | `alerts:faa` | 15 minutes (900s) | Returns XML (`Content-Type: application/xml`) |
| `GET /api/opensky-auth` | `functions/api/opensky-auth.ts` | `alerts:opensky-auth` | 5 minutes (300s) | Short TTL because tokens expire |
### Stock data endpoints

| Endpoint | File | Cache key | TTL | Notes |
|---|---|---|---|---|
| `GET /api/finnhub-quote` | `functions/api/finnhub-quote.ts` | `stock:quote:<SYMBOL>` | 15 minutes (900s) | Per-symbol key; 38 symbols polled every 15min during market hours |
| `GET /api/finnhub-profile` | `functions/api/finnhub-profile.ts` | `stock:profile:<SYMBOL>` | 24 hours (86400s) | Per-symbol key; company info rarely changes |

### Not cached

| Endpoint | File | Reason |
|---|---|---|
| `GET /api/opensky-states` | `functions/api/opensky-states.ts` | Real-time aircraft positions; polled every 15s by flight tracker |

---

## Implementation pattern

Every cached endpoint follows the same structure. Use this as a reference when adding caching to new endpoints:

```ts
export const onRequestGet: PagesFunction<Env> = async context => {
  // 1. Check cache
  const CACHE_KEY = 'alerts:example';
  try {
    const cached = await context.env.CACHE.get(CACHE_KEY);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=900',
        },
      });
    }
  } catch (e) {
    console.error('KV cache read error:', e);
  }

  // 2. Validate inputs, fetch upstream, etc.
  // ...
  const responseBody = JSON.stringify(data);

  // 3. Write to cache (non-fatal)
  try {
    await context.env.CACHE.put(CACHE_KEY, responseBody, { expirationTtl: 900 });
  } catch (e) {
    console.error('KV cache write error:', e);
  }

  // 4. Return response
  return new Response(responseBody, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=900',
    },
  });
};
```

**Key rules:**
- Cache reads happen before any validation or upstream calls (early return on hit).
- Cache writes are always in try/catch and never prevent the response from being sent.
- Only successful responses are cached (do not cache error responses).
- `expirationTtl` is in seconds and controls automatic KV expiration.
- `Cache-Control` should match the TTL so browser/CDN caching aligns with KV.

---

## Local development (Vite)

Two Vite dev plugins have **in-memory caching** that mirrors KV behavior:

- **`newsCharlotteParsedPlugin`** in `vite.config.ts` -- 12h TTL via `devCacheGet`/`devCachePut` using a `Map<string, { data: string; expiresAt: number }>`.
- **`aiSummarizationPlugin`** in `vite.config.ts` -- 15min TTL, keyed by `summary:<hash>`.

Other alert endpoints are handled by Vite's built-in proxy config and are **not cached in dev** (each request hits upstream directly). This is acceptable since dev traffic is single-user.

---

## Alert summary hash

The alert summary cache key includes a `hash` computed **client-side** in `src/utils/alertSummaryApi.ts:computeAlertsHash()`:

- Sorts alerts by `id` (stable ordering via `localeCompare`)
- Hashes `id:severity` pairs joined by `|` using djb2
- Deterministic: same alert set always produces the same hash

Since all clients receive the same raw alert data from KV-cached endpoints within the TTL, they compute identical hashes and share the same summary cache entry.

---

## Adding caching to a new endpoint

1. Choose a stable cache key (e.g. `alerts:newservice` or `alerts:newservice:<paramHash>` if params vary).
2. Follow the implementation pattern above.
3. Pick a TTL: 900s (15min) for alert data, longer for less volatile data.
4. Add the endpoint to the table in this document and in `docs/DEVELOPMENT.md`.
5. If the endpoint has a Vite dev plugin, add `devCacheGet`/`devCachePut` calls using the shared cache in `vite.config.ts`.

---

## Cache warming (news endpoint)

The news endpoint uses a separated write/read architecture to avoid timeout issues:

```
WRITE: Cron -> Worker -> fetch articles -> LLM parse -> write KV   (async, no user waiting)
READ:  User -> Pages Function -> read KV -> return                 (instant, always fast)
```

The cache-warmer Worker (`workers/cache-warmer.ts`) handles the heavy processing (fetching 100 articles from RapidAPI, sending 50 to OpenAI for parsing) and writes the result to KV. The Pages Function (`functions/api/news-charlotte-parsed.ts`) is read-only and returns cached data or an empty array on cache miss.

**Schedule:** 04:00, 12:00, and 20:00 UTC (every 8 hours)
- 04:00 UTC = 11 PM Eastern (prev day EST) / 12 AM Eastern (EDT)
- 12:00 UTC = 7 AM Eastern (EST) / 8 AM Eastern (EDT)
- 20:00 UTC = 3 PM Eastern (EST) / 4 PM Eastern (EDT)

**Implementation:** `workers/cache-warmer.ts` with config in `workers/wrangler.toml`

**Deploy:** `npm run deploy:cache-warmer`

**Manual trigger:** `curl "https://charlotte-monitor-cache-warmer.<your-subdomain>.workers.dev/warm?secret=<CACHE_WARMING_SECRET>"`

**Worker secrets** (set via `npx wrangler secret put <NAME> --config workers/wrangler.toml`):
- `RAPIDAPI_KEY` -- OpenWebNinja Real-Time News
- `OPENAI_API_KEY` -- OpenAI (default provider)
- `CACHE_WARMING_SECRET` -- protects the `/warm` manual trigger
- `ANTHROPIC_API_KEY` -- optional, if `AI_PROVIDER=anthropic`

**View logs:** Cloudflare Dashboard > Workers & Pages > charlotte-monitor-cache-warmer > Logs

---

## Possible future improvements

- **Cache invalidation API:** An admin endpoint to manually purge specific keys (e.g. after a data correction).
- **Metrics:** Log cache hit/miss counts per endpoint for observability.
