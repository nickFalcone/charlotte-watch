import type { Env } from '../_lib/env';
import { errorResponse } from '../_lib/responseHelpers';

export const onRequestGet: PagesFunction<Env> = async context => {
  const key = context.env.GOOGLE_API_KEY;
  if (!key) return errorResponse('GOOGLE_API_KEY not configured', 500);

  const params = new URLSearchParams({
    key,
    'location.longitude': '-80.8431',
    'location.latitude': '35.2271',
    days: '1',
  });

  const response = await fetch(`https://pollen.googleapis.com/v1/forecast:lookup?${params}`);

  if (!response.ok) {
    return errorResponse(`Google Pollen API error: ${response.status}`, response.status);
  }

  const data = await response.text();
  return new Response(data, { status: 200, headers: { 'Content-Type': 'application/json' } });
};
