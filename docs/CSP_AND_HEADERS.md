# CSP and Security Headers

Security headers are set in two places:

- **`functions/_middleware.ts`** — Sets CSP with dynamic nonces for HTML responses
- **`public/_headers`** — Sets X-Frame-Options and X-Content-Type-Options for all responses

## How the CSP Works

The middleware generates a unique nonce per request and:
1. Injects `nonce="..."` into all `<script>` tags (except `application/ld+json`)
2. Sets `script-src 'nonce-...' 'strict-dynamic'` in the CSP header

With `'strict-dynamic'`, scripts loaded with a valid nonce can create additional scripts (like the Cloudflare beacon's inline script) without needing `'unsafe-inline'`.

## When to Update the CSP

When you add a **new external origin** that the client loads or fetches from, update `functions/_middleware.ts`:

| You're adding…              | Update this directive |
|-----------------------------|------------------------|
| New API the client fetches  | `connect-src`          |
| New image or tile host      | `img-src`              |

**Note:** With `'strict-dynamic'`, you do NOT need to add external script hosts to `script-src`. The nonce on the initial script tag is sufficient.

**For AI agents:** **Ask the user before editing `functions/_middleware.ts`** to add or change origins.

## Directives That List Origins

- **connect-src** — fetch, XHR, WebSocket (APIs the client calls directly)
- **img-src** — images, CSS `url()`, and tile images (e.g. CARTO basemaps)

APIs called via `/api/*` or `/proxy/*` are same-origin; only **direct** client fetches to external hosts need to be in `connect-src`.

## Cloudflare Web Analytics (beacon)

We use **manual installation** of the Cloudflare Web Analytics beacon. The script tag is in `index.html`:

```html
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "YOUR_TOKEN"}'></script>
```

The middleware adds a nonce to this script tag at runtime. With `'strict-dynamic'`, the beacon can create inline scripts without `'unsafe-inline'`.

**Setup requirements:**
1. Disable auto-injection in Cloudflare dashboard (Pages > Settings > Web Analytics)
2. Add the script tag to `index.html` before `</body>` with your site token
3. Data reporting is allowed via `https://cloudflareinsights.com` in `connect-src`

**`ERR_NAME_NOT_RESOLVED` for `static.cloudflareinsights.com`** means the visitor's DNS or network cannot resolve that hostname (e.g. Pi-hole, corporate DNS, VPN, or strict ad-blockers). The app still works; analytics simply does not load for those users.

## JSON-LD

Structured data is inline in `index.html` as `<script type="application/ld+json">` (Google does not fetch `src=` for `application/ld+json`). The middleware does NOT add a nonce to this tag since it's data, not executable code.

## Files

| File | Purpose |
|------|---------|
| `functions/_middleware.ts` | Sets CSP with nonce for HTML responses |
| `public/_headers` | Sets X-Frame-Options, X-Content-Type-Options for all responses |
