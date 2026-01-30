/**
 * Cloudflare Worker to warm the news cache on a schedule.
 * Runs every 8 hours to keep the news cache fresh.
 *
 * Deployed separately from Pages Functions using:
 * npx wrangler deploy workers/cache-warmer.ts
 */

/// <reference types="@cloudflare/workers-types" />

export interface Env {
  // Production URL of your Cloudflare Pages site
  SITE_URL: string;
  // Optional: secret for authenticated warming requests
  CACHE_WARMING_SECRET?: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    console.log('Cache warming cron triggered at', new Date(event.scheduledTime).toISOString());

    const siteUrl = env.SITE_URL || 'https://clt.watch';
    const endpoint = `${siteUrl}/api/news-charlotte-parsed`;

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Cloudflare-Cron-Cache-Warmer/1.0',
      };

      // Add secret header if configured
      if (env.CACHE_WARMING_SECRET) {
        headers['X-Cache-Warming-Secret'] = env.CACHE_WARMING_SECRET;
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      const cacheStatus = response.headers.get('X-Cache-Status') || 'UNKNOWN';

      if (response.ok) {
        console.log(`✓ Cache warm succeeded. Status: ${cacheStatus}, HTTP ${response.status}`);
      } else {
        console.error(
          `✗ Cache warm failed. HTTP ${response.status}`,
          await response.text().catch(() => '')
        );
      }
    } catch (error) {
      console.error('Cache warming error:', error);
      // Don't throw - we don't want the cron to fail, just log the error
    }
  },
};
