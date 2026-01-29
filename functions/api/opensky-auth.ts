import type { Env } from '../_lib/env';

export const onRequestGet: PagesFunction<Env> = async context => {
  const clientId = context.env.OPENSKY_CLIENT_ID;
  const clientSecret = context.env.OPENSKY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: 'OpenSky credentials not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check KV cache (5min TTL -- short because tokens expire)
  const CACHE_KEY = 'alerts:opensky-auth';
  try {
    const cached = await context.env.CACHE.get(CACHE_KEY);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=300',
        },
      });
    }
  } catch (e) {
    console.error('KV cache read error:', e);
  }

  try {
    const response = await fetch(
      'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      }
    );

    const data = await response.json();
    const responseBody = JSON.stringify(data);

    if (response.ok) {
      // Store in KV cache (5min TTL); failures are non-fatal
      try {
        await context.env.CACHE.put(CACHE_KEY, responseBody, { expirationTtl: 300 });
      } catch (e) {
        console.error('KV cache write error:', e);
      }
    }

    return new Response(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch token' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Also support POST for token refresh
export const onRequestPost = onRequestGet;
