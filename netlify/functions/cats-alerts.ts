import type { Handler } from '@netlify/functions';

const handler: Handler = async () => {
  const apiKey = process.env.TRANSIT_LAND_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'CATS API key not configured' }),
    };
  }

  const CATS_BASE_URL = 'https://transit.land/api/v2/rest';
  const CATS_FEED_ID = 'f-dnq-charlotteareatransitsystem~rt';
  const url = `${CATS_BASE_URL}/feeds/${CATS_FEED_ID}/download_latest_rt/alerts.json`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `CATS API returned ${response.status}` }),
      };
    }

    const data = await response.text();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
      body: data,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch CATS alerts',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export { handler };
