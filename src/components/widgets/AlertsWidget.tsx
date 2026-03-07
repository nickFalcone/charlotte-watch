import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { WidgetProps } from '../../types';
import type { GenericAlert, AlertSource } from '../../types/alerts';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useWidgetMetadata } from '../Widget/useWidgetMetadata';
import { useAlertSummary } from '../../hooks/useAlertSummary';
import { sortAlertsBySeverity } from '../../types/alerts';
import { fetchAllAlertsWithStatus } from '../../alerts';
import { queryKeys } from '../../utils/queryKeys';
import alertsIcon from '../../assets/icons/alerts.svg';
import 'leaflet/dist/leaflet.css';
import { TabPanel, WidgetTabs } from '../common';
import { AlertsIncidentsTab } from './AlertsIncidentsTab';
import { AlertsMapTab } from './AlertsMapTab';
import { AlertDetailModal } from './AlertDetailModal';
import {
  LoadingContainer,
  LoadingIcon,
  LoadingText,
  ErrorContainer,
  ErrorText,
  RetryButton,
} from './AlertsWidget.styles';

export function AlertsWidget(_props: WidgetProps) {
  const [selectedAlert, setSelectedAlert] = useState<GenericAlert | null>(null);
  const [activeTab, setActiveTab] = useState('incidents');
  const { setLastUpdated } = useWidgetMetadata();

  // Persisted alert source filter from store
  const hiddenAlertSources = useDashboardStore(state => state.hiddenAlertSources);
  const setHiddenAlertSources = useDashboardStore(state => state.setHiddenAlertSources);
  const showAllAlertSources = useDashboardStore(state => state.showAllAlertSources);

  const {
    data: alertsResult,
    dataUpdatedAt,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.alerts.all,
    queryFn: ({ signal }) => fetchAllAlertsWithStatus(signal),
    staleTime: 1000 * 60 * 60, // 60 minutes
    refetchInterval: 1000 * 60 * 60, // 60 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const sources = alertsResult?.sources;

  // Derive visible sources from available sources minus hidden ones (memoized)
  const visibleSources = useMemo(() => {
    if (!sources) return new Set<AlertSource>();
    const allSourceKeys = Object.keys(sources) as AlertSource[];
    const hiddenSet = new Set(hiddenAlertSources);
    return new Set(allSourceKeys.filter(s => !hiddenSet.has(s)));
  }, [sources, hiddenAlertSources]);

  // Handler to update hidden sources based on toggle group values
  const handleVisibleSourcesChange = useCallback(
    (values: string[]) => {
      if (!sources) return;
      if (values.length === 0) return;
      const allSourceKeys = Object.keys(sources) as AlertSource[];
      const visibleSet = new Set(values as AlertSource[]);
      const newHidden = allSourceKeys.filter(s => !visibleSet.has(s));
      setHiddenAlertSources(newHidden);
    },
    [sources, setHiddenAlertSources]
  );

  // Derive alerts data
  const allAlerts = useMemo(() => alertsResult?.alerts || [], [alertsResult?.alerts]);
  const sortedAllAlerts = useMemo(() => sortAlertsBySeverity(allAlerts), [allAlerts]);

  // Filter alerts by visible sources (memoized)
  const sortedAlerts = useMemo(() => {
    if (visibleSources.size === 0) return sortedAllAlerts;
    return sortedAllAlerts.filter(alert => visibleSources.has(alert.source));
  }, [sortedAllAlerts, visibleSources]);

  // AI-generated summary - uses ALL alerts, not filtered by visible sources
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
  } = useAlertSummary(sortedAllAlerts, {
    enabled: sortedAllAlerts.length > 0 && !isLoading,
  });

  // Sync last-fetch time to widget metadata
  useEffect(() => {
    if (dataUpdatedAt > 0) {
      setLastUpdated(dataUpdatedAt);
      return;
    }
    if (alertsResult?.fetchedAt) {
      let timestamp: number;
      if (typeof alertsResult.fetchedAt === 'number') {
        timestamp = alertsResult.fetchedAt;
      } else if (typeof alertsResult.fetchedAt === 'string') {
        timestamp = new Date(alertsResult.fetchedAt).getTime();
      } else {
        timestamp = alertsResult.fetchedAt.getTime();
      }
      setLastUpdated(timestamp);
    }
  }, [alertsResult, dataUpdatedAt, setLastUpdated]);

  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingIcon src={alertsIcon} alt="Loading alerts" />
        <LoadingText>Checking alerts...</LoadingText>
      </LoadingContainer>
    );
  }

  if (isError && !alertsResult) {
    return (
      <ErrorContainer>
        <ErrorText>{error instanceof Error ? error.message : 'Failed to load alerts'}</ErrorText>
        <RetryButton onClick={() => refetch()}>Retry</RetryButton>
      </ErrorContainer>
    );
  }

  return (
    <>
      <WidgetTabs defaultValue="incidents" onValueChange={setActiveTab} aria-label="Alert views">
        <TabPanel value="incidents" label="Incidents">
          <AlertsIncidentsTab
            sortedAlerts={sortedAlerts}
            sortedAllAlerts={sortedAllAlerts}
            sources={sources}
            visibleSources={visibleSources}
            handleVisibleSourcesChange={handleVisibleSourcesChange}
            showAllAlertSources={showAllAlertSources}
            summaryData={summaryData}
            isSummaryLoading={isSummaryLoading}
            isSummaryError={isSummaryError}
            onAlertSelect={setSelectedAlert}
          />
        </TabPanel>
        <TabPanel value="map" label="Map" forceMount>
          <AlertsMapTab
            alerts={sortedAlerts}
            onAlertSelect={setSelectedAlert}
            active={activeTab === 'map'}
          />
        </TabPanel>
      </WidgetTabs>

      <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
    </>
  );
}
