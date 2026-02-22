import type { OpenMeteoResponse } from '../types';
import type { SummarizeResponse } from './alertSummaryApi';

interface WeatherHourInput {
  timeLabel: string;
  temperature_2m: number;
  precipitation_probability: number;
  wind_speed_10m: number;
}

export interface WeatherSummaryPayload {
  currentTime: string;
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
  };
  hourly: WeatherHourInput[];
  hash: string;
}

/**
 * Format an hourly slot's ISO time string (e.g. "2024-02-20T15:00") into a
 * readable clock label. If the date is after today (Charlotte local), the
 * short weekday name is appended: "3 PM" or "2 AM (Fri)".
 *
 * Uses calendar math to avoid browser-timezone dependency.
 */
function formatHourLabel(isoStr: string, nowDateStr: string): string {
  const [datePart, timePart] = isoStr.split('T');
  const hour = parseInt(timePart, 10);
  const ampm = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 || 12;

  if (datePart > nowDateStr) {
    const [y, m, d] = datePart.split('-').map(Number);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[new Date(y, m - 1, d, 12).getDay()];
    return `${h} ${ampm} (${dayName})`;
  }

  return `${h} ${ampm}`;
}

/**
 * Format the current Charlotte local time for the AI prompt.
 * Always uses America/New_York regardless of the user's browser timezone.
 */
function formatCurrentTime(): string {
  return new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Compute a stable hash from the hourly forecast window.
 * Uses djb2 — same pattern as computeAlertsHash.
 * Changing the window (hour rolls over) or new forecast data changes the hash.
 */
export function computeWeatherHash(hourly: WeatherHourInput[]): string {
  if (hourly.length === 0) return 'empty';
  const key = hourly
    .map(h => `${h.timeLabel}:${h.temperature_2m}:${h.precipitation_probability}`)
    .join('|');
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 33) ^ key.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Build the summary payload from Open-Meteo weather data.
 * Returns null if hourly data is missing or has expired (no future slots).
 *
 * Open-Meteo times are local Charlotte wall-clock strings ("2024-02-20T15:00").
 * We use utc_offset_seconds to convert Date.now() into the same format
 * for comparison — this avoids browser-timezone issues.
 */
export function buildWeatherSummaryPayload(
  weather: OpenMeteoResponse
): WeatherSummaryPayload | null {
  if (!weather.hourly) return null;

  const hourly = weather.hourly;

  // Convert current UTC to Charlotte wall-clock time for comparison
  const charlotteMs = Date.now() + weather.utc_offset_seconds * 1000;
  const charlotteNowStr = new Date(charlotteMs).toISOString().slice(0, 16); // "2024-02-20T15:00"
  const charlotteDateStr = charlotteNowStr.slice(0, 10); // "2024-02-20"

  const nowIndex = hourly.time.findIndex(t => t >= charlotteNowStr);
  if (nowIndex === -1) return null; // hourly data has expired

  const slots = hourly.time.slice(nowIndex, nowIndex + 12).map((t, i) => ({
    timeLabel: formatHourLabel(t, charlotteDateStr),
    temperature_2m: hourly.temperature_2m[nowIndex + i],
    precipitation_probability: hourly.precipitation_probability[nowIndex + i],
    wind_speed_10m: hourly.wind_speed_10m[nowIndex + i],
  }));

  const hash = computeWeatherHash(slots);

  return {
    currentTime: formatCurrentTime(),
    current: {
      temperature_2m: weather.current.temperature_2m,
      apparent_temperature: weather.current.apparent_temperature,
      relative_humidity_2m: weather.current.relative_humidity_2m,
      wind_speed_10m: weather.current.wind_speed_10m,
    },
    hourly: slots,
    hash,
  };
}

/**
 * Fetch an AI-generated 12-hour weather briefing.
 * Uses the Cloudflare Pages Function at /api/summarize-weather.
 */
export async function fetchWeatherSummary(
  payload: WeatherSummaryPayload,
  signal?: AbortSignal
): Promise<SummarizeResponse> {
  const response = await fetch('/api/summarize-weather', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { error?: string }).error ?? `API error: ${response.status}`);
  }

  return response.json();
}
