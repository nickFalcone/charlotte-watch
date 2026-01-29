import type { Env } from '../_lib/env';

export const onRequestGet: PagesFunction<Env> = async context => {
  // Check KV cache (15min TTL shared across all clients)
  const CACHE_KEY = 'alerts:faa';
  try {
    const cached = await context.env.CACHE.get(CACHE_KEY);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'private, max-age=900',
        },
      });
    }
  } catch (e) {
    console.error('KV cache read error:', e);
  }

  try {
    const response = await fetch('https://nasstatus.faa.gov/api/airport-status-information');
    const data = await response.text();

    if (response.ok) {
      // Store in KV cache (15min TTL); failures are non-fatal
      try {
        await context.env.CACHE.put(CACHE_KEY, data, { expirationTtl: 900 });
      } catch (e) {
        console.error('KV cache write error:', e);
      }
    }

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'private, max-age=900',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch FAA status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
