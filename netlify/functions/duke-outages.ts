import type { Handler } from '@netlify/functions';

// Charlotte, NC coordinates
const CHARLOTTE_LAT = 35.2271;
const CHARLOTTE_LNG = -80.8431;

// ~30 mile radius in degrees
// Latitude: 30mi / 69mi per degree ≈ 0.44°
// Longitude: 30mi / (69 * cos(35°)) ≈ 0.53°
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

const handler: Handler = async () => {
  const dukeUrl = process.env.DUKE_OUTAGE_URL;
  const dukeAuth = process.env.DUKE_OUTAGE_AUTH;

  if (!dukeUrl || !dukeAuth) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Duke Energy API configuration missing' }),
    };
  }

  const headers = {
    Accept: 'application/json',
    Authorization: dukeAuth,
  };

  try {
    // Step 1: Fetch list of all outages
    const listResponse = await fetch(dukeUrl, { method: 'GET', headers });

    if (!listResponse.ok) {
      return {
        statusCode: listResponse.status,
        body: JSON.stringify({ error: 'Failed to fetch outage list' }),
      };
    }

    const listJson = (await listResponse.json()) as { data?: OutageListItem[] } | OutageListItem[];
    // API may return { data: [...] } or raw array
    const listData = Array.isArray(listJson) ? listJson : listJson.data || [];

    // Step 2: Filter to outages within ~30 miles of Charlotte
    const nearbyOutages = listData.filter(outage =>
      isWithinRadius(outage.deviceLatitudeLocation, outage.deviceLongitudeLocation)
    );

    if (nearbyOutages.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [], errorMessages: [] }),
      };
    }

    // Step 3: Build detail URL base from list URL
    // List: .../outages?jurisdiction=DEC
    // Detail: .../outages/outage?jurisdiction=DEC&sourceEventNumber=X
    const urlObj = new URL(dukeUrl);
    const jurisdiction = urlObj.searchParams.get('jurisdiction') || 'DEC';
    const detailBaseUrl = `${urlObj.origin}${urlObj.pathname}/outage`;

    // Step 4: Fetch details for each nearby outage in parallel
    const detailPromises = nearbyOutages.map(async outage => {
      try {
        const detailUrl = `${detailBaseUrl}?jurisdiction=${jurisdiction}&sourceEventNumber=${outage.sourceEventNumber}`;
        const detailResponse = await fetch(detailUrl, { method: 'GET', headers });

        if (!detailResponse.ok) {
          // Fall back to list data if detail fetch fails
          return outage;
        }

        const detailJson = (await detailResponse.json()) as { data: OutageDetail };
        return detailJson.data;
      } catch {
        // Fall back to list data on error
        return outage;
      }
    });

    const enrichedOutages = await Promise.all(detailPromises);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: enrichedOutages, errorMessages: [] }),
    };
  } catch {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch Duke Energy outages' }),
    };
  }
};

export { handler };
