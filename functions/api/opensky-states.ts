import type { Env } from '../_lib/env';

// Allowlisted parameters for OpenSky API
const ALLOWED_PARAMS = ['lamin', 'lamax', 'lomin', 'lomax', 'extended', 'icao24', 'time'];

function isValidLatitude(value: string): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num >= -90 && num <= 90;
}

function isValidLongitude(value: string): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num >= -180 && num <= 180;
}

function isValidExtended(value: string): boolean {
  return value === '0' || value === '1';
}

function isValidIcao24(value: string): boolean {
  return /^[0-9a-f]{6}$/i.test(value);
}

function isValidTime(value: string): boolean {
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0 && num < 2147483647;
}

function parseAndValidateParams(url: URL): URLSearchParams | null {
  const validated = new URLSearchParams();

  for (const [key, value] of url.searchParams.entries()) {
    if (!ALLOWED_PARAMS.includes(key)) {
      continue;
    }

    if (value === null || value === undefined) {
      continue;
    }

    let isValid = false;

    switch (key) {
      case 'lamin':
      case 'lamax':
        isValid = isValidLatitude(value);
        break;
      case 'lomin':
      case 'lomax':
        isValid = isValidLongitude(value);
        break;
      case 'extended':
        isValid = isValidExtended(value);
        break;
      case 'icao24':
        isValid = isValidIcao24(value);
        break;
      case 'time':
        isValid = isValidTime(value);
        break;
      default:
        isValid = false;
    }

    if (isValid) {
      validated.set(key, value);
    }
  }

  return validated;
}

/** Simple string hash for cache key differentiation. */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

export const onRequestGet: PagesFunction<Env> = async context => {
  const url = new URL(context.request.url);
  const validatedParams = parseAndValidateParams(url);

  if (!validatedParams) {
    return new Response(JSON.stringify({ error: 'Invalid query parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build cache key from sorted validated params (15min TTL)
  const sortedParams = [...validatedParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const cacheKey = `alerts:opensky-states:${simpleHash(sortedParams)}`;

  try {
    const cached = await context.env.CACHE.get(cacheKey);
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

  const token = context.request.headers.get('authorization');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = token;
  }

  try {
    const queryString = validatedParams.toString();
    const apiUrl = queryString
      ? `https://opensky-network.org/api/states/all?${queryString}`
      : 'https://opensky-network.org/api/states/all';

    const response = await fetch(apiUrl, { headers, cf: { cacheTtl: 0, cacheEverything: false } });
    const data = await response.json();
    const responseBody = JSON.stringify(data);

    if (response.ok) {
      // Store in KV cache (15min TTL); failures are non-fatal
      try {
        await context.env.CACHE.put(cacheKey, responseBody, { expirationTtl: 900 });
      } catch (e) {
        console.error('KV cache write error:', e);
      }
    }

    return new Response(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=900',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch aircraft data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
