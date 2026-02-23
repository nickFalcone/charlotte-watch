import * as Dialog from '@radix-ui/react-dialog';
import styled, { useTheme } from 'styled-components';
import type { Aircraft, AeroDataBoxSchedule, AeroDataBoxFlight } from '../../types';
import { getFlightPhase, FLIGHT_PHASE_COLORS, FLIGHT_PHASE_LABELS } from '../../types/flight';
import {
  formatAltitude,
  formatVelocity,
  formatHeading,
  formatVerticalRate,
  formatPositionAge,
} from '../../utils/flightApi';
import { formatLocalTime, scheduleStatusInfo } from '../../utils/flightScheduleFormat';
import {
  AnimatedDialogOverlay,
  AnimatedDialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton,
  DialogBody,
  DialogSection,
  DialogLabel,
  DialogText,
} from '../common/AnimatedDialog';

// Validate callsign — same rule as the widget (alphanumeric, 1-8 chars)
function isValidCallsign(callsign: string): boolean {
  return /^[A-Z0-9]{1,8}$/i.test(callsign);
}

const PhaseBadge = styled.span<{ $color: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ $color }) => `${$color}25`};
  color: ${({ $color }) => $color};
`;

const CallsignTitle = styled(Dialog.Title)`
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 18px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin: 0 8px 0 0;
`;

const RouteDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const RouteIata = styled.span`
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 16px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
`;

const RouteArrow = styled.span`
  font-size: 14px;
  color: ${props => props.theme.colors.textMuted};
`;

const RouteName = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  margin-top: 2px;
`;

const StatusBadge = styled.span<{ $color: string }>`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ $color }) => `${$color}20`};
  color: ${({ $color }) => $color};
`;

const DataGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const DataItem = styled.div``;

const DataItemLabel = styled.div`
  font-size: 10px;
  color: ${props => props.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 2px;
`;

const DataItemValue = styled.div`
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', monospace;
  color: ${props => props.theme.colors.text};
`;

const SectionDivider = styled.div`
  border-top: 1px solid ${props => props.theme.colors.border};
  margin: 4px 0;
`;

const FlightAwareLink = styled.a`
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
  color: ${props => props.theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
    border-radius: 2px;
  }
`;

const TimeRow = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

const TimeItem = styled.div``;

function findScheduleMatch(
  icao24: string,
  scheduleData: AeroDataBoxSchedule | undefined
): AeroDataBoxFlight | undefined {
  if (!scheduleData) return undefined;
  return [...scheduleData.departures, ...scheduleData.arrivals].find(
    f => f.aircraft?.modeS?.toLowerCase() === icao24.toLowerCase()
  );
}

interface AircraftDetailDialogProps {
  aircraft: Aircraft | null;
  scheduleData: AeroDataBoxSchedule | undefined;
  onClose: () => void;
}

