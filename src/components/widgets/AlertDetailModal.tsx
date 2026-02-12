import { useTheme } from 'styled-components';
import * as Dialog from '@radix-ui/react-dialog';
import { MapContainer as LeafletMapContainer, Marker, Polygon, Polyline } from 'react-leaflet';
import type { GenericAlert, AlertSeverity } from '../../types/alerts';
import { AlertIcon } from '../AlertIcon';
import { RetryTileLayer } from './RetryTileLayer';
import { getMapTileUrl } from '../../utils/mapTileUrl';
import { AnimatedDialogContent, AnimatedDialogOverlay, formatTimestamp } from '../common';
import {
  getAlertCoordinateList,
  getAlertPolylineSegments,
  getAlertPolygon,
  getAlertSegmentCoordinates,
  getDisplaySeverity,
  createAlertMarkerIcon,
  FitBounds,
} from './alertsMapUtils';
import closeIcon from '../../assets/icons/close.svg';
import {
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

interface AlertDetailModalProps {
  alert: GenericAlert | null;
  onClose: () => void;
  alertSeverityConfig: Record<AlertSeverity, { color: string; bgColor: string; label: string }>;
}

function SegmentsSection({ alert }: { alert: GenericAlert }) {
  const meta = alert.metadata;
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
          {seg.end && <SegmentDetail>{formatTimestamp(new Date(seg.end))}</SegmentDetail>}
        </SegmentCard>
      ))}
    </AlertModalSection>
  );
}

function LocationMapSection({
  alert,
  severityConfig,
}: {
  alert: GenericAlert;
  severityConfig: { color: string; bgColor: string; label: string };
}) {
  const theme = useTheme();
  const coordinateList = getAlertCoordinateList(alert);
  if (coordinateList.length === 0) return null;

  const markerIcon = createAlertMarkerIcon(severityConfig.color);
  const mapTileUrl = getMapTileUrl(theme.name);
  const center = coordinateList[0];
  const polylineSegments = getAlertPolylineSegments(alert);
  const alertPolygon = getAlertPolygon(alert);
  const segmentCoords = getAlertSegmentCoordinates(alert);
  const allPositions = coordinateList.map(c => [c.lat, c.lng] as [number, number]);
  const hasShape = alertPolygon !== null || polylineSegments.length > 0 || segmentCoords.length > 1;
  const hasMultipleMarkers =
    segmentCoords.length > 1 && polylineSegments.length === 0 && !alertPolygon;

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
          ) : hasMultipleMarkers ? (
            <>
              <FitBounds positions={allPositions} />
              {segmentCoords.map((coord, i) => (
                <Marker key={i} position={[coord.lat, coord.lng]} icon={markerIcon} />
              ))}
            </>
          ) : (
            <Marker position={[center.lat, center.lng]} icon={markerIcon} />
          )}
        </LeafletMapContainer>
      </AlertMapContainer>
    </AlertModalSection>
  );
}

export function AlertDetailModal({ alert, onClose, alertSeverityConfig }: AlertDetailModalProps) {
  return (
    <Dialog.Root
      open={alert !== null}
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <AnimatedDialogOverlay>
          <AnimatedDialogContent>
            {alert && (
              <>
                <AlertModalHeader $color={alertSeverityConfig[alert.severity].color}>
                  <AlertModalTitle>
                    <AlertSourceIcon>
                      <AlertIcon source={alert.source} size={20} />
                    </AlertSourceIcon>
                    <Dialog.Title asChild>
                      <AlertModalTitleText>{alert.title}</AlertModalTitleText>
                    </Dialog.Title>
                    <AlertSeverityBadge
                      $color={alertSeverityConfig[alert.severity].color}
                      $bg={alertSeverityConfig[alert.severity].bgColor}
                    >
                      {getDisplaySeverity(alert) || alertSeverityConfig[alert.severity].label}
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
                      {alert.source.toUpperCase()} - {alert.category}
                    </AlertModalText>
                  </AlertModalSection>

                  {alert.affectedArea && (
                    <AlertModalSection>
                      <AlertModalLabel>Affected Area</AlertModalLabel>
                      <AlertModalText>{alert.affectedArea}</AlertModalText>
                    </AlertModalSection>
                  )}

                  <SegmentsSection alert={alert} />
                  <LocationMapSection
                    alert={alert}
                    severityConfig={alertSeverityConfig[alert.severity]}
                  />

                  {alert.url && (
                    <AlertModalSection>
                      <AlertModalLabel>
                        {/x\.com|twitter\.com/.test(alert.url) ? 'Tweet' : 'Link'}
                      </AlertModalLabel>
                      <AlertModalText>
                        <a href={alert.url} target="_blank" rel="noopener noreferrer">
                          {/x\.com|twitter\.com/.test(alert.url)
                            ? 'View on X'
                            : 'View external map'}
                        </a>
                      </AlertModalText>
                    </AlertModalSection>
                  )}

                  <AlertModalSection>
                    <AlertModalLabel>Summary</AlertModalLabel>
                    <AlertModalText>{alert.summary}</AlertModalText>
                  </AlertModalSection>

                  {alert.description && (
                    <AlertModalSection>
                      <AlertModalLabel>Description</AlertModalLabel>
                      <AlertModalText>{alert.description}</AlertModalText>
                    </AlertModalSection>
                  )}

                  {alert.instruction && (
                    <AlertModalSection>
                      <AlertModalLabel>Instructions</AlertModalLabel>
                      <AlertModalText>{alert.instruction}</AlertModalText>
                    </AlertModalSection>
                  )}

                  {(alert.startTime || alert.endTime) && (
                    <AlertModalSection>
                      <AlertModalLabel>Timing</AlertModalLabel>
                      <AlertModalText>
                        {alert.startTime && <>Effective: {formatTimestamp(alert.startTime)}</>}
                        {alert.startTime && alert.endTime && '\n'}
                        {alert.endTime && <>Expires: {formatTimestamp(alert.endTime)}</>}
                      </AlertModalText>
                    </AlertModalSection>
                  )}

                  <AlertModalSection>
                    <AlertModalLabel>Last Updated</AlertModalLabel>
                    <AlertModalText>{formatTimestamp(alert.updatedAt)}</AlertModalText>
                  </AlertModalSection>
                </AlertModalBody>
              </>
            )}
          </AnimatedDialogContent>
        </AnimatedDialogOverlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
