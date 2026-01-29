import type { Env } from '../_lib/env';

// Validate stock symbol format to prevent SSRF/injection attacks
const VALID_SYMBOL_PATTERN = /^[A-Z]{1,6}$/;

function isValidSymbol(symbol: string): boolean {
  return VALID_SYMBOL_PATTERN.test(symbol.toUpperCase());
}

export const onRequestGet: PagesFunction<Env> = async context => {
  const apiKey = context.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Finnhub API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(context.request.url);
  const symbol = url.searchParams.get('symbol');

  if (!symbol) {
    return new Response(JSON.stringify({ error: 'Symbol parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isValidSymbol(symbol)) {
    return new Response(JSON.stringify({ error: 'Invalid symbol format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const upperSymbol = symbol.toUpperCase();

  // Check KV cache (15min TTL per symbol, shared across all clients)
  const cacheKey = `stock:quote:${upperSymbol}`;
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

  try {
    const params = new URLSearchParams({ symbol: upperSymbol });
    const response = await fetch(`https://finnhub.io/api/v1/quote?${params}`, {
      method: 'GET',
      headers: {
        'X-Finnhub-Token': apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Finnhub API returned ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.text();

    // Store in KV cache (15min TTL); failures are non-fatal
    try {
      await context.env.CACHE.put(cacheKey, data, { expirationTtl: 900 });
    } catch (e) {
      console.error('KV cache write error:', e);
    }

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=900',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch stock quote',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
