import type { Env } from '../_lib/env';

// Charlotte, NC coordinates
const CHARLOTTE_LAT = 35.2271;
const CHARLOTTE_LNG = -80.8431;

// ~30 mile radius in degrees
const LAT_RADIUS = 0.44;
const LNG_RADIUS = 0.53;

interface OutageListItem {
  sourceEventNumber: string;
  deviceLatitudeLocation: number;
  deviceLongitudeLocation: number;
  customersAffectedNumber?: number | string;
  outageCause?: string;
  convexHull?: { lat: number; lng: number }[] | null;
}

interface OutageDetail {
  sourceEventNumber: string;
  deviceLatitudeLocation: number;
  deviceLongitudeLocation: number;
  maxCustomersAffectedNumber?: number;
  customersAffectedNumber?: number | string;
  customersAffectedSum?: number;
  estimatedRestorationTime?: string;
  crewStatTxt?: string;
  startTime?: string;
  operationCenterName?: string;
  causeDescription?: string;
  outageCause?: string;
  convexHull?: { lat: number; lng: number }[] | null;
  countiesAffected?: { name: string; state: string; customersAffected: number }[];
}

function isWithinRadius(lat: number, lng: number): boolean {
  return Math.abs(lat - CHARLOTTE_LAT) <= LAT_RADIUS && Math.abs(lng - CHARLOTTE_LNG) <= LNG_RADIUS;
}

export const onRequestGet: PagesFunction<Env> = async context => {
  const dukeUrl = context.env.DUKE_OUTAGE_URL;
  const dukeAuth = context.env.DUKE_OUTAGE_AUTH;

  if (!dukeUrl || !dukeAuth) {
    return new Response(JSON.stringify({ error: 'Duke Energy API configuration missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check KV cache (15min TTL shared across all clients)
  const CACHE_KEY = 'alerts:duke';
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

  const headers = {
    Accept: 'application/json',
    Authorization: dukeAuth,
  };

  try {
    // Step 1: Fetch list of all outages
    const listResponse = await fetch(dukeUrl, { method: 'GET', headers });

    if (!listResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch outage list' }), {
        status: listResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const listJson = (await listResponse.json()) as { data?: OutageListItem[] } | OutageListItem[];
    const listData = Array.isArray(listJson) ? listJson : listJson.data || [];

    // Step 2: Filter to outages within ~30 miles of Charlotte
    const nearbyOutages = listData.filter(outage =>
      isWithinRadius(outage.deviceLatitudeLocation, outage.deviceLongitudeLocation)
    );

    if (nearbyOutages.length === 0) {
      return new Response(JSON.stringify({ data: [], errorMessages: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Build detail URL base from list URL
    const urlObj = new URL(dukeUrl);
    const jurisdiction = urlObj.searchParams.get('jurisdiction') || 'DEC';
    const detailBaseUrl = `${urlObj.origin}${urlObj.pathname}/outage`;

    // Step 4: Fetch details for each nearby outage in parallel
    const detailPromises = nearbyOutages.map(async outage => {
      try {
        const detailUrl = `${detailBaseUrl}?jurisdiction=${jurisdiction}&sourceEventNumber=${outage.sourceEventNumber}`;
        const detailResponse = await fetch(detailUrl, { method: 'GET', headers });

        if (!detailResponse.ok) {
          return outage;
        }

        const detailJson = (await detailResponse.json()) as { data: OutageDetail };
        return detailJson.data;
      } catch {
        return outage;
      }
    });

    const enrichedOutages = await Promise.all(detailPromises);

    const responseBody = JSON.stringify({ data: enrichedOutages, errorMessages: [] });

    // Store in KV cache (15min TTL); failures are non-fatal
    try {
      await context.env.CACHE.put(CACHE_KEY, responseBody, { expirationTtl: 900 });
    } catch (e) {
      console.error('KV cache write error:', e);
    }

    return new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=900',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch Duke Energy outages' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
