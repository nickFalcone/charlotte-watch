# CSP and Security Headers

All security headers are set statically via **`public/_headers`** (Cloudflare Pages [`_headers` file](https://developers.cloudflare.com/pages/configuration/headers/)). There is no middleware -- headers apply to every response without invoking the Pages Functions runtime.

## Current CSP Directives

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'self'` | Baseline: only same-origin |
| `script-src` | `'self' https://static.cloudflareinsights.com` | Vite bundle + Cloudflare analytics beacon |
| `style-src` | `'self' 'unsafe-inline'` | CSS files + styled-components runtime styles |
| `img-src` | `'self' data: https://*.basemaps.cartocdn.com` | Local images, data URIs, CARTO map tiles |
| `connect-src` | `'self' https://api.weather.gov https://api.open-meteo.com https://air-quality-api.open-meteo.com https://eapps.ncdot.gov https://cmpdinfo.charlottenc.gov https://cloudflareinsights.com https://a.nel.cloudflare.com` | Same-origin API routes + direct client fetches |
| `frame-ancestors` | `'none'` | Prevent embedding in iframes |
| `base-uri` | `'self'` | Prevent base tag injection |
| `object-src` | `'none'` | Block plugins (Flash, Java) |

## When to Update the CSP

When adding a **new external origin** that the client loads or fetches from, update `public/_headers`:

| You're adding...              | Update this directive |
|-------------------------------|------------------------|
| New API the client fetches    | `connect-src`          |
| New image or tile host        | `img-src`              |
| New external script           | `script-src`           |

**For AI agents:** **Ask the user before editing `public/_headers`** to add or change origins.

## Why Not Nonces?

The production build has no inline executable scripts -- only same-origin module scripts and the Cloudflare beacon loaded from a known origin. Nonce-based CSP requires server-side HTML rewriting (middleware), which forces a Pages Functions cold start on every HTML request. Static headers avoid this entirely.

## Other Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Legacy clickjacking protection (supplement to `frame-ancestors`) |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |

## Cloudflare Web Analytics (beacon)

We use **manual installation** of the Cloudflare Web Analytics beacon. The script tag is in `index.html`:

```html
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "YOUR_TOKEN"}'></script>
```

**Setup requirements:**
1. Disable auto-injection in Cloudflare dashboard (Pages > Settings > Web Analytics)
2. Add the script tag to `index.html` before `</body>` with your site token
3. `https://static.cloudflareinsights.com` is in `script-src` to allow the beacon script
4. `https://cloudflareinsights.com` and `https://a.nel.cloudflare.com` are in `connect-src` for data reporting

**`ERR_NAME_NOT_RESOLVED` for `static.cloudflareinsights.com`** means the visitor's DNS or network cannot resolve that hostname (e.g. Pi-hole, corporate DNS, VPN, or strict ad-blockers). The app still works; analytics simply does not load for those users.

## JSON-LD

Structured data is inline in `index.html` as `<script type="application/ld+json">`. This is data, not executable code -- CSP `script-src` does not apply to it.

## Files

| File | Purpose |
|------|---------|
| `public/_headers` | All security headers including CSP |
