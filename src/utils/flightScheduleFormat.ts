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

export type ScheduleStatusVariant = 'success' | 'warning' | 'neutral' | 'error' | 'secondary';

export interface ScheduleStatusColors {
  success: string;
  warning: string;
  error: string;
  secondary: string;
  textMuted: string;
}

/**
 * Map AeroDataBox status string to a display label and variant.
 * Variant is used to pick theme statusBadge colors (solid bg+fg for 7:1 contrast).
 * When revisedTime differs from scheduledTime, shows delay in minutes (e.g. "+15 min").
 */
export function scheduleStatusInfo(
  status: string,
  colors: ScheduleStatusColors,
  options?: ScheduleStatusOptions
): { label: string; color: string; variant: ScheduleStatusVariant } {
  const lc = status.toLowerCase();

  if (lc.includes('cancel')) return { label: 'Cancelled', color: colors.error, variant: 'error' };
  if (lc === 'arrived' || lc === 'landed')
    return { label: 'Arrived', color: colors.success, variant: 'success' };
  if (lc === 'departed' || lc === 'airborne')
    return { label: 'Departed', color: colors.success, variant: 'success' };

  if (
    options?.revisedTime &&
    options?.scheduledTime &&
    options.revisedTime.utc !== options.scheduledTime.utc
  ) {
    const delay = delayMinutes(options.scheduledTime.utc, options.revisedTime.utc);
    if (delay > 0) return { label: `+${delay} min`, color: colors.warning, variant: 'warning' };
    if (delay < 0) return { label: `${delay} min`, color: colors.secondary, variant: 'secondary' };
  }

  if (lc.includes('delay')) return { label: 'Delayed', color: colors.warning, variant: 'warning' };
  return { label: 'On Time', color: colors.textMuted, variant: 'neutral' };
}
