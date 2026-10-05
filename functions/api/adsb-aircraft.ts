import type { Env } from '../_lib/env';

// Community ADS-B feeds, tried in order. Both are free, keyless, and return the
// ADSBexchange v2 JSON format ({ now, ac: [...] }).
// Terms: adsb.fi is personal/non-commercial use; adsb.lol data is ODbL (attribution required).
const PROVIDERS = [
  {
    name: 'adsb.fi',
    buildUrl: (lat: number, lon: number, dist: number) =>
      `https://opendata.adsb.fi/api/v3/lat/${lat}/lon/${lon}/dist/${dist}`,
  },
  {
    name: 'adsb.lol',
    buildUrl: (lat: number, lon: number, dist: number) =>
      `https://api.adsb.lol/v2/point/${lat}/${lon}/${dist}`,
  },
] as const;

// Upstream responses are cached at the Cloudflare edge so upstream request volume stays low
// regardless of how many viewers are polling (public endpoints allow ~1 request/second).
const UPSTREAM_CACHE_TTL_SECONDS = 10;
const UPSTREAM_TIMEOUT_MS = 8000;
const MAX_RADIUS_NM = 250;

// Only these fields are passed to the client (keeps payloads small and the response predictable)
const AIRCRAFT_FIELDS = [
  'hex',
  'flight',
  'r',
  't',
  'desc',
  'ownOp',
  'lat',
  'lon',
  'alt_baro',
  'gs',
  'track',
  'baro_rate',
  'geom_rate',
  'squawk',
  'emergency',
  'category',
  'seen',
  'seen_pos',
] as const;

interface Query {
  lat: number;
  lon: number;
  dist: number;
}

function parseQuery(url: URL): Query | null {
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  const dist = Number(url.searchParams.get('dist'));

  const valid =
    url.searchParams.has('lat') &&
    url.searchParams.has('lon') &&
    url.searchParams.has('dist') &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Number.isFinite(dist) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    dist > 0 &&
    dist <= MAX_RADIUS_NM;

  return valid ? { lat, lon, dist: Math.ceil(dist) } : null;
}

function pickFields(aircraft: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const field of AIRCRAFT_FIELDS) {
    if (aircraft[field] !== undefined) {
      picked[field] = aircraft[field];
    }
  }
  return picked;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export const onRequestGet: PagesFunction<Env> = async context => {
  const query = parseQuery(new URL(context.request.url));
  if (!query) {
    return jsonResponse({ error: 'Invalid query parameters' }, 400);
  }

  const failures: { provider: string; status?: number; error?: string }[] = [];

  for (const provider of PROVIDERS) {
    try {
      const response = await fetch(provider.buildUrl(query.lat, query.lon, query.dist), {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'clt.watch (https://clt.watch)',
        },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        cf: {
          cacheEverything: true,
          cacheTtlByStatus: { '200-299': UPSTREAM_CACHE_TTL_SECONDS, '300-599': 0 },
        },
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(`${provider.name} upstream error:`, response.status, body.slice(0, 200));
        failures.push({ provider: provider.name, status: response.status });
        continue;
      }

      const data = (await response.json()) as { now?: unknown; ac?: unknown };
      if (!Array.isArray(data.ac)) {
        console.error(`${provider.name} returned an unexpected payload shape`);
        failures.push({ provider: provider.name, error: 'unexpected payload' });
        continue;
      }

      return jsonResponse(
        {
          source: provider.name,
          now: typeof data.now === 'number' ? data.now : Date.now(),
          ac: data.ac.map(item => pickFields(item as Record<string, unknown>)),
        },
        200
      );
    } catch (error) {
      console.error(`${provider.name} fetch failed:`, error);
      failures.push({ provider: provider.name, error: 'request failed' });
    }
  }

  return jsonResponse({ error: 'Aircraft data providers unavailable', providers: failures }, 502);
};
