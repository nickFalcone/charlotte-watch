import { describe, it, expect } from 'vitest';
import { computeWeatherSummaryHash, prepareAirQualityNextAndPast12h } from './weatherSummaryApi';
import type { OpenMeteoResponse, OpenMeteoAirQualityResponse } from '../types/weather';

function makeWeatherResponse(overrides: Partial<OpenMeteoResponse> = {}): OpenMeteoResponse {
  return {
    latitude: 35.22,
    longitude: -80.84,
    generationtime_ms: 1,
    utc_offset_seconds: 0,
    timezone: 'UTC',
    timezone_abbreviation: 'UTC',
    elevation: 200,
    current_units: {},
    current: {
      time: '2024-01-15T12:00',
      interval: 900,
      temperature_2m: 45,
      relative_humidity_2m: 60,
      apparent_temperature: 42,
      weather_code: 0,
      cloud_cover: 25,
      wind_speed_10m: 10,
      wind_direction_10m: 180,
    },
    ...overrides,
  };
}

function makeHourlyData(startHour: number, count: number) {
  return {
    time: Array.from({ length: count }, (_, i) => {
      const h = startHour + i;
      return `2024-01-15T${String(h).padStart(2, '0')}:00`;
    }),
    temperature_2m: Array.from({ length: count }, (_, i) => 40 + i),
    precipitation_probability: Array.from({ length: count }, (_, i) => i * 5),
    wind_speed_10m: Array.from({ length: count }, () => 10),
    wind_direction_10m: Array.from({ length: count }, () => 180),
  };
}

describe('computeWeatherSummaryHash', () => {
  it('returns deterministic hash for same input', () => {
    const weather = makeWeatherResponse();
    expect(computeWeatherSummaryHash(weather)).toBe(computeWeatherSummaryHash(weather));
  });

  it('changes when temperature changes', () => {
    const weather1 = makeWeatherResponse();
    const weather2 = makeWeatherResponse({
      current: { ...weather1.current, temperature_2m: 50 },
    });
    expect(computeWeatherSummaryHash(weather1)).not.toBe(computeWeatherSummaryHash(weather2));
  });

  it('includes hourly data in hash when available', () => {
    const base = makeWeatherResponse();
    const withHourly = makeWeatherResponse({
      hourly: makeHourlyData(0, 24),
    });
    expect(computeWeatherSummaryHash(base)).not.toBe(computeWeatherSummaryHash(withHourly));
  });

  it('changes when air quality data is added', () => {
    const weather = makeWeatherResponse({ hourly: makeHourlyData(0, 24) });
    const airQuality: OpenMeteoAirQualityResponse = {
      latitude: 35.22,
      longitude: -80.84,
      generationtime_ms: 1,
      utc_offset_seconds: 0,
      timezone: 'UTC',
      timezone_abbreviation: 'UTC',
      elevation: 200,
      current_units: {},
      current: {
        time: '2024-01-15T12:00',
        interval: 3600,
        european_aqi: 25,
        pm10: 10,
        pm2_5: 5,
        carbon_monoxide: 200,
        nitrogen_dioxide: 10,
        sulphur_dioxide: 5,
        ozone: 40,
        dust: 2,
        uv_index: 3,
        uv_index_clear_sky: 5,
      },
      hourly: {
        time: Array.from({ length: 24 }, (_, i) => `2024-01-15T${String(i).padStart(2, '0')}:00`),
        european_aqi: Array.from({ length: 24 }, () => 25),
      },
    };

    const hashWithout = computeWeatherSummaryHash(weather);
    const hashWith = computeWeatherSummaryHash(weather, airQuality);
    expect(hashWithout).not.toBe(hashWith);
  });

  it('returns a base-36 string', () => {
    const hash = computeWeatherSummaryHash(makeWeatherResponse());
    expect(hash).toMatch(/^[0-9a-z]+$/);
  });
});

