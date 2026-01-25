import type { Env } from '../_lib/env';

/**
 * HERE Traffic Flow API (standard Traffic, not Advanced Traffic)
 *
 * Uses the standard Traffic API (5,000 free transactions/month). We intentionally
 * avoid Advanced Traffic (2,500/month) by NOT using: advancedFeatures (e.g.
 * deepCoverage), useRefReplacements, or in=corridor with those options.
 */

const DEFAULT_IN = 'circle:35.22,-80.86;r=20000';

export const onRequestGet: PagesFunction<Env> = async context => {
  const apiKey = context.env.HERE_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'HERE API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const requestUrl = new URL(context.request.url);
    const inParam = requestUrl.searchParams.get('in');
    const locationReferencing = requestUrl.searchParams.get('locationReferencing') || 'shape';
    const inValue = inParam || DEFAULT_IN;

    const url = new URL('https://data.traffic.hereapi.com/v7/flow');
    url.searchParams.set('in', inValue);
    url.searchParams.set('locationReferencing', locationReferencing);

    const minJamFactor = requestUrl.searchParams.get('minJamFactor');
    const maxJamFactor = requestUrl.searchParams.get('maxJamFactor');

    if (minJamFactor != null && minJamFactor !== '') {
      url.searchParams.set('minJamFactor', minJamFactor);
    }
    if (maxJamFactor != null && maxJamFactor !== '') {
      url.searchParams.set('maxJamFactor', maxJamFactor);
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
