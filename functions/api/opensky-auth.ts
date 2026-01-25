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

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
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
