import { useTheme } from 'styled-components';
import type { AeroDataBoxSchedule, AeroDataBoxFlight } from '../../types';
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

// Format a local time string from the API (e.g. "2026-02-22 14:30+00:00") to "2:30 PM"
function formatLocalTime(localStr: string): string {
  // The local string format is "YYYY-MM-DD HH:mm±HH:mm"
  const timePart = localStr.slice(11, 16); // "HH:mm"
  if (!timePart) return localStr;
  const [hourStr, minuteStr] = timePart.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${period}`;
}

// Compute delay in minutes between scheduled and revised times (both UTC ISO strings)
function delayMinutes(scheduledUtc: string, revisedUtc: string): number {
  const scheduled = new Date(scheduledUtc).getTime();
  const revised = new Date(revisedUtc).getTime();
  return Math.round((revised - scheduled) / 60000);
}

// Map AeroDataBox status string to a display label and color token
function statusInfo(
  status: string,
  revisedTime: { utc: string } | undefined,
  scheduledTime: { utc: string },
  colors: Record<string, string>
): { label: string; color: string } {
  const lc = status.toLowerCase();

  if (lc.includes('cancel')) {
    return { label: 'Cancelled', color: colors.error };
  }
  if (lc === 'arrived' || lc === 'landed') {
    return { label: 'Arrived', color: colors.success };
  }
  if (lc === 'departed' || lc === 'airborne') {
    return { label: 'Departed', color: colors.success };
  }
  if (revisedTime && revisedTime.utc !== scheduledTime.utc) {
    const delay = delayMinutes(scheduledTime.utc, revisedTime.utc);
    if (delay > 0) return { label: `+${delay} min`, color: colors.warning };
    if (delay < 0) return { label: `${delay} min`, color: colors.secondary };
  }
  if (lc.includes('delay')) {
    return { label: 'Delayed', color: colors.warning };
  }
  return { label: 'On Time', color: colors.textMuted };
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
    <TableContainer>
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
              const { label, color } = statusInfo(
                flight.status,
                myLeg.revisedTime,
                myLeg.scheduledTime,
                theme.colors as Record<string, string>
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
                    <StatusBadge $color={color} aria-label={`Status: ${label}`}>
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
