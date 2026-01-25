import type { Handler, HandlerEvent } from '@netlify/functions';

// Validate stock symbol format to prevent SSRF/injection attacks
// US stock symbols: 1-6 uppercase letters (covers standard tickers and some special cases)
const VALID_SYMBOL_PATTERN = /^[A-Z]{1,6}$/;

function isValidSymbol(symbol: string): boolean {
  return VALID_SYMBOL_PATTERN.test(symbol.toUpperCase());
}

const handler: Handler = async (event: HandlerEvent) => {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Finnhub API key not configured' }),
    };
  }

  const symbol = event.queryStringParameters?.symbol;

  if (!symbol) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Symbol parameter is required' }),
    };
  }

  // Validate symbol format to prevent injection attacks
  if (!isValidSymbol(symbol)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid symbol format' }),
    };
  }

  try {
    // Use URLSearchParams to safely encode the symbol parameter
    const params = new URLSearchParams({ symbol: symbol.toUpperCase() });
    const response = await fetch(`https://finnhub.io/api/v1/stock/profile2?${params}`, {
      method: 'GET',
      headers: {
        'X-Finnhub-Token': apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Finnhub API returned ${response.status}` }),
      };
    }

    const data = await response.text();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
      body: data,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch company profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export { handler };
