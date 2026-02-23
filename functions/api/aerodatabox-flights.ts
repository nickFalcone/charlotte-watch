import type { Env } from '../_lib/env';

const AERODATABOX_HOST = 'aerodatabox.p.rapidapi.com';
const AERODATABOX_URL =
  `https://${AERODATABOX_HOST}/flights/airports/iata/CLT` +
  '?offsetMinutes=-120&durationMinutes=720&withLeg=true&direction=Both' +
  '&withCancelled=true&withCodeshared=false&withCargo=true&withPrivate=true&withLocation=false';

// Cache for 15 minutes at the Cloudflare edge. Multiple browser tabs or users
// within the same 15-minute window all hit the CF cache instead of AeroDataBox,
// keeping usage well within the ~300 request/month Tier-2 budget.
const CACHE_TTL_SECONDS = 900;

export const onRequestGet: PagesFunction<Env> = async context => {
  const apiKey = context.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AeroDataBox API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(AERODATABOX_URL, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': AERODATABOX_HOST,
        Accept: 'application/json',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cf: { cacheTtl: CACHE_TTL_SECONDS, cacheEverything: true } as any,
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `AeroDataBox API error: ${response.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.text();

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch flight schedule' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
