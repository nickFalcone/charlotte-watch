/**
 * Centralized Query Key Factory
 *
 * Provides type-safe, standardized query keys for React Query.
 *
 * Benefits:
 * - Prevents typos and accidental cache collisions
 * - Makes invalidation patterns discoverable
 * - Enables refactoring with type safety
 * - Documents all query keys in one place
 *
 * Usage:
 * ```typescript
 * useQuery({
 *   queryKey: queryKeys.weather.current(lat, lng),
 *   queryFn: () => fetchWeather(lat, lng),
 * });
 * ```
 */

export const queryKeys = {
  /**
   * Alert-related queries
   */
  alerts: {
    all: ['alerts', 'all'] as const,
    bySource: (source: string) => ['alerts', 'source', source] as const,
    summary: (hash: string) => ['alerts', 'summary', hash] as const,
  },

  /**
   * Weather-related queries
   */
  weather: {
    current: (lat: number, lng: number) => ['weather', 'current', lat, lng] as const,
    airQuality: (lat: number, lng: number) => ['weather', 'airQuality', lat, lng] as const,
  },

  /**
   * Flight/aircraft tracking queries
   */
  flight: {
    aircraft: (airportCode: string) => ['flight', 'aircraft', airportCode] as const,
    faaStatus: () => ['flight', 'faaStatus'] as const,
  },

  /**
   * Stock market queries
   */
  stock: {
    profiles: () => ['stock', 'profiles'] as const,
    profile: (symbol: string) => ['stock', 'profile', symbol] as const,
    quotes: () => ['stock', 'quotes'] as const,
    quote: (symbol: string) => ['stock', 'quote', symbol] as const,
  },

  /**
   * News queries
   */
  news: {
    charlotte: () => ['news', 'charlotte'] as const,
  },

  /**
   * HERE Traffic flow queries
   */
  hereFlow: {
    all: ['hereFlow', 'all'] as const,
    route: (routeId: string) => ['hereFlow', 'route', routeId] as const,
  },
} as const;

/**
 * Type helpers for query key inference
 */
export type QueryKeys = typeof queryKeys;
export type AlertsKeys = QueryKeys['alerts'];
export type WeatherKeys = QueryKeys['weather'];
export type FlightKeys = QueryKeys['flight'];
export type StockKeys = QueryKeys['stock'];
export type NewsKeys = QueryKeys['news'];
export type HereFlowKeys = QueryKeys['hereFlow'];
