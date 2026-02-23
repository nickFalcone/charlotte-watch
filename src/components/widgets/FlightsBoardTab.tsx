import { useTheme } from 'styled-components';
import type { AeroDataBoxSchedule, AeroDataBoxFlight } from '../../types';
import { formatLocalTime, scheduleStatusInfo } from '../../utils/flightScheduleFormat';
import { WidgetTabs, TabPanel } from '../common';
import {
  FlightTable,
  TableHead,
  TableBody,
  FlightRow,
  FlightCell,
  FlightNumber,
  AirlineName,
  AirportCode,
  AirportName,
  TimeCell,
  ScheduledTime,
  RevisedTime,
  StatusBadge,
  EmptyRow,
  EmptyCell,
  LoadingText,
  ErrorText,
  TableContainer,
} from './FlightsBoardTab.styles';

interface FlightsBoardTabProps {
  schedule: AeroDataBoxSchedule | undefined;
  isLoading: boolean;
  isError: boolean;
}

// Sort flights ascending by the relevant leg's scheduledTime.
// Arrivals sort by arrival time; departures sort by departure time.
// Null-safe: flights missing a time sort to the end.
function sortByScheduled(
  flights: AeroDataBoxFlight[],
  direction: 'arrivals' | 'departures'
): AeroDataBoxFlight[] {
  return [...flights].sort((a, b) => {
    const getTime = (f: AeroDataBoxFlight) => {
      const utc =
        direction === 'arrivals' ? f.arrival?.scheduledTime?.utc : f.departure?.scheduledTime?.utc;
      return utc ? new Date(utc).getTime() : Infinity;
    };
    return getTime(a) - getTime(b);
  });
}

interface FlightSectionProps {
  title: string;
  flights: AeroDataBoxFlight[];
  direction: 'arrivals' | 'departures';
  emptyLabel: string;
}

function FlightSection({ title, flights, direction, emptyLabel }: FlightSectionProps) {
  const theme = useTheme();
  const sorted = sortByScheduled(flights, direction);

  return (
    <TableContainer tabIndex={0} aria-label={`${title} flight schedule`}>
      <FlightTable role="grid" aria-label={title}>
        <TableHead>
          <tr>
            <th scope="col">Flight</th>
            <th scope="col">{direction === 'arrivals' ? 'From' : 'To'}</th>
            <th scope="col">Scheduled</th>
            <th scope="col">Status</th>
          </tr>
        </TableHead>
        <TableBody>
          {sorted.length === 0 ? (
            <EmptyRow>
              <EmptyCell colSpan={4}>{emptyLabel}</EmptyCell>
            </EmptyRow>
          ) : (
            sorted.map((flight, i) => {
              const leg = direction === 'arrivals' ? flight.departure : flight.arrival;
              const otherAirport = leg.airport;
              const myLeg = direction === 'arrivals' ? flight.arrival : flight.departure;
              const { label, variant } = scheduleStatusInfo(
                flight.status,
                {
                  success: theme.colors.success,
                  warning: theme.colors.warning,
                  error: theme.colors.error,
                  secondary: theme.colors.secondary,
                  textMuted: theme.colors.textMuted,
                },
                { revisedTime: myLeg.revisedTime, scheduledTime: myLeg.scheduledTime }
              );
              const showRevised =
                myLeg.revisedTime && myLeg.revisedTime.utc !== myLeg.scheduledTime.utc;

              return (
                <FlightRow key={`${flight.number}-${i}`}>
                  <FlightCell>
                    <FlightNumber>{flight.number}</FlightNumber>
                    <AirlineName title={flight.airline.name}>{flight.airline.name}</AirlineName>
                  </FlightCell>
                  <FlightCell>
                    {otherAirport ? (
                      <>
                        <AirportCode>{otherAirport.iata}</AirportCode>
                        <AirportName title={otherAirport.name}>{otherAirport.name}</AirportName>
                      </>
                    ) : (
                      <AirportCode>—</AirportCode>
                    )}
                  </FlightCell>
                  <FlightCell>
                    <TimeCell>
                      <ScheduledTime>{formatLocalTime(myLeg.scheduledTime.local)}</ScheduledTime>
                      {showRevised && myLeg.revisedTime && (
                        <RevisedTime>{formatLocalTime(myLeg.revisedTime.local)}</RevisedTime>
                      )}
                    </TimeCell>
                  </FlightCell>
                  <FlightCell>
                    <StatusBadge $variant={variant} aria-label={`Status: ${label}`}>
                      {label}
                    </StatusBadge>
                  </FlightCell>
                </FlightRow>
              );
            })
          )}
        </TableBody>
      </FlightTable>
    </TableContainer>
  );
}

export function FlightsBoardTab({ schedule, isLoading, isError }: FlightsBoardTabProps) {
  if (isLoading && !schedule) {
    return <LoadingText role="status">Loading schedule...</LoadingText>;
  }

  if (isError && !schedule) {
    return <ErrorText role="status">Schedule unavailable</ErrorText>;
  }

  const arrivals = schedule?.arrivals ?? [];
  const departures = schedule?.departures ?? [];

  return (
    <WidgetTabs defaultValue="arrivals">
      <TabPanel value="arrivals" label="Arrivals">
        <FlightSection
          title="Arrivals"
          flights={arrivals}
          direction="arrivals"
          emptyLabel="No arrivals scheduled"
        />
      </TabPanel>
      <TabPanel value="departures" label="Departures">
        <FlightSection
          title="Departures"
          flights={departures}
          direction="departures"
          emptyLabel="No departures scheduled"
        />
      </TabPanel>
    </WidgetTabs>
  );
}
