import { useQuery } from '@tanstack/react-query';
import type { GenericAlert } from '../types/alerts';
import { queryKeys } from '../utils/queryKeys';
import { computeAlertsHash, fetchAlertSummary } from '../utils/alertSummaryApi';

interface UseAlertSummaryOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch AI-generated summary for alerts.
 *
 * Uses hash-based caching: the query key includes a hash of the alerts,
 * so React Query will return cached data when alerts haven't changed.
 *
 * @param alerts - Array of alerts to summarize
 * @param options - Query options
 */
export function useAlertSummary(alerts: GenericAlert[], options: UseAlertSummaryOptions = {}) {
  const { enabled = true } = options;

  // Compute hash for cache key - only changes when alerts change
  const hash = computeAlertsHash(alerts);

  return useQuery({
    queryKey: queryKeys.alerts.summary(hash),
    queryFn: ({ signal }) => fetchAlertSummary(alerts, hash, signal),
    enabled: enabled && alerts.length > 0,
    // Cache forever - we use hash-based invalidation
    staleTime: Infinity,
    // Keep cached data when hash changes while fetching new summary
    placeholderData: previousData => previousData,
  });
}
