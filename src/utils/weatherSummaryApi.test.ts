import { describe, it, expect, vi, afterEach } from 'vitest';
import { computeWeatherHash, buildWeatherSummaryPayload } from './weatherSummaryApi';
import type { OpenMeteoResponse } from '../types';

function makeWeather(overrides: Partial<OpenMeteoResponse> = {}): OpenMeteoResponse {
  return {
    latitude: 35.22,
    longitude: -80.84,
    generationtime_ms: 1,
    utc_offset_seconds: -18000, // EST (UTC-5)
    timezone: 'America/New_York',
    timezone_abbreviation: 'EST',
    elevation: 200,
    current_units: {},
    current: {
      time: '2024-02-20T15:00',
      interval: 900,
      temperature_2m: 52,
      apparent_temperature: 48,
      relative_humidity_2m: 55,
      weather_code: 0,
      cloud_cover: 10,
      wind_speed_10m: 8,
      wind_direction_10m: 270,
    },
    ...overrides,
  };
}

function makeHourly(startHour: number, count: number, dateStr = '2024-02-20') {
  return {
    time: Array.from({ length: count }, (_, i) => {
      const h = startHour + i;
      const d = h >= 24 ? '2024-02-21' : dateStr;
      const hh = h >= 24 ? h - 24 : h;
      return `${d}T${String(hh).padStart(2, '0')}:00`;
    }),
    temperature_2m: Array.from({ length: count }, (_, i) => 50 + i),
    apparent_temperature: Array.from({ length: count }, (_, i) => 47 + i),
    precipitation_probability: Array.from({ length: count }, (_, i) => i * 5),
    wind_speed_10m: Array.from({ length: count }, () => 10),
    wind_direction_10m: Array.from({ length: count }, () => 270),
  };
}

describe('computeWeatherHash', () => {
  it('returns "empty" for zero-length array', () => {
    expect(computeWeatherHash([])).toBe('empty');
  });

  it('returns the same hash for identical inputs', () => {
    const slots = [
      { timeLabel: '3 PM', temperature_2m: 52, precipitation_probability: 10, wind_speed_10m: 8 },
    ];
    expect(computeWeatherHash(slots)).toBe(computeWeatherHash(slots));
  });

  it('returns different hashes when temperature changes', () => {
    const a = [
      { timeLabel: '3 PM', temperature_2m: 52, precipitation_probability: 10, wind_speed_10m: 8 },
    ];
    const b = [
      { timeLabel: '3 PM', temperature_2m: 60, precipitation_probability: 10, wind_speed_10m: 8 },
    ];
    expect(computeWeatherHash(a)).not.toBe(computeWeatherHash(b));
  });

  it('returns different hashes when timeLabel changes (window shifted)', () => {
    const a = [
      { timeLabel: '3 PM', temperature_2m: 52, precipitation_probability: 10, wind_speed_10m: 8 },
    ];
    const b = [
      { timeLabel: '4 PM', temperature_2m: 52, precipitation_probability: 10, wind_speed_10m: 8 },
    ];
    expect(computeWeatherHash(a)).not.toBe(computeWeatherHash(b));
  });

  it('returns different hashes when precipitation changes', () => {
    const a = [
      { timeLabel: '3 PM', temperature_2m: 52, precipitation_probability: 0, wind_speed_10m: 8 },
    ];
    const b = [
      { timeLabel: '3 PM', temperature_2m: 52, precipitation_probability: 60, wind_speed_10m: 8 },
    ];
    expect(computeWeatherHash(a)).not.toBe(computeWeatherHash(b));
  });
});

