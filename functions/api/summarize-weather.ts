import type { Env } from '../_lib/env';
import { callOpenAIResponses } from '../_lib/openaiResponses';
import {
  getAIProvider,
  validateAPIKey,
  parseJSONRequest,
  checkCache,
  storeInCache,
  createSuccessResponse,
  createErrorResponse,
  callAnthropic,
} from '../_lib/summarizationHelpers';
import weatherSummaryPrompt from '../../src/prompts/weatherSummary.json';

const WEATHER_SYSTEM_PROMPT: string = weatherSummaryPrompt.systemPrompt;

interface WeatherCurrentInput {
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
}

interface WeatherHourInput {
  timeLabel: string; // pre-formatted client-side: "3 PM", "2 AM (Fri)"
  temperature_2m: number;
  precipitation_probability: number;
  wind_speed_10m: number;
}

interface SummarizeWeatherRequest {
  currentTime: string; // "Thursday, February 20 at 2:45 PM EST"
  current: WeatherCurrentInput;
  hourly: WeatherHourInput[]; // next 12 slots, already filtered client-side
  hash: string;
}

interface SummarizeWeatherResponse {
  summary: string;
  hash: string;
  generatedAt: string;
}

function buildUserPrompt(
  currentTime: string,
  current: WeatherCurrentInput,
  hourly: WeatherHourInput[]
): string {
  const rows = hourly
    .map(
      h =>
        `${h.timeLabel}: ${Math.round(h.temperature_2m)}°F, ${h.precipitation_probability}% precip, ${Math.round(h.wind_speed_10m)} mph wind`
    )
    .join('\n');

  return [
    `Current time: ${currentTime}`,
    ``,
    `Current: ${Math.round(current.temperature_2m)}°F (feels ${Math.round(current.apparent_temperature)}°F), humidity ${current.relative_humidity_2m}%, wind ${Math.round(current.wind_speed_10m)} mph`,
    ``,
    `Next 12 hours:`,
    rows,
  ].join('\n');
}

export const onRequestPost: PagesFunction<Env> = async context => {
  const { provider, apiKey } = getAIProvider(context.env);

  const apiKeyError = validateAPIKey(apiKey, provider);
  if (apiKeyError) return apiKeyError;
  const key = apiKey as string;

  const request = await parseJSONRequest<SummarizeWeatherRequest>(context.request);
  if (request instanceof Response) return request;

  if (!request.currentTime || typeof request.currentTime !== 'string') {
    return new Response(JSON.stringify({ error: 'currentTime string is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!request.current || typeof request.current !== 'object') {
    return new Response(JSON.stringify({ error: 'current object is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!request.hourly || !Array.isArray(request.hourly)) {
    return new Response(JSON.stringify({ error: 'hourly array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!request.hash || typeof request.hash !== 'string') {
    return new Response(JSON.stringify({ error: 'hash string is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cacheKey = `weather-summary:${request.hash}`;
  const cachedResponse = await checkCache(context.env.CACHE, cacheKey);
  if (cachedResponse) return cachedResponse;

  const hourly = request.hourly.slice(0, 12);

  try {
    const userPrompt = buildUserPrompt(request.currentTime, request.current, hourly);
    let summary: string;

    if (provider === 'anthropic') {
      summary = await callAnthropic(WEATHER_SYSTEM_PROMPT, userPrompt, key, 350);
    } else {
      summary = await callOpenAIResponses({
        apiKey: key,
        model: 'gpt-4o-mini',
        instructions: WEATHER_SYSTEM_PROMPT,
        input: userPrompt,
        maxOutputTokens: 350,
        temperature: 0.3,
      });
    }

    const response: SummarizeWeatherResponse = {
      summary,
      hash: request.hash,
      generatedAt: new Date().toISOString(),
    };

    const responseBody = JSON.stringify(response);

    await storeInCache(context.env.CACHE, cacheKey, responseBody);

    return createSuccessResponse(responseBody);
  } catch (error) {
    return createErrorResponse(error, 'Failed to generate summary');
  }
};
