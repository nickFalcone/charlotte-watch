import type { Env } from '../_lib/env';

const OPENWEBNINJA_HOST = 'real-time-news-data.p.rapidapi.com';

export const onRequestGet: PagesFunction<Env> = async context => {
  const apiKey = context.env.RAPIDAPI_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'RapidAPI key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(context.request.url);
  const query =
    url.searchParams.get('query') ?? url.searchParams.get('q') ?? 'charlotte north carolina';
  const timePublished = url.searchParams.get('time_published') ?? '1d';

  try {
    const params = new URLSearchParams({ query, time_published: timePublished });
    const response = await fetch(`https://${OPENWEBNINJA_HOST}/search?${params}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': OPENWEBNINJA_HOST,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(
        JSON.stringify({
          error: `OpenWebNinja API returned ${response.status}`,
          detail: text.slice(0, 200),
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.text();

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch news',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
