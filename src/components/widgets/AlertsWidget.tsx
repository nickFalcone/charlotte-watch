import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, formatDistanceToNowStrict, isToday } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'styled-components';
import type { WidgetProps } from '../../types';
import type { GenericAlert, AlertSource } from '../../types/alerts';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useWidgetMetadata } from '../Widget/useWidgetMetadata';
import { useAlertSummary } from '../../hooks/useAlertSummary';
import { AlertIcon } from '../AlertIcon';
import { getAlertSeverityConfig, sortAlertsBySeverity } from '../../types/alerts';
import { fetchAllAlertsWithStatus } from '../../alerts';
import { queryKeys } from '../../utils/queryKeys';
import alertsIcon from '../../assets/icons/alerts.svg';
import closeIcon from '../../assets/icons/close.svg';
import infoIcon from '../../assets/icons/info.svg';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as Tooltip from '@radix-ui/react-tooltip';
import {
  AlertsContainer,
  AlertsHeader,
  AlertCount,
  AlertsList,
  AlertCard,
  AlertCardHeader,
  AlertTitleRow,
  AlertSourceIcon,
  AlertTitle,
  AlertSeverityBadge,
  AlertSummary,
  AlertMeta,
  AlertMetaItem,
  NoAlertsContainer,
  NoAlertsIconFallback,
  NoAlertsText,
  NoAlertsSubtext,
  SelectAllLink,
  LoadingContainer,
  LoadingIcon,
  LoadingText,
  ErrorContainer,
  ErrorText,
  RetryButton,
  SourceToggleGroup,
  SourceToggleItem,
  TooltipContent,
  TooltipRow,
  TooltipArrow,
  AlertModalOverlay,
  AlertModalContent,
  AlertModalHeader,
  AlertModalTitle,
  AlertModalTitleText,
  AlertModalClose,
  AlertModalCloseIcon,
  AlertModalBody,
  AlertModalSection,
  AlertModalLabel,
  AlertModalText,
  AISummaryContainer,
  AISummaryRow,
  AISummaryText,
  AISummaryInfoIcon,
  AISummaryInfoTrigger,
  AISummaryPopoverContent,
  AISummarySkeleton,
  AISummarySkeletonLine,
  AISummaryError,
} from './AlertsWidget.styles';

const SOURCE_LABELS: Record<AlertSource, string> = {
  nws: 'NWS',
  faa: 'FAA',
  duke: 'Duke',
  ncdot: 'NCDOT',
  cats: 'CATS',
  cmpd: 'CMPD',
  'here-flow': 'Traffic',
  traffic: 'Traffic',
  system: 'System',
  custom: 'Custom',
};

const SOURCE_FULL_NAMES: Record<AlertSource, string> = {
  nws: 'National Weather Service',
  faa: 'Federal Aviation Administration',
  duke: 'Duke Energy',
  ncdot: 'NC Dept. of Transportation',
  cats: 'Charlotte Area Transit System',
  cmpd: 'Charlotte-Mecklenburg Police',
  'here-flow': 'HERE Traffic Flow',
  traffic: 'Traffic',
  system: 'System',
  custom: 'Custom',
};

// Helper to extract displaySeverity from typed metadata
function getDisplaySeverity(alert: GenericAlert): string | undefined {
  if (!alert.metadata) return undefined;
  if ('displaySeverity' in alert.metadata && typeof alert.metadata.displaySeverity === 'string') {
    return alert.metadata.displaySeverity;
  }
  return undefined;
}

/** Same-day: relative (e.g. "2 hours ago"). Otherwise: "Jan 24 6:20 PM" in local time. */
function formatAlertTimestamp(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  const t = d.getTime();
  if (Number.isNaN(t)) return 'Invalid date';
  if (isToday(d)) {
    return formatDistanceToNowStrict(d, { addSuffix: true });
  }
  return format(d, 'MMM d h:mm a');
}

