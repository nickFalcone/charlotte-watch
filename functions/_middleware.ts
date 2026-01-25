/**
 * Middleware that adds CSP nonces to script tags and sets security headers.
 * This enables 'strict-dynamic' CSP without 'unsafe-inline'.
 */
export const onRequest: PagesFunction = async context => {
  const response = await context.next();

  // Only process HTML responses
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  // Generate a unique nonce for this request
  const nonce = crypto.randomUUID();

  // Read and modify the HTML
  let html = await response.text();

  // Add nonce to script tags (but not to application/ld+json which is data, not code)
  // Match <script that is NOT followed by type="application/ld+json"
  html = html.replace(
    /<script(?![^>]*type\s*=\s*["']application\/ld\+json["'])/gi,
    `<script nonce="${nonce}"`
  );

  // Build CSP with nonce
  const csp = [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.basemaps.cartocdn.com",
    "connect-src 'self' https://api.weather.gov https://api.open-meteo.com https://air-quality-api.open-meteo.com https://eapps.ncdot.gov https://cmpdinfo.charlottenc.gov https://cloudflareinsights.com https://a.nel.cloudflare.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ');

  // Create new response with modified HTML and headers
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Content-Security-Policy', csp);
  newHeaders.set('X-Frame-Options', 'DENY');
  newHeaders.set('X-Content-Type-Options', 'nosniff');

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};
