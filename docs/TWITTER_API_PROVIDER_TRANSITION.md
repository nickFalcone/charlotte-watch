# Twitter API Provider Transition

When switching to a new Twitter scraping API on RapidAPI, the following locations need to be updated.

## Files to Update

### 1. Cloudflare Functions (production)

- `functions/api/cats-twitter.ts` - CATS tweet fetching
- `functions/api/cms-twitter.ts` - CMS tweet fetching

These import from the shared library below.

### 2. Shared parsing library

- `functions/_lib/twitter241.ts` - API host, endpoint URL, and response parsing logic

This is where the API host, request format, and response-to-`TwitterTweet` normalization live. When changing providers, this is the primary file to rewrite.

### 3. Vite dev plugins (local development)

- `vite.config.ts` - Contains `catsTwitterPlugin` and `cmsTwitterPlugin` with their own inline copies of the API host, endpoint URL, and `parseTwitter241Tweets()` function

The dev plugins duplicate the fetch/parse logic because Vite middleware cannot import from `functions/_lib/` at runtime. These must be updated in parallel with the Cloudflare Functions.

## Files That Should NOT Need Changes

The following are downstream of the normalized `TwitterTweet` shape (`{ id, text, createdAt, author?, type? }`) and should remain unchanged as long as the Cloudflare Functions continue to output that shape:

- `src/types/cats.ts`, `src/types/cms.ts` - Tweet type definitions
- `src/alerts/converters/cats.ts`, `src/alerts/converters/cms.ts` - Tweet-to-alert converters
- `src/utils/catsFilters.ts`, `src/utils/cmsFilters.ts` - Tweet content filters
- `src/utils/twitterFilters.ts` - Shared `isWithinLast24Hours` (works with any date format parseable by `new Date()`)
- `src/utils/catsApi.ts`, `src/utils/cmsApi.ts` - Client-side fetch functions

## Checklist

1. Subscribe to the new API on RapidAPI (same `RAPIDAPI_KEY` works across providers)
2. Update `functions/_lib/twitter241.ts` (or replace it) with new host, endpoint, and response parser
3. Update the `parseTwitter241Tweets` function and API URL in `vite.config.ts`
4. Ensure the normalized output matches the `TwitterTweet` interface: `{ id, text, createdAt, author?: { id }, type?: 'tweet' | 'quote' }`
5. Verify `createdAt` format is parseable by `new Date()` (ISO 8601 and Twitter's `"Wed Feb 18 22:09:30 +0000 2026"` both work)
6. CSP headers (`public/_headers`) do NOT need updating -- API calls happen server-side
7. Run `npm run check:fix` and `npm test`
8. Test locally with `npm run dev` and verify `/api/cats-twitter` and `/api/cms-twitter`
