import type { Env } from '../_lib/env';
import { callOpenAIResponses } from '../_lib/openaiResponses';
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

async function callAnthropic(
  current: WeatherCurrentInput,
  hourly: WeatherHourInput[],
  past12h: WeatherHourInput[],
  temperaturePhrase: string,
  apiKey: string,
  airQualityNext12h?: AirQualityHourInput[],
  airQualityPast12h?: AirQualityHourInput[]
): Promise<string> {
  const userContent = buildUserPrompt(
    current,
    hourly,
    past12h,
    temperaturePhrase,
    airQualityNext12h,
    airQualityPast12h
  );
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 350,
      system: WEATHER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  interface AnthropicResponse {
    content: Array<{ text?: string }>;
  }

  const data: AnthropicResponse = await response.json();
  return data.content[0]?.text?.trim() || 'Unable to generate summary.';
}

export const onRequestPost: PagesFunction<Env> = async context => {
  const provider = context.env.AI_PROVIDER || 'openai';
  const apiKey =
    provider === 'anthropic' ? context.env.ANTHROPIC_API_KEY : context.env.OPENAI_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: `${provider.toUpperCase()} API key not configured` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  let request: SummarizeWeatherRequest;
  try {
    request = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
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
  try {
    const cached = await context.env.CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=900',
        },
      });
    }
  } catch (e) {
    console.error('KV cache read error:', e);
  }

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
    let summary: string;

    if (provider === 'anthropic') {
      summary = await callAnthropic(
        request.current,
        hourly,
        past12h,
        temperaturePhrase,
        apiKey,
        airQualityNext12h,
        airQualityPast12h
      );
    } else {
      summary = await callOpenAIResponses({
        apiKey,
        model: 'gpt-4o-mini',
        instructions: WEATHER_SYSTEM_PROMPT,
        input: buildUserPrompt(
          request.current,
          hourly,
          past12h,
          temperaturePhrase,
          airQualityNext12h,
          airQualityPast12h
        ),
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

    try {
      await context.env.CACHE.put(cacheKey, responseBody, { expirationTtl: 900 });
    } catch (e) {
      console.error('KV cache write error:', e);
    }

    return new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=900',
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    const cause = err.cause instanceof Error ? err.cause.message : String(err.cause ?? '');
    console.error('Weather summarization error:', err.message, cause || '');
    const message =
      err.message === 'fetch failed' && cause
        ? `fetch failed: ${cause}`
        : err.message === 'fetch failed'
          ? 'Network error calling AI provider. Check OPENAI_API_KEY and connectivity.'
          : err.message;
    return new Response(
      JSON.stringify({
        error: 'Failed to generate summary',
        message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
