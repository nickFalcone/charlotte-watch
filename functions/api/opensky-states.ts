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

export const onRequestGet: PagesFunction<Env> = async context => {
  const url = new URL(context.request.url);
  const validatedParams = parseAndValidateParams(url);

  if (!validatedParams) {
    return new Response(JSON.stringify({ error: 'Invalid query parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
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

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch aircraft data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
