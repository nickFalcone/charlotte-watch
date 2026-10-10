import type { Env } from '../_lib/env';

// DriveNC v2 events endpoint (replaces the retired eapps.ncdot.gov TIMS API).
// Returns all statewide events and has no county filter, so we filter here.
const DRIVENC_EVENTS_URL = 'https://www.drivenc.gov/api/v2/get/event';
const COUNTY = 'mecklenburg';

export const onRequestGet: PagesFunction<Env> = async context => {
  const apiKey = context.env.DRIVENC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'DriveNC API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check KV cache (2min TTL shared across all clients)
  const CACHE_KEY = 'alerts:ncdot:drivenc';
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
    const url = `${DRIVENC_EVENTS_URL}?key=${encodeURIComponent(apiKey)}&format=json`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `DriveNC returned ${response.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const events = (await response.json()) as Array<{ County?: string | null }>;
    if (!Array.isArray(events)) {
      return new Response(JSON.stringify({ error: 'Unexpected DriveNC response' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const body = JSON.stringify(events.filter(e => e.County?.trim().toLowerCase() === COUNTY));

    // Store in KV cache; failures are non-fatal
    try {
      await context.env.CACHE.put(CACHE_KEY, body, { expirationTtl: 120 });
    } catch (e) {
      console.error('KV cache write error:', e);
    }

    return new Response(body, {
      status: 200,
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
