// OpenSky Network API Credit Tracking
// Tracks daily usage based on their credit system

import type { AirportConfig } from '../types';

const DAILY_CREDIT_LIMIT = 4000;
const STORAGE_KEY = 'opensky_credits';

interface CreditData {
  date: string; // YYYY-MM-DD
  used: number;
  requests: number;
}

// Calculate credits for a bounding box query
// Based on OpenSky docs: https://openskynetwork.github.io/opensky-api/rest.html
export function calculateCreditsForBoundingBox(airport: AirportConfig): number {
  const { lamin, lamax, lomin, lomax } = airport.boundingBox;

  const latSpan = Math.abs(lamax - lamin);
  const lonSpan = Math.abs(lomax - lomin);
  const squareDegrees = latSpan * lonSpan;

  // Credit tiers based on area
  if (squareDegrees <= 25) return 1; // <500x500km
  if (squareDegrees <= 100) return 2; // <1000x1000km
  if (squareDegrees <= 400) return 3; // <2000x2000km
  return 4; // >2000x2000km or global
}

// Get today's date string
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Load credit data from localStorage
function loadCreditData(): CreditData {
  const today = getTodayString();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data: CreditData = JSON.parse(stored);
      // Reset if it's a new day
      if (data.date === today) {
        return data;
      }
    }
  } catch {
    // Ignore parse errors
  }

  // Return fresh data for today
  return { date: today, used: 0, requests: 0 };
}

// Save credit data to localStorage
function saveCreditData(data: CreditData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors (private browsing, etc.)
  }
}

// Record a request and its credit usage
export function recordCreditUsage(credits: number): void {
  const data = loadCreditData();
  data.used += credits;
  data.requests += 1;
  saveCreditData(data);
}

// Get current credit usage stats
export function getCreditStats(): {
  used: number;
  remaining: number;
  requests: number;
  limit: number;
  percentUsed: number;
} {
  const data = loadCreditData();
  const remaining = Math.max(0, DAILY_CREDIT_LIMIT - data.used);
  const percentUsed = (data.used / DAILY_CREDIT_LIMIT) * 100;

  return {
    used: data.used,
    remaining,
    requests: data.requests,
    limit: DAILY_CREDIT_LIMIT,
    percentUsed,
  };
}

// Check if we have credits remaining
export function hasCreditsRemaining(): boolean {
  const data = loadCreditData();
  return data.used < DAILY_CREDIT_LIMIT;
}

// Reset credit tracking (for testing)
export function resetCreditTracking(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Estimate daily usage based on polling interval
export function estimateDailyUsage(
  pollingIntervalMs: number,
  creditsPerRequest: number,
  hoursPerDay: number = 24
): { requests: number; credits: number; percentOfLimit: number } {
  const requestsPerHour = (60 * 60 * 1000) / pollingIntervalMs;
  const requests = Math.round(requestsPerHour * hoursPerDay);
  const credits = requests * creditsPerRequest;
  const percentOfLimit = (credits / DAILY_CREDIT_LIMIT) * 100;

  return { requests, credits, percentOfLimit };
}
