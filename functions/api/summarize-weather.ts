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
  time?: string;
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  weather_code: number;
}

interface WeatherHourInput {
  time: string;
  temperature_2m: number;
  precipitation_probability: number;
  wind_speed_10m: number;
}

interface AirQualityHourInput {
  time: string;
  european_aqi: number;
}

interface SummarizeWeatherRequest {
  current: WeatherCurrentInput;
  hourly: WeatherHourInput[];
  past_12h?: WeatherHourInput[];
  hash: string;
  air_quality_next_12h?: AirQualityHourInput[];
  air_quality_past_12h?: AirQualityHourInput[];
}

function summarizeBlock(slots: WeatherHourInput[]): string {
  if (slots.length === 0) return 'no data';
  const temps = slots.map(s => s.temperature_2m);
  const precip = slots.map(s => s.precipitation_probability);
  const wind = slots.map(s => s.wind_speed_10m);
  const tempMin = Math.round(Math.min(...temps));
  const tempMax = Math.round(Math.max(...temps));
  const precipMax = Math.round(Math.max(...precip));
  const windAvg = Math.round(wind.reduce((a, b) => a + b, 0) / wind.length);
  return `temp ${tempMin}-${tempMax} F, precip up to ${precipMax}%, wind ~${windAvg} mph`;
}

interface SummarizeWeatherResponse {
  summary: string;
  hash: string;
  generatedAt: string;
}

/**
 * Temperature trend: now (current) vs end of next 12 hours (last hourly slot).
 */
function getTemperaturePhrase(current: WeatherCurrentInput, hourly: WeatherHourInput[]): string {
  const firstTemp = current.temperature_2m;
  const lastTemp =
    hourly.length > 0 ? hourly[hourly.length - 1].temperature_2m : current.temperature_2m;
  const first = Math.round(firstTemp);
  const last = Math.round(lastTemp);
  if (last > first) return `Temperatures rising from ${first} to ${last} F`;
  if (last < first) return `Temperatures falling from ${first} to ${last} F`;
  return `Temperatures steady around ${first} F`;
}

function summarizeAqiRange(slots: AirQualityHourInput[]): string {
  if (slots.length === 0) return 'no data';
  const values = slots.map(s => s.european_aqi);
  const min = Math.round(Math.min(...values));
  const max = Math.round(Math.max(...values));
  return `European AQI ${min}-${max}`;
}

function buildUserPrompt(
  current: WeatherCurrentInput,
  hourly: WeatherHourInput[],
  past12h: WeatherHourInput[],
  temperaturePhrase: string,
  airQualityNext12h?: AirQualityHourInput[],
  airQualityPast12h?: AirQualityHourInput[]
): string {
  const currentBlock = `Current conditions (now): ${Math.round(current.temperature_2m)} F (feels ${Math.round(current.apparent_temperature)} F), humidity ${current.relative_humidity_2m}%, wind ${Math.round(current.wind_speed_10m)} mph.`;
  const next12Summary = summarizeBlock(hourly);
  const past12Summary = summarizeBlock(past12h);

  let prompt = `Temperature trend (for context): ${temperaturePhrase}\n\n${currentBlock}\n\nNext 12 hours (forecast): ${next12Summary}\n\nPrior 12 hours (for comparison): ${past12Summary}`;

  if (
    (airQualityNext12h && airQualityNext12h.length > 0) ||
    (airQualityPast12h && airQualityPast12h.length > 0)
  ) {
    const aqNext = airQualityNext12h?.length ? summarizeAqiRange(airQualityNext12h) : 'no data';
    const aqPast = airQualityPast12h?.length ? summarizeAqiRange(airQualityPast12h) : 'no data';
    prompt += `\n\nAir quality (European AQI): Next 12h: ${aqNext}. Prior 12h: ${aqPast}. Mention air quality ONLY when AQI exceeds 100 (see system prompt).`;
  }

  return prompt;
}

export const onRequestPost: PagesFunction<Env> = async context => {
  const { provider, apiKey } = getAIProvider(context.env);

  const apiKeyError = validateAPIKey(apiKey, provider);
  if (apiKeyError) return apiKeyError;

  const request = await parseJSONRequest<SummarizeWeatherRequest>(context.request);
  if (request instanceof Response) return request;

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
  const past12h = Array.isArray(request.past_12h) ? request.past_12h.slice(0, 12) : [];
  const airQualityNext12h = Array.isArray(request.air_quality_next_12h)
    ? request.air_quality_next_12h.slice(0, 12)
    : undefined;
  const airQualityPast12h = Array.isArray(request.air_quality_past_12h)
    ? request.air_quality_past_12h.slice(0, 12)
    : undefined;
  const temperaturePhrase = getTemperaturePhrase(request.current, hourly);

  try {
    const userPrompt = buildUserPrompt(
      request.current,
      hourly,
      past12h,
      temperaturePhrase,
      airQualityNext12h,
      airQualityPast12h
    );
    let summary: string;

    if (provider === 'anthropic') {
      summary = await callAnthropic(WEATHER_SYSTEM_PROMPT, userPrompt, apiKey, 350);
    } else {
      summary = await callOpenAIResponses({
        apiKey,
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
