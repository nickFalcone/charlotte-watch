import type { Env } from '../_lib/env';

/**
 * HERE Traffic Flow API (standard Traffic, not Advanced Traffic)
 *
 * Uses the standard Traffic API (5,000 free transactions/month). We intentionally
 * avoid Advanced Traffic (2,500/month) by NOT using: advancedFeatures (e.g.
 * deepCoverage), useRefReplacements, or in=corridor with those options.
 *
 * Query params are allowlisted to prevent quota abuse: only the geometry and
 * filters needed by the app are accepted. Client-controlled in, locationReferencing,
 * minJamFactor, and maxJamFactor are not forwarded; see ALLOWED_* below.
 */

/** Only geometry used by CHARLOTTE_PRIORITY_ROUTES (20 km around Charlotte). */
const ALLOWED_IN = 'circle:35.22,-80.86;r=20000';

/** locationReferencing: only 'shape' is used by the app. */
const ALLOWED_LOCATION_REFERENCING = 'shape';

/** minJamFactor: only 8 is used (jam 8+ for congestion alerts). */
const ALLOWED_MIN_JAM_FACTOR = '8';

function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequestGet: PagesFunction<Env> = async context => {
  const apiKey = context.env.HERE_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'HERE API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const requestUrl = new URL(context.request.url);
  const inParam = requestUrl.searchParams.get('in');
  const locationReferencingParam = requestUrl.searchParams.get('locationReferencing');
  const minJamFactorParam = requestUrl.searchParams.get('minJamFactor');

  // Allowlist: reject values not used by the app to prevent quota abuse
  if (inParam != null && inParam !== '' && inParam !== ALLOWED_IN) {
    return badRequest(`Invalid parameter: in must be omitted or "${ALLOWED_IN}"`);
  }
  if (
    locationReferencingParam != null &&
    locationReferencingParam !== '' &&
    locationReferencingParam !== ALLOWED_LOCATION_REFERENCING
  ) {
    return badRequest(
      `Invalid parameter: locationReferencing must be omitted or "${ALLOWED_LOCATION_REFERENCING}"`
    );
  }
  if (
    minJamFactorParam != null &&
    minJamFactorParam !== '' &&
    minJamFactorParam !== ALLOWED_MIN_JAM_FACTOR
  ) {
    return badRequest(
      `Invalid parameter: minJamFactor must be omitted or "${ALLOWED_MIN_JAM_FACTOR}"`
    );
  }
  // maxJamFactor: do not read or forward; fixed server-side behavior only

  try {
    const url = new URL('https://data.traffic.hereapi.com/v7/flow');
    url.searchParams.set('in', inParam || ALLOWED_IN);
    url.searchParams.set(
      'locationReferencing',
      locationReferencingParam || ALLOWED_LOCATION_REFERENCING
    );
    url.searchParams.set('minJamFactor', minJamFactorParam || ALLOWED_MIN_JAM_FACTOR);
    url.searchParams.set('apiKey', apiKey);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({
          error: `HERE API error: ${response.status}`,
          details: errorText,
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch HERE traffic flow data',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
