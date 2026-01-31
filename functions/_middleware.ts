/**
 * Cloudflare Pages Middleware
 * Injects dynamic OG meta tags with current BLUF alert summary
 */

interface Env {
  ASSETS: Fetcher;
}

interface BLUFSummaryResponse {
  bullets?: string[];
}

async function fetchBLUFSummary(request: Request): Promise<string[]> {
  try {
    // Get the origin from the request
    const url = new URL(request.url);
    const summaryUrl = `${url.origin}/api/summarize-alerts`;

    const response = await fetch(summaryUrl, {
      headers: { 'User-Agent': 'CloudflarePages/OG-Middleware' },
    });

    if (!response.ok) {
      return ['Live Charlotte-Mecklenburg alerts, weather, traffic & more'];
    }

    const data = (await response.json()) as BLUFSummaryResponse;
    // Extract bullet points from the summary
    const bullets = data.bullets || [];
    return bullets.length > 0
      ? bullets
      : ['Live Charlotte-Mecklenburg alerts, weather, traffic & more'];
  } catch (error) {
    console.error('Failed to fetch BLUF summary:', error);
    return ['Live Charlotte-Mecklenburg alerts, weather, traffic & more'];
  }
}

export const onRequest: PagesFunction<Env> = async context => {
  const { request, env } = context;
  const url = new URL(request.url);

  // Only inject dynamic meta tags for the root path
  if (url.pathname !== '/') {
    return env.ASSETS.fetch(request);
  }

  // Only inject for requests that look like social media crawlers or browsers
  const userAgent = request.headers.get('User-Agent') || '';
  const isCrawler =
    userAgent.includes('bot') ||
    userAgent.includes('Bot') ||
    userAgent.includes('Facebook') ||
    userAgent.includes('Twitter') ||
    userAgent.includes('Slack') ||
    userAgent.includes('Discord') ||
    userAgent.includes('Telegram') ||
    userAgent.includes('WhatsApp') ||
    userAgent.includes('LinkedInBot') ||
    userAgent.includes('Applebot') || // iMessage link previews
    userAgent.includes('Preview') || // Some Apple services
    userAgent.includes('Google') || // Google Messages (Android), Chrome link previews
    userAgent.includes('Googlebot') || // Google's web crawler
    !userAgent.includes('Mozilla'); // Likely a crawler if no Mozilla

  // Fetch the static HTML
  const response = await env.ASSETS.fetch(request);

  // Only modify HTML responses
  if (!response.headers.get('Content-Type')?.includes('text/html')) {
    return response;
  }

  // For crawlers, inject dynamic meta tags
  if (isCrawler) {
    const bullets = await fetchBLUFSummary(request);
    const description = bullets.slice(0, 3).join('. ') + '.'; // First 3 bullets, truncated for OG

    // Get the HTML
    let html = await response.text();

    // Replace the og:description meta tag
    html = html.replace(
      /<meta property="og:description" content="[^"]*" \/>/,
      `<meta property="og:description" content="${description}" />`
    );

    // Replace the twitter:description meta tag
    html = html.replace(
      /<meta name="twitter:description" content="[^"]*" \/>/,
      `<meta name="twitter:description" content="${description}" />`
    );

    // Replace the standard description meta tag
    html = html.replace(
      /<meta name="description" content="[^"]*" \/>/,
      `<meta name="description" content="${description}" />`
    );

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  // For regular users, return the static HTML as-is
  return response;
};
