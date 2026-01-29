import type { Env } from '../_lib/env';

const CATS_BASE_URL = 'https://transit.land/api/v2/rest';
const CATS_FEED_ID = 'f-dnq-charlotteareatransitsystem~rt';

export const onRequestGet: PagesFunction<Env> = async context => {
  const apiKey = context.env.TRANSIT_LAND_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'CATS API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check KV cache (15min TTL shared across all clients)
  const CACHE_KEY = 'alerts:cats';
  try {
    const cached = await context.env.CACHE.get(CACHE_KEY);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=900',
        },
      });
    }
  } catch (e) {
    console.error('KV cache read error:', e);
  }

  const url = `${CATS_BASE_URL}/feeds/${CATS_FEED_ID}/download_latest_rt/alerts.json`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `CATS API returned ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.text();

    // Store in KV cache (15min TTL); failures are non-fatal
    try {
      await context.env.CACHE.put(CACHE_KEY, data, { expirationTtl: 900 });
    } catch (e) {
      console.error('KV cache write error:', e);
    }

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=900',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch CATS alerts',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
