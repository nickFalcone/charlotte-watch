import type { Handler } from '@netlify/functions';

const handler: Handler = async () => {
  try {
    const response = await fetch('https://nasstatus.faa.gov/api/airport-status-information');

    const data = await response.text();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/xml',
      },
      body: data,
    };
  } catch {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch FAA status' }),
    };
  }
};

export { handler };
