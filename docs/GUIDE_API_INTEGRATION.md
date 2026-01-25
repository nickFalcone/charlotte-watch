# API Integration Guide

## Public APIs (No Authentication)

For APIs that don't require authentication:

1. Create `src/utils/yourApi.ts` with fetch functions
2. Add types to `src/types/your.ts`
3. Add query keys to `src/utils/queryKeys.ts`
4. Use directly in components via TanStack Query
5. **CSP:** The client fetches directly, so the origin must be in `connect-src` in `public/_headers`. **Ask the user before editing** `public/_headers`. See [CSP and security headers](./CSP_AND_HEADERS.md).

## Authenticated APIs

**Never expose API keys in client-side code.** Use this pattern instead:

### Architecture

```
Development:  Client → Vite Proxy (adds auth header) → External API
Production:   Client → Cloudflare Pages Function (adds auth header) → External API
```

### Step-by-Step

1. **Create Pages Function** at `functions/api/your-api.ts`:

```typescript
import type { Env } from '../_lib/env';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const apiKey = context.env.YOUR_API_KEY; // Server-side only

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const response = await fetch('https://api.example.com/data', {
    headers: {
      'Authorization': `Bearer ${apiKey}`, // Injected server-side
      'Accept': 'application/json',
    },
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

2. **Add env type** to `functions/_lib/env.ts`:

```typescript
export interface Env {
  // ... existing vars
  YOUR_API_KEY?: string;
}
```

3. **Add Vite proxy** in `vite.config.ts` for development:

```typescript
'/proxy/your-api': {
  target: 'https://api.example.com',
  changeOrigin: true,
  rewrite: path => path.replace(/^\/proxy\/your-api/, ''),
  configure: proxy => {
    proxy.on('proxyReq', proxyReq => {
      if (env.YOUR_API_KEY) {
        proxyReq.setHeader('Authorization', `Bearer ${env.YOUR_API_KEY}`);
      }
    });
  },
},
```

4. **Create API client** that switches based on environment:

```typescript
const API_URL = import.meta.env.DEV
  ? '/proxy/your-api/endpoint'
  : '/api/your-api';

export async function fetchYourData(): Promise<YourData> {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}
```

5. **Add environment variables**:
   - Development: Add to `.env.local` (Vite proxy) or `.dev.vars` (Wrangler)
   - Production: Add in Cloudflare Pages dashboard under Settings > Environment variables
   - Document in `.env.example`

## Existing Examples

- `functions/api/duke-outages.ts` — Duke Energy (auth header)
- `functions/api/finnhub-quote.ts` — Finnhub stocks (API key header)
- `functions/api/cats-alerts.ts` — Transit.land (API key header)
- `functions/api/opensky-auth.ts` — OpenSky (OAuth token)
- `functions/api/summarize-alerts.ts` — AI summarization (OpenAI/Anthropic)
