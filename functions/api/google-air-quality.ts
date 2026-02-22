import type { Env } from '../_lib/env';
import { errorResponse } from '../_lib/responseHelpers';

export const onRequestGet: PagesFunction<Env> = async context => {
  const key = context.env.GOOGLE_API_KEY;
  if (!key) return errorResponse('GOOGLE_API_KEY not configured', 500);

  const response = await fetch(
    `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        universalAqi: true,
        location: { latitude: 35.2271, longitude: -80.8431 },
        extraComputations: ['POLLUTANT_CONCENTRATION', 'LOCAL_AQI'],
      }),
    }
  );

  if (!response.ok) {
    return errorResponse(`Google Air Quality API error: ${response.status}`, response.status);
  }

  const data = await response.text();
  return new Response(data, { status: 200, headers: { 'Content-Type': 'application/json' } });
};