describe('prepareAirQualityNextAndPast12h', () => {
  it('returns empty arrays for undefined input', () => {
    const result = prepareAirQualityNextAndPast12h(undefined, '2024-01-15T12:00');
    expect(result).toEqual({ next_12h: [], past_12h: [] });
  });

  it('returns empty arrays when hourly data is empty', () => {
    const aq: OpenMeteoAirQualityResponse = {
      latitude: 35.22,
      longitude: -80.84,
      generationtime_ms: 1,
      utc_offset_seconds: 0,
      timezone: 'UTC',
      timezone_abbreviation: 'UTC',
      elevation: 200,
      current_units: {},
      current: {
        time: '2024-01-15T12:00',
        interval: 3600,
        european_aqi: 25,
        pm10: 10,
        pm2_5: 5,
        carbon_monoxide: 200,
        nitrogen_dioxide: 10,
        sulphur_dioxide: 5,
        ozone: 40,
        dust: 2,
        uv_index: 3,
        uv_index_clear_sky: 5,
      },
      hourly: { time: [], european_aqi: [] },
    };

    const result = prepareAirQualityNextAndPast12h(aq, '2024-01-15T12:00');
    expect(result).toEqual({ next_12h: [], past_12h: [] });
  });

  it('slices next 12h and past 12h correctly', () => {
    const times = Array.from(
      { length: 24 },
      (_, i) => `2024-01-15T${String(i).padStart(2, '0')}:00`
    );
    const aqis = Array.from({ length: 24 }, (_, i) => 20 + i);

    const aq: OpenMeteoAirQualityResponse = {
      latitude: 35.22,
      longitude: -80.84,
      generationtime_ms: 1,
      utc_offset_seconds: 0,
      timezone: 'UTC',
      timezone_abbreviation: 'UTC',
      elevation: 200,
      current_units: {},
      current: {
        time: '2024-01-15T12:00',
        interval: 3600,
        european_aqi: 32,
        pm10: 10,
        pm2_5: 5,
        carbon_monoxide: 200,
        nitrogen_dioxide: 10,
        sulphur_dioxide: 5,
        ozone: 40,
        dust: 2,
        uv_index: 3,
        uv_index_clear_sky: 5,
      },
      hourly: { time: times, european_aqi: aqis },
    };

    const result = prepareAirQualityNextAndPast12h(aq, '2024-01-15T12:00');

    // Next 12h: hours 12-23
    expect(result.next_12h).toHaveLength(12);
    expect(result.next_12h[0].time).toBe('2024-01-15T12:00');
    expect(result.next_12h[0].european_aqi).toBe(32); // 20 + 12

    // Past 12h: hours 0-11
    expect(result.past_12h).toHaveLength(12);
    expect(result.past_12h[0].time).toBe('2024-01-15T00:00');
    expect(result.past_12h[0].european_aqi).toBe(20); // 20 + 0
  });

  it('handles boundary at start of array (no past data)', () => {
    const times = Array.from(
      { length: 12 },
      (_, i) => `2024-01-15T${String(i).padStart(2, '0')}:00`
    );
    const aqis = Array.from({ length: 12 }, (_, i) => 20 + i);

    const aq: OpenMeteoAirQualityResponse = {
      latitude: 35.22,
      longitude: -80.84,
      generationtime_ms: 1,
      utc_offset_seconds: 0,
      timezone: 'UTC',
      timezone_abbreviation: 'UTC',
      elevation: 200,
      current_units: {},
      current: {
        time: '2024-01-15T00:00',
        interval: 3600,
        european_aqi: 20,
        pm10: 10,
        pm2_5: 5,
        carbon_monoxide: 200,
        nitrogen_dioxide: 10,
        sulphur_dioxide: 5,
        ozone: 40,
        dust: 2,
        uv_index: 3,
        uv_index_clear_sky: 5,
      },
      hourly: { time: times, european_aqi: aqis },
    };

    const result = prepareAirQualityNextAndPast12h(aq, '2024-01-15T00:00');
    expect(result.next_12h).toHaveLength(12);
    expect(result.past_12h).toHaveLength(0);
  });
});
