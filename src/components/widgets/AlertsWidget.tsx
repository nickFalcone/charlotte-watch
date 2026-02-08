import { useState, useEffect, useMemo, useCallback } from 'react';
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
import * as Dialog from '@radix-ui/react-dialog';
import { MapContainer as LeafletMapContainer, Marker, Polygon, Polyline } from 'react-leaflet';
import { RetryTileLayer } from './RetryTileLayer';
import 'leaflet/dist/leaflet.css';
import {
  AnimatedDialogContent,
  AnimatedDialogOverlay,
  formatTimestamp,
  TabPanel,
  WidgetTabs,
} from '../common';
import {
  getAlertCoordinateList,
  getAlertPolylineSegments,
  getAlertPolygon,
  getDisplaySeverity,
  createAlertMarkerIcon,
  FitBounds,
} from './alertsMapUtils';
import { AlertsIncidentsTab } from './AlertsIncidentsTab';
import { AlertsMapTab } from './AlertsMapTab';
import {
  LoadingContainer,
  LoadingIcon,
  LoadingText,
  ErrorContainer,
  ErrorText,
  RetryButton,
  AlertSourceIcon,
  AlertSeverityBadge,
  AlertModalHeader,
  AlertModalTitle,
  AlertModalTitleText,
  AlertModalClose,
  AlertModalCloseIcon,
  AlertModalBody,
  AlertModalSection,
  AlertModalLabel,
  AlertModalText,
  AlertMapContainer,
  SegmentCard,
  SegmentHeader,
  SegmentDetail,
} from './AlertsWidget.styles';

export function AlertsWidget(_props: WidgetProps) {
  const theme = useTheme();
  const ALERT_SEVERITY_CONFIG = getAlertSeverityConfig(theme);
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
      <WidgetTabs defaultValue="incidents" onValueChange={setActiveTab}>
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
            alertSeverityConfig={ALERT_SEVERITY_CONFIG}
            onAlertSelect={setSelectedAlert}
          />
        </TabPanel>
        <TabPanel value="map" label="Map" forceMount>
          <AlertsMapTab
            alerts={sortedAlerts}
            alertSeverityConfig={ALERT_SEVERITY_CONFIG}
            onAlertSelect={setSelectedAlert}
            active={activeTab === 'map'}
          />
        </TabPanel>
      </WidgetTabs>

      <Dialog.Root
        open={selectedAlert !== null}
        onOpenChange={open => {
          if (!open) setSelectedAlert(null);
        }}
      >
        <Dialog.Portal>
          <AnimatedDialogOverlay>
            <AnimatedDialogContent>
              {selectedAlert && (
                <>
                  <AlertModalHeader $color={ALERT_SEVERITY_CONFIG[selectedAlert.severity].color}>
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

                    {(() => {
                      const meta = selectedAlert.metadata;
                      if (meta?.source !== 'ncdot' || !meta.segments || meta.segments.length <= 1) {
                        return null;
                      }
                      return (
                        <AlertModalSection>
                          <AlertModalLabel>Segments ({meta.segments.length})</AlertModalLabel>
                          {meta.segments.map(seg => (
                            <SegmentCard key={seg.incidentId}>
                              <SegmentHeader>
                                {seg.condition}
                                {seg.direction ? ` - ${seg.direction}` : ''}
                              </SegmentHeader>
                              {seg.location && <SegmentDetail>{seg.location}</SegmentDetail>}
                              {seg.lanesClosed > 0 && seg.lanesTotal > 0 && (
                                <SegmentDetail>
                                  {seg.lanesClosed} of {seg.lanesTotal} lanes closed
                                </SegmentDetail>
                              )}
                              {seg.reason && <SegmentDetail>{seg.reason}</SegmentDetail>}
                              {seg.end && (
                                <SegmentDetail>{formatTimestamp(new Date(seg.end))}</SegmentDetail>
                              )}
                            </SegmentCard>
                          ))}
                        </AlertModalSection>
                      );
                    })()}

                    {(() => {
                      const coordinateList = getAlertCoordinateList(selectedAlert);
                      if (coordinateList.length === 0) return null;

                      const severityConfig = ALERT_SEVERITY_CONFIG[selectedAlert.severity];
                      const markerIcon = createAlertMarkerIcon(severityConfig.color);
                      const mapTileUrl =
                        theme.name === 'dark'
                          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

                      const center = coordinateList[0];
                      const polylineSegments = getAlertPolylineSegments(selectedAlert);
                      const alertPolygon = getAlertPolygon(selectedAlert);
                      const allPositions = coordinateList.map(
                        c => [c.lat, c.lng] as [number, number]
                      );
                      const hasShape = alertPolygon !== null || polylineSegments.length > 0;

                      return (
                        <AlertModalSection>
                          <AlertModalLabel>Location</AlertModalLabel>
                          <AlertMapContainer>
                            <LeafletMapContainer
                              center={[center.lat, center.lng]}
                              zoom={hasShape ? 12 : 14}
                              zoomControl={true}
                              scrollWheelZoom={false}
                              dragging={true}
                              style={{ height: '100%', width: '100%' }}
                            >
                              <RetryTileLayer
                                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                                url={mapTileUrl}
                                maxRetries={3}
                                retryDelay={1000}
                              />
                              {alertPolygon ? (
                                <>
                                  <FitBounds positions={allPositions} />
                                  <Polygon
                                    positions={alertPolygon}
                                    pathOptions={{
                                      color: severityConfig.color,
                                      fillColor: severityConfig.color,
                                      fillOpacity: 0.25,
                                      weight: 2,
                                      opacity: 0.8,
                                    }}
                                  />
                                </>
                              ) : polylineSegments.length > 0 ? (
                                <>
                                  <FitBounds positions={allPositions} />
                                  {polylineSegments.map((segment, i) => (
                                    <Polyline
                                      key={i}
                                      positions={segment}
                                      pathOptions={{
                                        color: severityConfig.color,
                                        weight: 5,
                                        opacity: 0.9,
                                      }}
                                    />
                                  ))}
                                </>
                              ) : (
                                <Marker position={[center.lat, center.lng]} icon={markerIcon} />
                              )}
                            </LeafletMapContainer>
                          </AlertMapContainer>
                        </AlertModalSection>
                      );
                    })()}

                    {selectedAlert.url && (
                      <AlertModalSection>
                        <AlertModalLabel>
                          {/x\.com|twitter\.com/.test(selectedAlert.url) ? 'Tweet' : 'Link'}
                        </AlertModalLabel>
                        <AlertModalText>
                          <a href={selectedAlert.url} target="_blank" rel="noopener noreferrer">
                            {/x\.com|twitter\.com/.test(selectedAlert.url)
                              ? 'View on X'
                              : 'View external map'}
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
                            <>Effective: {formatTimestamp(selectedAlert.startTime)}</>
                          )}
                          {selectedAlert.startTime && selectedAlert.endTime && '\n'}
                          {selectedAlert.endTime && (
                            <>Expires: {formatTimestamp(selectedAlert.endTime)}</>
                          )}
                        </AlertModalText>
                      </AlertModalSection>
                    )}

                    <AlertModalSection>
                      <AlertModalLabel>Last Updated</AlertModalLabel>
                      <AlertModalText>{formatTimestamp(selectedAlert.updatedAt)}</AlertModalText>
                    </AlertModalSection>
                  </AlertModalBody>
                </>
              )}
            </AnimatedDialogContent>
          </AnimatedDialogOverlay>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
