import { formatDistanceToNowStrict, isToday, format } from 'date-fns';

/**
 * Same-day: relative (e.g. "2 hours ago").
 * Otherwise: "Jan 24 6:20 PM" in local time.
 * Used for "last updated" style display in AlertsWidget, NewsWidget, etc.
 */
export function formatTimestamp(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  const t = d.getTime();
  if (Number.isNaN(t)) return 'Invalid date';
  if (isToday(d)) {
    return formatDistanceToNowStrict(d, { addSuffix: true });
  }
  return format(d, 'MMM d h:mm a');
}
