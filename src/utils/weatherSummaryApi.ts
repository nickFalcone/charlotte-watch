import type { OpenMeteoResponse, OpenMeteoAirQualityResponse } from '../types/weather';

export interface WeatherSummaryResponse {
  summary: string;
  hash: string;
  generatedAt: string;
}

export interface AirQualityHourInput {
  time: string;
  european_aqi: number;
}

interface WeatherCurrentInput {
  time: string;
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

/** Index of first hourly slot at or after current time (next 12 hours from now). */
function getNext12HoursStartIndex(
  hourly: OpenMeteoResponse['hourly'],
  currentTime: string
): number {
  if (!hourly || hourly.time.length === 0) return 0;
  const i = hourly.time.findIndex((t: string) => t >= currentTime);
  return i >= 0 ? i : 0;
}

/** Index of first hourly slot at or after current time in air quality hourly. */
function getAQNext12StartIndex(
  aqHourly: OpenMeteoAirQualityResponse['hourly'],
  currentTime: string
): number {
  if (!aqHourly || aqHourly.time.length === 0) return 0;
  const i = aqHourly.time.findIndex((t: string) => t >= currentTime);
  return i >= 0 ? i : 0;
}

/** Next 12h and past 12h AQI slices aligned to weather current time. */
export function prepareAirQualityNextAndPast12h(
  airQuality: OpenMeteoAirQualityResponse | undefined,
  currentTime: string
): { next_12h: AirQualityHourInput[]; past_12h: AirQualityHourInput[] } {
  const hourly = airQuality?.hourly;
  if (!hourly || !hourly.time.length || !hourly.european_aqi?.length) {
    return { next_12h: [], past_12h: [] };
  }
  const start = getAQNext12StartIndex(hourly, currentTime);
  const nextN = Math.min(12, hourly.time.length - start);
  const next_12h = Array.from({ length: nextN }, (_, i) => ({
    time: hourly.time[start + i],
    european_aqi: hourly.european_aqi[start + i],
  }));
  const pastStart = Math.max(0, start - 12);
  const pastN = start - pastStart;
  const past_12h =
    pastN <= 0
      ? []
      : Array.from({ length: pastN }, (_, i) => ({
          time: hourly.time[pastStart + i],
          european_aqi: hourly.european_aqi[pastStart + i],
        }));
  return { next_12h, past_12h };
}

/**
 * Compute a stable hash from current + next 12 hours (from now) for cache invalidation.
 * Optionally includes air quality forecast when provided.
 */
export function computeWeatherSummaryHash(
  weather: OpenMeteoResponse,
  airQuality?: OpenMeteoAirQualityResponse
): string {
  const current = weather.current;
  const hourly = weather.hourly;
  let input: string;
  if (!hourly) {
    input = `${current.time}:${current.temperature_2m}:${current.relative_humidity_2m}`;
  } else {
    const start = getNext12HoursStartIndex(hourly, current.time);
    const temps = hourly.temperature_2m.slice(start, start + 12);
    const precip = hourly.precipitation_probability.slice(start, start + 12);
    const wind = hourly.wind_speed_10m.slice(start, start + 12);
    const pastStart = Math.max(0, start - 12);
    const pastTemps = hourly.temperature_2m.slice(pastStart, start);
    const pastPrecip = hourly.precipitation_probability.slice(pastStart, start);
    const pastWind = hourly.wind_speed_10m.slice(pastStart, start);
    input = `${current.time}:${temps.join(',')}:${precip.join(',')}:${wind.join(',')}:${pastTemps.join(',')}:${pastPrecip.join(',')}:${pastWind.join(',')}`;
  }
  const { next_12h, past_12h } = prepareAirQualityNextAndPast12h(airQuality, current.time);
  if (next_12h.length > 0 || past_12h.length > 0) {
    input += `:aq_next:${next_12h.map(h => h.european_aqi).join(',')}:aq_past:${past_12h.map(h => h.european_aqi).join(',')}`;
  }
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function prepareCurrent(weather: OpenMeteoResponse): WeatherCurrentInput {
  const c = weather.current;
  return {
    time: c.time,
    temperature_2m: c.temperature_2m,
    apparent_temperature: c.apparent_temperature,
    relative_humidity_2m: c.relative_humidity_2m,
    wind_speed_10m: c.wind_speed_10m,
    wind_direction_10m: c.wind_direction_10m,
    weather_code: c.weather_code,
  };
}

/** Next 12 hours from now (first slot at or after current.time). */
function prepareNext12h(weather: OpenMeteoResponse): WeatherHourInput[] {
  const hourly = weather.hourly;
  if (!hourly) return [];
  const start = getNext12HoursStartIndex(hourly, weather.current.time);
  const n = Math.min(12, hourly.time.length - start);
  return Array.from({ length: n }, (_, i) => ({
    time: hourly.time[start + i],
    temperature_2m: hourly.temperature_2m[start + i],
    precipitation_probability: hourly.precipitation_probability[start + i],
    wind_speed_10m: hourly.wind_speed_10m[start + i],
  }));
}

/** Past 12 hours (12 slots before "now"). */
function preparePast12h(weather: OpenMeteoResponse): WeatherHourInput[] {
  const hourly = weather.hourly;
  if (!hourly) return [];
  const start = getNext12HoursStartIndex(hourly, weather.current.time);
  const pastStart = Math.max(0, start - 12);
  const n = start - pastStart;
  if (n <= 0) return [];
  return Array.from({ length: n }, (_, i) => ({
    time: hourly.time[pastStart + i],
    temperature_2m: hourly.temperature_2m[pastStart + i],
    precipitation_probability: hourly.precipitation_probability[pastStart + i],
    wind_speed_10m: hourly.wind_speed_10m[pastStart + i],
  }));
}

/**
 * Fetch AI-generated summary: next 12 hours vs prior 12 hours, ~3 sentences prose.
 * Optionally includes air quality forecast (next/past 12h) for the prompt.
 */
export async function fetchWeatherSummary(
  weather: OpenMeteoResponse,
  hash: string,
  signal?: AbortSignal,
  airQuality?: OpenMeteoAirQualityResponse
): Promise<WeatherSummaryResponse> {
  const API_URL = '/api/summarize-weather';
  const { next_12h: airQualityNext12h, past_12h: airQualityPast12h } =
    prepareAirQualityNextAndPast12h(airQuality, weather.current.time);

  const body: Record<string, unknown> = {
    current: prepareCurrent(weather),
    hourly: prepareNext12h(weather),
    past_12h: preparePast12h(weather),
    hash,
  };
  if (airQualityNext12h.length > 0 || airQualityPast12h.length > 0) {
    body.air_quality_next_12h = airQualityNext12h;
    body.air_quality_past_12h = airQualityPast12h;
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    const msg = errorData.message ?? errorData.error ?? `API error: ${response.status}`;
    throw new Error(msg);
  }

  return response.json();
}
