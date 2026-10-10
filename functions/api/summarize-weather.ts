import type { Env } from '../_lib/env';
import { callOpenAIResponses } from '../_lib/openaiResponses';
import {
  getAIProvider,
  validateAPIKey,
  parseJSONRequest,
  checkCache,
  sha256Hex,
  storeInCache,
  createSuccessResponse,
  createErrorResponse,
  callAnthropic,
  SUMMARY_UNAVAILABLE,
} from '../_lib/summarizationHelpers';
import { AI_MAX_OUTPUT_TOKENS, OPENAI_MODEL, OPENAI_REASONING_EFFORT } from '../_lib/aiModels';
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
  currentTime?: string; // ignored: the server formats the current time itself
  current: WeatherCurrentInput;
  hourly: WeatherHourInput[]; // next 12 slots, already filtered client-side
  hash?: string; // ignored: the cache key is derived from the validated content
}

interface SummarizeWeatherResponse {
  summary: string;
  hash: string;
  generatedAt: string;
}

/** Slot labels are formatted client-side as "3 PM" or "2 AM (Fri)"; reject anything else. */
const TIME_LABEL_PATTERN = /^\d{1,2} [AP]M( \([A-Z][a-z]{2}\))?$/;

const currentTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

function isNumberIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function parseCurrent(raw: unknown): WeatherCurrentInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  if (
    !isNumberIn(c.temperature_2m, -100, 150) ||
    !isNumberIn(c.apparent_temperature, -150, 200) ||
    !isNumberIn(c.relative_humidity_2m, 0, 100) ||
    !isNumberIn(c.wind_speed_10m, 0, 300)
  ) {
    return null;
  }
  return {
    temperature_2m: c.temperature_2m,
    apparent_temperature: c.apparent_temperature,
    relative_humidity_2m: c.relative_humidity_2m,
    wind_speed_10m: c.wind_speed_10m,
  };
}

function parseHourly(raw: unknown[]): WeatherHourInput[] | null {
  const rows: WeatherHourInput[] = [];
  for (const item of raw.slice(0, 12)) {
    if (!item || typeof item !== 'object') return null;
    const h = item as Record<string, unknown>;
    if (
      typeof h.timeLabel !== 'string' ||
      !TIME_LABEL_PATTERN.test(h.timeLabel) ||
      !isNumberIn(h.temperature_2m, -100, 150) ||
      !isNumberIn(h.precipitation_probability, 0, 100) ||
      !isNumberIn(h.wind_speed_10m, 0, 300)
    ) {
      return null;
    }
    rows.push({
      timeLabel: h.timeLabel,
      temperature_2m: h.temperature_2m,
      precipitation_probability: h.precipitation_probability,
      wind_speed_10m: h.wind_speed_10m,
    });
  }
  return rows;
}

function badRequest(error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
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

  if (!request.current || typeof request.current !== 'object') {
    return badRequest('current object is required');
  }

  if (!request.hourly || !Array.isArray(request.hourly)) {
    return badRequest('hourly array is required');
  }

  const current = parseCurrent(request.current);
  if (!current) return badRequest('current contains invalid values');

  const hourly = parseHourly(request.hourly);
  if (!hourly) return badRequest('hourly contains invalid values');

  // The cache key is a SHA-256 of the validated data sent to the model, never the
  // client-supplied hash, so a caller can only populate the entry for the data they
  // submitted. The current time is excluded (it changes every minute and is generated here).
  // The OpenAI key includes the model so deploys on different models sharing one KV
  // namespace never serve each other's summaries.
  const contentHash = await sha256Hex(JSON.stringify({ current, hourly }));
  const cacheKey =
    provider === 'openai'
      ? `weather-summary:${OPENAI_MODEL}:${contentHash}`
      : `weather-summary:${contentHash}`;
  const cachedResponse = await checkCache(context.env.CACHE, cacheKey);
  if (cachedResponse) return cachedResponse;

  try {
    const userPrompt = buildUserPrompt(currentTimeFormatter.format(new Date()), current, hourly);
    let summary: string;

    if (provider === 'anthropic') {
      summary = await callAnthropic(
        WEATHER_SYSTEM_PROMPT,
        userPrompt,
        key,
        AI_MAX_OUTPUT_TOKENS.weather.anthropic
      );
    } else {
      summary = await callOpenAIResponses({
        apiKey: key,
        model: OPENAI_MODEL,
        instructions: WEATHER_SYSTEM_PROMPT,
        input: userPrompt,
        maxOutputTokens: AI_MAX_OUTPUT_TOKENS.weather.openai,
        reasoningEffort: OPENAI_REASONING_EFFORT,
      });
    }

    const response: SummarizeWeatherResponse = {
      summary,
      hash: contentHash,
      generatedAt: new Date().toISOString(),
    };

    const responseBody = JSON.stringify(response);

    // Don't cache an empty result.
    if (summary !== SUMMARY_UNAVAILABLE) {
      await storeInCache(context.env.CACHE, cacheKey, responseBody);
    }

    return createSuccessResponse(responseBody);
  } catch (error) {
    return createErrorResponse(error, 'Failed to generate summary');
  }
};
