# API Integration Guide

## Public APIs (No Authentication)

For APIs that don't require authentication:

1. Create `src/utils/yourApi.ts` with fetch functions
2. Add types to `src/types/your.ts`
3. Add query keys to `src/utils/queryKeys.ts`
4. Use directly in components via TanStack Query

## Authenticated APIs

**Never expose API keys in client-side code.** Use this pattern instead:

### Architecture

```
Development:  Client → Vite Proxy (adds auth header) → External API
Production:   Client → Netlify Function (adds auth header) → External API
```

### Step-by-Step

1. **Create Netlify function** at `netlify/functions/your-api.ts`:

```typescript
import type { Handler } from '@netlify/functions';

const handler: Handler = async (event) => {
  const apiKey = process.env.YOUR_API_KEY; // Server-side only

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured' }),
    };
  }

  const response = await fetch('https://api.example.com/data', {
    headers: {
      'Authorization': `Bearer ${apiKey}`, // Injected server-side
      'Accept': 'application/json',
    },
  });

  return {
    statusCode: response.status,
    headers: { 'Content-Type': 'application/json' },
    body: await response.text(),
  };
};

export { handler };
```

2. **Add Vite proxy** in `vite.config.ts` for development:

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

3. **Create API client** that switches based on environment:

```typescript
const API_URL = import.meta.env.DEV
  ? '/proxy/your-api/endpoint'
  : '/.netlify/functions/your-api';

export async function fetchYourData(): Promise<YourData> {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}
```

4. **Add environment variables**:
   - Development: Add to `.env.local`
   - Production: Add in Netlify dashboard
   - Document in `.env.example`

## Existing Examples

- `netlify/functions/duke-outages.ts` — Duke Energy (auth header)
- `netlify/functions/finnhub-quote.ts` — Finnhub stocks (API key header)
- `netlify/functions/cats-alerts.ts` — Transit.land (API key header)
- `netlify/functions/opensky-auth.ts` — OpenSky (OAuth token)
