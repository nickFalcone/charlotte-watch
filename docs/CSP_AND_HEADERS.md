# CSP and Security Headers

Security headers (X-Frame-Options, X-Content-Type-Options, Content-Security-Policy) are defined in `public/_headers` and apply to the SPA. They **do not** apply to `/api/*` (Pages Functions).

## When to Update the CSP

When you add a **new external origin** that the client loads or fetches from, the Content-Security-Policy may need to be updated:

| You're adding…              | Update this directive |
|-----------------------------|------------------------|
| New API the client fetches  | `connect-src`          |
| New script (e.g. analytics) | `script-src`           |
| New image or tile host      | `img-src`              |

**Inline scripts:** `index.html` has an inline JSON-LD `<script type="application/ld+json">`. CSP allows it via a `script-src` hash. If you change that JSON-LD, the hash will break; recompute it (browser console or `echo -n '<exact script content>' | openssl dgst -sha256 -binary | openssl base64`) and update the `'sha256-...'` value in `script-src`.

**For AI agents:** **Ask the user before editing `public/_headers`** to add or change origins. Confirm the exact host(s) to allow.

## Directives That List Origins

- **connect-src** — fetch, XHR, WebSocket (APIs the client calls directly)
- **script-src** — script elements (e.g. Cloudflare beacon)
- **img-src** — images, CSS `url()`, and tile images (e.g. CARTO basemaps)

APIs called via `/api/*` or `/proxy/*` are same-origin; only **direct** client fetches to external hosts need to be in `connect-src`.

## Cloudflare Web Analytics (beacon)

The `beacon.min.js` script from `static.cloudflareinsights.com` is **injected by Cloudflare** when **Web Analytics** (or Browser Insights) is enabled for the Pages project. We do not add it in our code; CSP allows it so it can run when present.

**`ERR_NAME_NOT_RESOLVED` for `static.cloudflareinsights.com`** means the visitor’s DNS or network cannot resolve that hostname (e.g. Pi-hole, corporate DNS, VPN, or strict ad-blockers). The app still works; analytics simply does not load for those users. We cannot fix this from the app.

**To stop the request (and the error) for everyone:** disable **Web Analytics** in the Cloudflare dashboard:

- **Pages:** Your project → **Settings** → **Builds & deployments** → **Web Analytics**, or **Analytics** in the left sidebar.
- Or **Web Analytics** (standalone) / **Browser Insights** if wired to this site.

Once disabled, Cloudflare stops injecting the beacon, so the request and `ERR_NAME_NOT_RESOLVED` go away. The CSP `script-src` entry for `https://static.cloudflareinsights.com` is then unused but harmless.

## File and Format

- **File:** `public/_headers` (copied to `dist/` on build)
- **Format:** [Cloudflare Pages \_headers](https://developments.cloudflare.com/pages/configuration/headers/)
- **Scope:** Headers apply to static assets and the SPA document, not Pages Function responses.
