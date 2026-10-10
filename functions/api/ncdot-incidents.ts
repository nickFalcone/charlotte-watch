import type { Env } from '../_lib/env';

const NCDOT_INCIDENTS_URL =
  'https://eapps.ncdot.gov/services/traffic-prod/v1/counties/60/incidents?verbose=true&recent=true';

export const onRequestGet: PagesFunction<Env> = async context => {
  // Check KV cache (2min TTL shared across all clients)
  const CACHE_KEY = 'alerts:ncdot';
  try {
    const cached = await context.env.CACHE.get(CACHE_KEY);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=120',
        },
      });
    }
  } catch (e) {
    console.error('KV cache read error:', e);
  }

  try {
    const response = await fetch(NCDOT_INCIDENTS_URL, {
      headers: { Accept: 'application/json' },
    });
    const data = await response.text();

    if (response.ok) {
      // KV minimum expirationTtl is 60s; failures are non-fatal
      try {
        await context.env.CACHE.put(CACHE_KEY, data, { expirationTtl: 120 });
      } catch (e) {
        console.error('KV cache write error:', e);
      }
    }

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=120',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch NC DOT incidents' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