export function AircraftDetailDialog({
  aircraft,
  scheduleData,
  onClose,
}: AircraftDetailDialogProps) {
  const theme = useTheme();
  const isOpen = aircraft !== null;

  const phase = aircraft ? getFlightPhase(aircraft) : 'ground';
  const phaseColor = FLIGHT_PHASE_COLORS[phase];
  const phaseLabel = FLIGHT_PHASE_LABELS[phase];
  const isOnGround = phase === 'ground';

  const match = aircraft ? findScheduleMatch(aircraft.icao24, scheduleData) : undefined;

  // For a departure from CLT: origin=CLT, dest=arrival airport
  // For an arrival to CLT: origin=departure airport, dest=CLT
  const isDeparture = match
    ? match.departure.airport === undefined || match.departure.airport?.iata === 'CLT'
    : false;
  const originAirport = match
    ? isDeparture
      ? { iata: 'CLT', name: 'Charlotte Douglas International' }
      : match.departure.airport
    : undefined;
  const destAirport = match
    ? isDeparture
      ? match.arrival.airport
      : { iata: 'CLT', name: 'Charlotte Douglas International' }
    : undefined;

  const matchedLeg = match ? (isDeparture ? match.departure : match.arrival) : undefined;
  const schedStatus = match
    ? scheduleStatusInfo(match.status, theme.colors as Record<string, string>)
    : undefined;

  return (
    <Dialog.Root open={isOpen} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <AnimatedDialogOverlay />
        <AnimatedDialogContent
          aria-describedby={undefined}
          onInteractOutside={onClose}
          onEscapeKeyDown={onClose}
        >
          <DialogHeader $color={phaseColor}>
            <DialogTitle>
              {/* CallsignTitle IS the Dialog.Title — required for screen readers */}
              <CallsignTitle>{aircraft?.callsign ?? '—'}</CallsignTitle>
              <PhaseBadge $color={phaseColor} aria-label={`Flight phase: ${phaseLabel}`}>
                {phaseLabel}
              </PhaseBadge>
            </DialogTitle>
            <DialogCloseButton onClick={onClose} aria-label="Close aircraft details">
              ✕
            </DialogCloseButton>
          </DialogHeader>

          <DialogBody>
            {/* Schedule section — only shown when we have a match */}
            {match && matchedLeg && schedStatus && (
              <>
                <DialogSection>
                  <DialogLabel>Flight</DialogLabel>
                  <DialogText>
                    {match.airline.name} · {match.number}
                  </DialogText>
                </DialogSection>

                <DialogSection>
                  <DialogLabel>Route</DialogLabel>
                  <RouteDisplay>
                    <div>
                      <RouteIata>{originAirport?.iata ?? '—'}</RouteIata>
                      {originAirport && originAirport.iata !== 'CLT' && (
                        <RouteName>{(originAirport as { name: string }).name}</RouteName>
                      )}
                    </div>
                    <RouteArrow aria-hidden="true">to</RouteArrow>
                    <div>
                      <RouteIata>{destAirport?.iata ?? '—'}</RouteIata>
                      {destAirport && destAirport.iata !== 'CLT' && (
                        <RouteName>{(destAirport as { name: string }).name}</RouteName>
                      )}
                    </div>
                  </RouteDisplay>
                </DialogSection>

                <DialogSection>
                  <DialogLabel>Status</DialogLabel>
                  <StatusBadge
                    $color={schedStatus.color}
                    aria-label={`Status: ${schedStatus.label}`}
                  >
                    {schedStatus.label}
                  </StatusBadge>
                </DialogSection>

                <DialogSection>
                  <DialogLabel>Times</DialogLabel>
                  <TimeRow>
                    <TimeItem>
                      <DataItemLabel>Scheduled</DataItemLabel>
                      <DataItemValue>
                        {formatLocalTime(matchedLeg.scheduledTime.local)}
                      </DataItemValue>
                    </TimeItem>
                    {matchedLeg.revisedTime &&
                      matchedLeg.revisedTime.utc !== matchedLeg.scheduledTime.utc && (
                        <TimeItem>
                          <DataItemLabel>Revised</DataItemLabel>
                          <DataItemValue>
                            {formatLocalTime(matchedLeg.revisedTime.local)}
                          </DataItemValue>
                        </TimeItem>
                      )}
                    {matchedLeg.runwayTime && (
                      <TimeItem>
                        <DataItemLabel>Actual</DataItemLabel>
                        <DataItemValue>
                          {formatLocalTime(matchedLeg.runwayTime.local)}
                        </DataItemValue>
                      </TimeItem>
                    )}
                  </TimeRow>
                </DialogSection>

                <DialogSection>
                  <DialogLabel>Aircraft</DialogLabel>
                  <DialogText>
                    {match.aircraft.model}
                    {match.aircraft.reg ? ` · ${match.aircraft.reg}` : ''}
                  </DialogText>
                </DialogSection>

                <SectionDivider />
              </>
            )}

            {/* ADS-B section — always shown */}
            <DialogSection>
              <DialogLabel>Live ADS-B Data</DialogLabel>
              <DataGrid>
                <DataItem>
                  <DataItemLabel>Altitude</DataItemLabel>
                  <DataItemValue>
                    {isOnGround ? 'Ground' : formatAltitude(aircraft?.altitude ?? 0)}
                  </DataItemValue>
                </DataItem>
                <DataItem>
                  <DataItemLabel>Speed</DataItemLabel>
                  <DataItemValue>{formatVelocity(aircraft?.velocity ?? 0)}</DataItemValue>
                </DataItem>
                <DataItem>
                  <DataItemLabel>Heading</DataItemLabel>
                  <DataItemValue>{formatHeading(aircraft?.heading ?? 0)}</DataItemValue>
                </DataItem>
                <DataItem>
                  <DataItemLabel>Vert. Rate</DataItemLabel>
                  <DataItemValue>{formatVerticalRate(aircraft?.verticalRate ?? 0)}</DataItemValue>
                </DataItem>
                <DataItem>
                  <DataItemLabel>Position</DataItemLabel>
                  <DataItemValue>{aircraft ? formatPositionAge(aircraft) : '—'}</DataItemValue>
                </DataItem>
                <DataItem>
                  <DataItemLabel>Squawk</DataItemLabel>
                  <DataItemValue>{aircraft?.squawk ?? 'N/A'}</DataItemValue>
                </DataItem>
                <DataItem>
                  <DataItemLabel>ICAO24</DataItemLabel>
                  <DataItemValue>{aircraft?.icao24 ?? '—'}</DataItemValue>
                </DataItem>
                <DataItem>
                  <DataItemLabel>Country</DataItemLabel>
                  <DataItemValue>{aircraft?.originCountry ?? '—'}</DataItemValue>
                </DataItem>
              </DataGrid>
            </DialogSection>

            {/* FlightAware link — only for valid callsigns */}
            {aircraft && isValidCallsign(aircraft.callsign) && (
              <FlightAwareLink
                href={`https://www.flightaware.com/live/flight/${encodeURIComponent(aircraft.callsign)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View {aircraft.callsign} on FlightAware
              </FlightAwareLink>
            )}
          </DialogBody>
        </AnimatedDialogContent>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
