import type { Env } from '../_lib/env';

export const onRequestGet: PagesFunction<Env> = async () => {
  try {
    const response = await fetch('https://nasstatus.faa.gov/api/airport-status-information');
    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch FAA status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
