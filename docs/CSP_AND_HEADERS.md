# CSP and Security Headers

Security headers (X-Frame-Options, X-Content-Type-Options, Content-Security-Policy) are defined in `public/_headers` and apply to the SPA. They **do not** apply to `/api/*` (Pages Functions).

## When to Update the CSP

When you add a **new external origin** that the client loads or fetches from, the Content-Security-Policy may need to be updated:

| You're adding…              | Update this directive |
|-----------------------------|------------------------|
| New API the client fetches  | `connect-src`          |
| New script (e.g. analytics) | `script-src`           |
| New image or tile host      | `img-src`              |

**For AI agents:** **Ask the user before editing `public/_headers`** to add or change origins. Confirm the exact host(s) to allow.

## Directives That List Origins

- **connect-src** — fetch, XHR, WebSocket (APIs the client calls directly)
- **script-src** — script elements (e.g. Cloudflare beacon)
- **img-src** — images, CSS `url()`, and tile images (e.g. CARTO basemaps)

APIs called via `/api/*` or `/proxy/*` are same-origin; only **direct** client fetches to external hosts need to be in `connect-src`.

## File and Format

- **File:** `public/_headers` (copied to `dist/` on build)
- **Format:** [Cloudflare Pages \_headers](https://developments.cloudflare.com/pages/configuration/headers/)
- **Scope:** Headers apply to static assets and the SPA document, not Pages Function responses.
