# CSP and Security Headers

Security headers (X-Frame-Options, X-Content-Type-Options, Content-Security-Policy) are defined in `public/_headers` and apply to the SPA. They **do not** apply to `/api/*` (Pages Functions).

## When to Update the CSP

When you add a **new external origin** that the client loads or fetches from, the Content-Security-Policy may need to be updated:

| You're adding…              | Update this directive |
|-----------------------------|------------------------|
| New API the client fetches  | `connect-src`          |
| New script (e.g. analytics) | `script-src`           |
| New image or tile host      | `img-src`              |

**JSON-LD:** Structured data lives in `public/schema.json` and is loaded via `<script type="application/ld+json" src="/schema.json">`. Same-origin, so no `script-src` hash is needed. Edit the JSON file when the app description changes.

**For AI agents:** **Ask the user before editing `public/_headers`** to add or change origins. Confirm the exact host(s) to allow.

## Directives That List Origins

- **connect-src** — fetch, XHR, WebSocket (APIs the client calls directly)
- **script-src** — script elements (e.g. Cloudflare beacon)
- **img-src** — images, CSS `url()`, and tile images (e.g. CARTO basemaps)

APIs called via `/api/*` or `/proxy/*` are same-origin; only **direct** client fetches to external hosts need to be in `connect-src`.

## Cloudflare Web Analytics (beacon)

We use **manual installation** of the Cloudflare Web Analytics beacon to avoid `'unsafe-inline'` in the CSP. The script tag is added directly to `index.html`:

```html
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "YOUR_TOKEN", "spa": true}'></script>
```

**Setup requirements:**
1. Disable auto-injection in Cloudflare dashboard (Pages > Settings > Web Analytics)
2. Add the script tag to `index.html` before `</body>` with your site token
3. The external beacon is allowed via `https://static.cloudflareinsights.com` in `script-src`
4. `'strict-dynamic'` in `script-src` allows the beacon to create inline scripts at runtime
5. Data reporting is allowed via `https://cloudflareinsights.com` in `connect-src`

**`ERR_NAME_NOT_RESOLVED` for `static.cloudflareinsights.com`** means the visitor’s DNS or network cannot resolve that hostname (e.g. Pi-hole, corporate DNS, VPN, or strict ad-blockers). The app still works; analytics simply does not load for those users. We cannot fix this from the app.

**To stop the request (and the error) for everyone:** disable **Web Analytics** in the Cloudflare dashboard:

- **Pages:** Your project → **Settings** → **Builds & deployments** → **Web Analytics**, or **Analytics** in the left sidebar.
- Or **Web Analytics** (standalone) / **Browser Insights** if wired to this site.

Once disabled, Cloudflare stops injecting the beacon, so the request and `ERR_NAME_NOT_RESOLVED` go away. The CSP `script-src` entry for `https://static.cloudflareinsights.com` is then unused but harmless.

## File and Format

- **File:** `public/_headers` (copied to `dist/` on build)
- **Format:** [Cloudflare Pages \_headers](https://developments.cloudflare.com/pages/configuration/headers/)
- **Scope:** Headers apply to static assets and the SPA document, not Pages Function responses.
