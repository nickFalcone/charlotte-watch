# AI Summary Caching Strategy

## Overview

The Alerts widget includes AI-generated BLUF (Bottom Line Up Front) summaries. Caching operates at two layers to minimize AI API costs:

1. **Server-side KV cache** (Cloudflare KV) -- shares the same summary across all clients for 15 minutes, keyed by alert set hash.
2. **Client-side React Query cache** (in-memory only) -- deduplicates requests within a single browser session.

For full server-side caching details, see [CLOUDFLARE_KV_CACHING.md](./CLOUDFLARE_KV_CACHING.md).

## Hash-Based Invalidation

**Location:** `src/utils/alertSummaryApi.ts` -- `computeAlertsHash()`

The system computes a deterministic hash from:
- Alert IDs (sorted by `localeCompare` for stable ordering)
- Alert severities

```typescript
// Same alerts always produce the same hash
const hash1 = computeAlertsHash(alerts); // "1gexrnh"
// ... 5 minutes later, same alerts ...
const hash2 = computeAlertsHash(alerts); // "1gexrnh" (same hash)
```

The hash appears in two places:
- **React Query key:** `['alerts', 'summary', hash]` -- controls client-side cache invalidation
- **KV cache key:** `summary:<hash>` -- controls server-side cache sharing

Since raw alert data is itself KV-cached (15min TTL), all clients within that window receive the same alerts, compute the same hash, and share the same summary.

## Query Configuration

```typescript
// src/hooks/useAlertSummary.ts
return useQuery({
  queryKey: queryKeys.alerts.summary(hash),
  queryFn: ({ signal }) => fetchAlertSummary(alerts, hash, signal),
  staleTime: Infinity,  // Never refetch unless hash changes
  placeholderData: previousData => previousData, // Show old summary while fetching new
});
```

`staleTime: Infinity` means React Query will not refetch a summary for a given hash. When alerts change and the hash changes, React Query treats it as a new query key and fetches a fresh summary. The `placeholderData` callback keeps the previous summary visible during the transition.

## Request Flow

```
1. Alerts change --> new hash computed client-side
2. React Query checks in-memory cache for ['alerts', 'summary', newHash]
3. Cache miss --> POST /api/summarize-alerts { alerts, hash }
4. Pages Function checks KV for summary:<hash>
5a. KV hit --> return cached summary (no AI call)
5b. KV miss --> call AI, store in KV (15min TTL), return summary
6. React Query caches response in memory under the new query key
```

## Cost Impact

Server-side KV caching is the primary cost control. Within any 15-minute window, only the first request for a given alert set triggers an AI call. All subsequent requests (from any client) get the KV-cached response.

Client-side in-memory caching provides additional dedup within a session: tab switches, component remounts, and React re-renders do not trigger new network requests.

## Testing

### Same-session dedup (in-memory)
1. Load the app with active alerts
2. Wait for AI summary to appear
3. Switch tabs and return
4. **Expected:** Summary still displayed, no new network request

### Hash-based invalidation
1. Wait for alerts to refresh (15 minutes)
2. If alerts changed: new hash, summary regenerates
3. If alerts identical: same hash, cached summary persists
4. **Expected:** Network request only when hash changes

### Cross-client sharing (KV)
1. Open the app in two separate browsers or incognito windows
2. First window triggers the summary
3. Second window requests with the same alert set
4. **Expected:** Second window gets the KV-cached summary (check server logs for no AI call)

## Edge Cases

### Alerts change but hash stays the same
**Likelihood:** Extremely rare (requires alert titles/summaries changing while IDs and severities stay identical).
**Impact:** Old summary displayed until next alert addition/removal.
**Mitigation:** Hash includes severity, which typically changes when alert state changes.

### Page refresh
A page refresh clears the in-memory React Query cache. The next summary request hits the server, but the KV cache serves the response without an AI call (within the 15min TTL).

## What is NOT in localStorage

The React Query cache is **not** persisted to localStorage. API response data lives only in:
- **In-memory** (React Query) -- cleared on page close
- **Cloudflare KV** (server-side) -- shared across all clients, TTL-controlled

User preferences (theme, dashboard layout, widget positions) remain in localStorage via Zustand stores and are unrelated to API data caching.
