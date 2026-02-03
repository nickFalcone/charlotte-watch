/**
 * Shared date/time formatting utilities for alert converters.
 */

/**
 * Formats a date/time string for display as a time (e.g., "3:45 PM").
 * Returns the original string if parsing fails (e.g., for descriptive strings like "Assessing").
 *
 * @param dateTimeString - ISO date string or descriptive text
 * @returns Formatted time string or original input if invalid
 *
 * @example
 * ```typescript
 * formatTimeDisplay("2024-01-15T15:45:00Z") // "3:45 PM"
 * formatTimeDisplay("Assessing") // "Assessing"
 * formatTimeDisplay(undefined) // undefined
 * ```
 */
export function formatTimeDisplay(dateTimeString: string | undefined): string | undefined {
  if (!dateTimeString) return undefined;

  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) {
      // Not a valid date - return as-is (might be descriptive like "Assessing")
      return dateTimeString;
    }
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return dateTimeString;
  }
}

/**
 * Formats an end time/date for display with context-aware formatting.
 * - If today: "Until 3:45 PM today"
 * - If another day: "Until Mon, Jan 15 3:45 PM"
 *
 * @param endTimeString - ISO date string for the end time
 * @returns Formatted string with "Until..." prefix, or undefined if invalid
 *
 * @example
 * ```typescript
 * // If today is Jan 15, 2024:
 * formatEndTimeDisplay("2024-01-15T15:45:00Z") // "Until 3:45 PM today"
 * formatEndTimeDisplay("2024-01-16T10:30:00Z") // "Until Tue, Jan 16 10:30 AM"
 * formatEndTimeDisplay(undefined) // undefined
 * ```
 */
export function formatEndTimeDisplay(endTimeString: string | undefined): string | undefined {
  if (!endTimeString) return undefined;

  try {
    const date = new Date(endTimeString);
    if (isNaN(date.getTime())) return undefined;

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return `Until ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} today`;
    }
    return `Until ${date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  } catch {
    return undefined;
  }
}
