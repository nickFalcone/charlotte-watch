import { useQuery } from '@tanstack/react-query';
import type { GenericAlert } from '../types/alerts';
import { queryKeys } from '../utils/queryKeys';
import {
  computeAlertsHash,
  fetchAlertSummary,
  filterAlertsForSummary,
} from '../utils/alertSummaryApi';

interface UseAlertSummaryOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch AI-generated summary for alerts.
 *
 * Uses hash-based caching: the query key includes a hash of the alerts
 * sent to the API (see filterAlertsForSummary for what is excluded).
 *
 * @param alerts - Array of alerts to summarize
 * @param options - Query options
 */
export function useAlertSummary(alerts: GenericAlert[], options: UseAlertSummaryOptions = {}) {
  const { enabled = true } = options;

  // Drop alerts that are not summary-worthy (stale construction, minor FAA delays, etc.)
  const alertsForSummary = filterAlertsForSummary(alerts);
  const hash = computeAlertsHash(alertsForSummary);

  return useQuery({
    queryKey: queryKeys.alerts.summary(hash),
    queryFn: ({ signal }) => fetchAlertSummary(alertsForSummary, hash, signal),
    // Runs even when every alert was filtered out: fetchAlertSummary then returns a
    // fixed "no significant alerts" summary instead of leaving the summary area blank.
    enabled,
    // Cache forever - we use hash-based invalidation
    staleTime: Infinity,
    // Keep cached data when hash changes while fetching new summary
    placeholderData: previousData => previousData,
  });
}
