import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { OpenMeteoResponse } from '../types';
import { queryKeys } from '../utils/queryKeys';
import { buildWeatherSummaryPayload, fetchWeatherSummary } from '../utils/weatherSummaryApi';

/**
 * Hook to fetch an AI-generated 12-hour weather briefing.
 *
 * Uses hash-based caching: the query key includes a hash of the hourly
 * forecast window. The summary is only regenerated when the forecast data
 * changes or the hour rolls over (shifting the 12-hour window).
 *
 * @param weather - Open-Meteo response; pass undefined while loading
 */
export function useWeatherSummary(weather: OpenMeteoResponse | undefined) {
  const payload = useMemo(() => (weather ? buildWeatherSummaryPayload(weather) : null), [weather]);

  return useQuery({
    queryKey: queryKeys.weather.summary(payload?.hash ?? ''),
    queryFn: ({ signal }) => fetchWeatherSummary(payload!, signal),
    enabled: !!payload,
    // Cache forever - hash-based invalidation handles freshness
    staleTime: Infinity,
    // Keep cached summary while fetching a new one
    placeholderData: previousData => previousData,
  });
}