export function AlertsWidget(_props: WidgetProps) {
  const theme = useTheme();
  const ALERT_SEVERITY_CONFIG = getAlertSeverityConfig(theme);
  const [selectedAlert, setSelectedAlert] = useState<GenericAlert | null>(null);
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
    staleTime: 1000 * 60 * 15, // 15 minutes — matches refetchInterval so focus/mount don't refetch more often
    refetchInterval: 1000 * 60 * 15, // 15 minutes
    // Override global "refetchOnMount: false" so alerts refresh when stale after
    // rehydration from persistence or when returning to the tab
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
      // Require at least one source to be selected
      if (values.length === 0) return;
      const allSourceKeys = Object.keys(sources) as AlertSource[];
      const visibleSet = new Set(values as AlertSource[]);
      const newHidden = allSourceKeys.filter(s => !visibleSet.has(s));
      setHiddenAlertSources(newHidden);
    },
    [sources, setHiddenAlertSources]
  );

  // Derive alerts data (needed before hooks that depend on it)
  const allAlerts = useMemo(() => alertsResult?.alerts || [], [alertsResult?.alerts]);
  const sortedAllAlerts = useMemo(() => sortAlertsBySeverity(allAlerts), [allAlerts]);

  // Filter alerts by visible sources (memoized for performance)
  const sortedAlerts = useMemo(() => {
    if (visibleSources.size === 0) return sortedAllAlerts;
    return sortedAllAlerts.filter(alert => visibleSources.has(alert.source));
  }, [sortedAllAlerts, visibleSources]);

  // AI-generated summary - uses ALL alerts, not filtered by visible sources
  // Must be called before any early returns to satisfy React hooks rules
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
  } = useAlertSummary(sortedAllAlerts, {
    enabled: sortedAllAlerts.length > 0 && !isLoading,
  });

  // Sync last-fetch time to widget metadata. Prefer TanStack's dataUpdatedAt
  // (set on every successful fetch); fall back to fetchedAt for rehydrated caches.
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
    <AlertsContainer>
      <AlertsHeader>
        <AlertCount $hasAlerts={sortedAlerts.length > 0}>{sortedAlerts.length} ALERTS</AlertCount>
        {sources && visibleSources.size > 0 && (
          <Tooltip.Provider delayDuration={300}>
            <ToggleGroup.Root
              type="multiple"
              value={Array.from(visibleSources)}
              onValueChange={handleVisibleSourcesChange}
              asChild
            >
              <SourceToggleGroup>
                {(
                  Object.entries(sources) as [AlertSource, { success: boolean; error?: string }][]
                ).map(([sourceKey, status]) => {
                  const isVisible = visibleSources.has(sourceKey);
                  return (
                    <Tooltip.Root key={sourceKey}>
                      <Tooltip.Trigger asChild>
                        <ToggleGroup.Item value={sourceKey} asChild>
                          <SourceToggleItem $success={status.success} $visible={isVisible}>
                            {SOURCE_LABELS[sourceKey]}
                          </SourceToggleItem>
                        </ToggleGroup.Item>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content side="top" sideOffset={5} asChild>
                          <TooltipContent>
                            <TooltipRow>{SOURCE_FULL_NAMES[sourceKey]}</TooltipRow>
                            <TooltipRow
                              $color={
                                theme.name === 'dark'
                                  ? status.success
                                    ? '#4ade80'
                                    : '#ffb0b0'
                                  : status.success
                                    ? theme.colors.success
                                    : theme.colors.error
                              }
                            >
                              {status.success ? 'Connected' : `Error: ${status.error || 'Failed'}`}
                            </TooltipRow>
                            <TooltipRow>{isVisible ? 'Visible' : 'Hidden'}</TooltipRow>
                            <Tooltip.Arrow asChild>
                              <TooltipArrow />
                            </Tooltip.Arrow>
                          </TooltipContent>
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  );
                })}
              </SourceToggleGroup>
            </ToggleGroup.Root>
          </Tooltip.Provider>
        )}
      </AlertsHeader>

      {/* AI Summary - shows when there are alerts (based on all alerts, not filtered) */}
      {sortedAllAlerts.length > 0 && (
        <AISummaryContainer>
          {isSummaryLoading ? (
            <AISummarySkeleton>
              <AISummarySkeletonLine />
              <AISummarySkeletonLine $width="85%" />
            </AISummarySkeleton>
          ) : isSummaryError ? (
            <AISummaryError>Summary unavailable</AISummaryError>
          ) : summaryData?.summary ? (
            <AISummaryRow>
              <AISummaryText>{summaryData.summary}</AISummaryText>
              <Popover.Root>
                <Popover.Trigger asChild>
                  <AISummaryInfoTrigger aria-label="About AI summary">
                    <AISummaryInfoIcon src={infoIcon} alt="" aria-hidden />
                  </AISummaryInfoTrigger>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content side="top" sideOffset={6} asChild>
                    <AISummaryPopoverContent>
                      This is an AI-generated summary of all available alert information. Always
                      confirm details with source references.
                    </AISummaryPopoverContent>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            </AISummaryRow>
          ) : null}
        </AISummaryContainer>
      )}

      {sortedAlerts.length === 0 ? (
        sources && Object.values(sources).some(status => !status.success) ? (
          <NoAlertsContainer>
            <NoAlertsText>Alert Sources Unavailable</NoAlertsText>
            <NoAlertsSubtext>
              {(() => {
                const unavailable = (
                  Object.entries(sources) as [AlertSource, { success: boolean }][]
                )
                  .filter(([_, status]) => !status.success)
                  .map(([key]) => SOURCE_LABELS[key]);
                return `${unavailable.join(', ')} ${unavailable.length === 1 ? 'is' : 'are'} currently unavailable`;
              })()}
            </NoAlertsSubtext>
          </NoAlertsContainer>
        ) : (
          <NoAlertsContainer>
            <NoAlertsIconFallback>✓</NoAlertsIconFallback>
            <NoAlertsText>No Active Alerts</NoAlertsText>
            <NoAlertsSubtext>
              {(() => {
                if (!sources) return 'All systems normal';
                const totalSources = Object.keys(sources).length;
                const hiddenCount = totalSources - visibleSources.size;
                if (hiddenCount > 0) {
                  return (
                    <>
                      {hiddenCount} {hiddenCount === 1 ? 'source is' : 'sources are'} hidden.{' '}
                      <SelectAllLink onClick={showAllAlertSources}>Select all</SelectAllLink>
                    </>
                  );
                }
                return 'All systems normal';
              })()}
            </NoAlertsSubtext>
          </NoAlertsContainer>
        )
      ) : (
        <AlertsList tabIndex={0} role="region" aria-label="Alerts list">
          {sortedAlerts.map(alert => {
            const severityConfig = ALERT_SEVERITY_CONFIG[alert.severity];

            return (
              <AlertCard
                key={alert.id}
                type="button"
                $severityColor={severityConfig.color}
                $severityBg={severityConfig.bgColor}
                onClick={() => setSelectedAlert(alert)}
              >
                <AlertCardHeader>
                  <AlertTitleRow>
                    <AlertSourceIcon>
                      <AlertIcon source={alert.source} size={16} />
                    </AlertSourceIcon>
                    <AlertTitle>{alert.title}</AlertTitle>
                  </AlertTitleRow>
                  <AlertSeverityBadge $color={severityConfig.color} $bg={severityConfig.bgColor}>
                    {getDisplaySeverity(alert) || severityConfig.label}
                  </AlertSeverityBadge>
                </AlertCardHeader>
                <AlertSummary>{alert.summary}</AlertSummary>
                <AlertMeta>
                  {alert.affectedArea && (
                    <AlertMetaItem>
                      {alert.affectedArea.length > 160
                        ? `${alert.affectedArea.slice(0, 160)}...`
                        : alert.affectedArea}
                    </AlertMetaItem>
                  )}
                </AlertMeta>
              </AlertCard>
            );
          })}
        </AlertsList>
      )}

      <Dialog.Root
        open={selectedAlert !== null}
        onOpenChange={open => {
          if (!open) setSelectedAlert(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay asChild>
            <AlertModalOverlay>
              <Dialog.Content asChild>
                <AlertModalContent>
                  {selectedAlert && (
                    <>
                      <AlertModalHeader
                        $color={ALERT_SEVERITY_CONFIG[selectedAlert.severity].color}
                      >
                        <AlertModalTitle>
                          <AlertSourceIcon>
                            <AlertIcon source={selectedAlert.source} size={20} />
                          </AlertSourceIcon>
                          <Dialog.Title asChild>
                            <AlertModalTitleText>{selectedAlert.title}</AlertModalTitleText>
                          </Dialog.Title>
                          <AlertSeverityBadge
                            $color={ALERT_SEVERITY_CONFIG[selectedAlert.severity].color}
                            $bg={ALERT_SEVERITY_CONFIG[selectedAlert.severity].bgColor}
                          >
                            {getDisplaySeverity(selectedAlert) ||
                              ALERT_SEVERITY_CONFIG[selectedAlert.severity].label}
                          </AlertSeverityBadge>
                        </AlertModalTitle>
                        <Dialog.Close asChild>
                          <AlertModalClose aria-label="Close">
                            <AlertModalCloseIcon src={closeIcon} alt="" aria-hidden />
                          </AlertModalClose>
                        </Dialog.Close>
                      </AlertModalHeader>
                      <AlertModalBody>
                        <AlertModalSection>
                          <AlertModalLabel>Source</AlertModalLabel>
                          <AlertModalText>
                            {selectedAlert.source.toUpperCase()} - {selectedAlert.category}
                          </AlertModalText>
                        </AlertModalSection>

                        {selectedAlert.affectedArea && (
                          <AlertModalSection>
                            <AlertModalLabel>Affected Area</AlertModalLabel>
                            <AlertModalText>{selectedAlert.affectedArea}</AlertModalText>
                          </AlertModalSection>
                        )}

                        {selectedAlert.url && (
                          <AlertModalSection>
                            <AlertModalLabel>Map</AlertModalLabel>
                            <AlertModalText>
                              <a href={selectedAlert.url} target="_blank" rel="noopener noreferrer">
                                View on map
                              </a>
                            </AlertModalText>
                          </AlertModalSection>
                        )}

                        <AlertModalSection>
                          <AlertModalLabel>Summary</AlertModalLabel>
                          <AlertModalText>{selectedAlert.summary}</AlertModalText>
                        </AlertModalSection>

                        {selectedAlert.description && (
                          <AlertModalSection>
                            <AlertModalLabel>Description</AlertModalLabel>
                            <AlertModalText>{selectedAlert.description}</AlertModalText>
                          </AlertModalSection>
                        )}

                        {selectedAlert.instruction && (
                          <AlertModalSection>
                            <AlertModalLabel>Instructions</AlertModalLabel>
                            <AlertModalText>{selectedAlert.instruction}</AlertModalText>
                          </AlertModalSection>
                        )}

                        {(selectedAlert.startTime || selectedAlert.endTime) && (
                          <AlertModalSection>
                            <AlertModalLabel>Timing</AlertModalLabel>
                            <AlertModalText>
                              {selectedAlert.startTime && (
                                <>Effective: {formatAlertTimestamp(selectedAlert.startTime)}</>
                              )}
                              {selectedAlert.startTime && selectedAlert.endTime && '\n'}
                              {selectedAlert.endTime && (
                                <>Expires: {formatAlertTimestamp(selectedAlert.endTime)}</>
                              )}
                            </AlertModalText>
                          </AlertModalSection>
                        )}

                        <AlertModalSection>
                          <AlertModalLabel>Last Updated</AlertModalLabel>
                          <AlertModalText>
                            {formatAlertTimestamp(selectedAlert.updatedAt)}
                          </AlertModalText>
                        </AlertModalSection>
                      </AlertModalBody>
                    </>
                  )}
                </AlertModalContent>
              </Dialog.Content>
            </AlertModalOverlay>
          </Dialog.Overlay>
        </Dialog.Portal>
      </Dialog.Root>
    </AlertsContainer>
  );
}
