import { useQuery } from '@tanstack/react-query';
import type { OpenMeteoResponse, OpenMeteoAirQualityResponse } from '../types/weather';
import { queryKeys } from '../utils/queryKeys';
import { computeWeatherSummaryHash, fetchWeatherSummary } from '../utils/weatherSummaryApi';

interface UseWeatherSummaryOptions {
  enabled?: boolean;
  airQuality?: OpenMeteoAirQualityResponse;
}

/**
 * Hook to fetch AI-generated weather summary for the next 12 hours.
 * Uses hash-based caching keyed by current + hourly data; optionally includes air quality forecast.
 */
export function useWeatherSummary(
  weather: OpenMeteoResponse | undefined,
  options: UseWeatherSummaryOptions = {}
) {
  const { enabled = true, airQuality } = options;
  const hash = weather ? computeWeatherSummaryHash(weather, airQuality) : '';

  return useQuery({
    queryKey: queryKeys.weather.summary(hash),
    queryFn: ({ signal }) => fetchWeatherSummary(weather!, hash, signal, airQuality),
    enabled: enabled && !!weather && hash.length > 0,
    staleTime: 1000 * 60 * 15, // 15 minutes
    placeholderData: previousData => previousData,
  });
}
