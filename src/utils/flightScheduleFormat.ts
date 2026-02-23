/**
 * Shared helpers for formatting flight schedule data (times, status labels).
 * Used by FlightsBoardTab and AircraftDetailDialog.
 */

/**
 * Format a local time string from the API (e.g. "2026-02-22 14:30+00:00") to "2:30 PM"
 */
export function formatLocalTime(localStr: string): string {
  const timePart = localStr.slice(11, 16);
  if (!timePart) return localStr;
  const [hourStr, minuteStr] = timePart.split(':');
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minuteStr} ${period}`;
}

function delayMinutes(scheduledUtc: string, revisedUtc: string): number {
  const scheduled = new Date(scheduledUtc).getTime();
  const revised = new Date(revisedUtc).getTime();
  return Math.round((revised - scheduled) / 60000);
}

export interface ScheduleStatusOptions {
  revisedTime?: { utc: string };
  scheduledTime?: { utc: string };
}

/**
 * Map AeroDataBox status string to a display label and color token.
 * When revisedTime differs from scheduledTime, shows delay in minutes (e.g. "+15 min").
 */
export function scheduleStatusInfo(
  status: string,
  colors: Record<string, string>,
  options?: ScheduleStatusOptions
): { label: string; color: string } {
  const lc = status.toLowerCase();

  if (lc.includes('cancel')) return { label: 'Cancelled', color: colors.error };
  if (lc === 'arrived' || lc === 'landed') return { label: 'Arrived', color: colors.success };
  if (lc === 'departed' || lc === 'airborne') return { label: 'Departed', color: colors.success };

  if (
    options?.revisedTime &&
    options?.scheduledTime &&
    options.revisedTime.utc !== options.scheduledTime.utc
  ) {
    const delay = delayMinutes(options.scheduledTime.utc, options.revisedTime.utc);
    if (delay > 0) return { label: `+${delay} min`, color: colors.warning };
    if (delay < 0) return { label: `${delay} min`, color: colors.secondary };
  }

  if (lc.includes('delay')) return { label: 'Delayed', color: colors.warning };
  return { label: 'On Time', color: colors.textMuted };
}
