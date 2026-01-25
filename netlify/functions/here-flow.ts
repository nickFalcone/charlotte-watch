import type { Handler, HandlerEvent } from '@netlify/functions';

/**
 * HERE Traffic Flow API (standard Traffic, not Advanced Traffic)
 *
 * Uses the standard Traffic API (5,000 free transactions/month). We intentionally
 * avoid Advanced Traffic (2,500/month) by NOT using: advancedFeatures (e.g.
 * deepCoverage), useRefReplacements, or in=corridor with those options.
 * See: https://www.here.com/docs/bundle/traffic-api-developer-guide-v7/page/README.html
 *
 * Usage: 1 request per alerts refresh. Alerts refetch every 15 min.
 *   - 1 user, 24/7:  ~2,900/mo.  5 users, 24/7: ~14,500/mo (over 5k).
 *   - 1 user, 2h/d:  ~240/mo.    5 users, 2h/d: ~1,200/mo.
 *   - 5 users, 8h/d: ~4,800/mo (just under 5k). Avoid 24/7 with 5+ users on free tier.
 *
 * Query Parameters:
 *   - in: "circle:lat,lng;r=radius_m" or "bbox:south,west,north,east" (optional)
 *   - locationReferencing: "shape" (default) or "tmc" | "olr"
 *   - minJamFactor: only flow items with jam factor >= this (e.g. 7)
 *   - maxJamFactor: only flow items with jam factor <= this (optional)
 *
 * This file is part of the HERE integration feature and can be
 * safely deleted if the feature is removed.
 */

const DEFAULT_IN = 'circle:35.22,-80.86;r=20000';

const handler: Handler = async (event: HandlerEvent) => {
  const apiKey = process.env.HERE_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'HERE API key not configured' }),
    };
  }

  try {
    const q = event.queryStringParameters ?? {};
    const inParam = q.in;
    const locationReferencing = q.locationReferencing || 'shape';
    const inValue = inParam || DEFAULT_IN;

    // Standard Traffic Flow only. Do not add advancedFeatures, useRefReplacements,
    // or in=corridor with those options — that would switch to Advanced Traffic (2.5k/mo).
    const url = new URL('https://data.traffic.hereapi.com/v7/flow');
    url.searchParams.set('in', inValue);
    url.searchParams.set('locationReferencing', locationReferencing);
    if (q.minJamFactor != null && q.minJamFactor !== '') {
      url.searchParams.set('minJamFactor', q.minJamFactor);
    }
    if (q.maxJamFactor != null && q.maxJamFactor !== '') {
      url.searchParams.set('maxJamFactor', q.maxJamFactor);
    }
    url.searchParams.set('apiKey', apiKey);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: `HERE API error: ${response.status}`,
          details: errorText,
        }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch HERE traffic flow data',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export { handler };