describe('buildWeatherSummaryPayload', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when hourly data is missing', () => {
    const weather = makeWeather();
    expect(buildWeatherSummaryPayload(weather)).toBeNull();
  });

  it('returns null when all hourly slots are in the past', () => {
    // hourly covers 00:00–11:00, but current time is 15:00 → no future slots
    const weather = makeWeather({ hourly: makeHourly(0, 12) });
    // utc_offset_seconds = -18000 (EST), so Charlotte time = UTC - 5h
    // Date.now() in test environment is real; we need the hourly to be in the future.
    // This test uses past times to verify the expiry guard.
    const result = buildWeatherSummaryPayload(weather);
    // In test environment real Date.now() is used; hourly from makeHourly(0,12)
    // covers 2024-02-20T00:00–11:00 which is in the past → should be null.
    expect(result).toBeNull();
  });

  it('returns a payload with the correct shape when hourly data has future slots', () => {
    // Build hourly starting far enough in the future that it won't expire in tests.
    // Use year 2099 to guarantee future timestamps.
    const futureHourly = {
      time: Array.from({ length: 24 }, (_, i) => `2099-06-15T${String(i).padStart(2, '0')}:00`),
      temperature_2m: Array.from({ length: 24 }, (_, i) => 70 + i),
      apparent_temperature: Array.from({ length: 24 }, (_, i) => 68 + i),
      precipitation_probability: Array.from({ length: 24 }, (_, i) => i * 3),
      wind_speed_10m: Array.from({ length: 24 }, () => 5),
      wind_direction_10m: Array.from({ length: 24 }, () => 180),
    };
    const weather = makeWeather({ hourly: futureHourly });
    const payload = buildWeatherSummaryPayload(weather);

    expect(payload).not.toBeNull();
    expect(payload!.current.temperature_2m).toBe(52);
    expect(payload!.current.apparent_temperature).toBe(48);
    expect(payload!.current.relative_humidity_2m).toBe(55);
    expect(payload!.current.wind_speed_10m).toBe(8);
    expect(payload!.hourly.length).toBeLessThanOrEqual(12);
    expect(payload!.hourly[0]).toHaveProperty('timeLabel');
    expect(payload!.hourly[0]).toHaveProperty('temperature_2m');
    expect(payload!.hourly[0]).toHaveProperty('precipitation_probability');
    expect(payload!.hash).toBeTruthy();
    expect(payload!.currentTime).toBeTruthy();
  });

  it('caps hourly slots at 12', () => {
    const futureHourly = {
      time: Array.from({ length: 48 }, (_, i) => {
        const d = i < 24 ? '2099-06-15' : '2099-06-16';
        return `${d}T${String(i % 24).padStart(2, '0')}:00`;
      }),
      temperature_2m: Array.from({ length: 48 }, () => 70),
      apparent_temperature: Array.from({ length: 48 }, () => 68),
      precipitation_probability: Array.from({ length: 48 }, () => 0),
      wind_speed_10m: Array.from({ length: 48 }, () => 5),
      wind_direction_10m: Array.from({ length: 48 }, () => 180),
    };
    const weather = makeWeather({ hourly: futureHourly });
    const payload = buildWeatherSummaryPayload(weather);
    expect(payload!.hourly.length).toBe(12);
  });

  it('produces stable hash for same future hourly data', () => {
    const futureHourly = {
      time: Array.from({ length: 12 }, (_, i) => `2099-06-15T${String(i).padStart(2, '0')}:00`),
      temperature_2m: Array.from({ length: 12 }, () => 70),
      apparent_temperature: Array.from({ length: 12 }, () => 68),
      precipitation_probability: Array.from({ length: 12 }, () => 10),
      wind_speed_10m: Array.from({ length: 12 }, () => 5),
      wind_direction_10m: Array.from({ length: 12 }, () => 180),
    };
    const weather = makeWeather({ hourly: futureHourly });
    const p1 = buildWeatherSummaryPayload(weather);
    const p2 = buildWeatherSummaryPayload(weather);
    expect(p1!.hash).toBe(p2!.hash);
  });

  it('appends day name to time labels that cross midnight', () => {
    // Fix "now" to 2024-02-20T20:00:00 UTC.
    // With utc_offset_seconds = -18000 (EST), Charlotte "now" = 15:00 on 2024-02-20.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-02-20T20:00:00Z'));

    // 12 slots from 15:00 today → 02:00 tomorrow
    const hourly = {
      time: Array.from({ length: 12 }, (_, i) => {
        const hour = 15 + i;
        const d = hour < 24 ? '2024-02-20' : '2024-02-21';
        return `${d}T${String(hour % 24).padStart(2, '0')}:00`;
      }),
      temperature_2m: Array.from({ length: 12 }, () => 65),
      apparent_temperature: Array.from({ length: 12 }, () => 63),
      precipitation_probability: Array.from({ length: 12 }, () => 0),
      wind_speed_10m: Array.from({ length: 12 }, () => 5),
      wind_direction_10m: Array.from({ length: 12 }, () => 180),
    };
    const weather = makeWeather({ hourly });
    const payload = buildWeatherSummaryPayload(weather);

    vi.useRealTimers();

    expect(payload).not.toBeNull();
    // Slots crossing midnight should include a day name in parentheses
    const crossMidnight = payload!.hourly.filter(h => h.timeLabel.includes('('));
    expect(crossMidnight.length).toBeGreaterThan(0);
    // Same-day slots should not include parentheses
    const sameDay = payload!.hourly.filter(h => !h.timeLabel.includes('('));
    expect(sameDay.length).toBeGreaterThan(0);
  });
});
