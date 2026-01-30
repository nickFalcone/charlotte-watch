/**
 * Cloudflare Pages Functions environment bindings.
 *
 * These are set in Cloudflare Pages dashboard under:
 * Settings > Environment variables
 */
export interface Env {
  // OpenSky Network API credentials
  OPENSKY_CLIENT_ID?: string;
  OPENSKY_CLIENT_SECRET?: string;

  // Finnhub stock data API
  FINNHUB_API_KEY?: string;

  // Duke Energy outage API
  DUKE_OUTAGE_URL?: string;
  DUKE_OUTAGE_AUTH?: string;

  // Transit.land API for CATS alerts
  TRANSIT_LAND_API_KEY?: string;

  // HERE Maps API for traffic flow
  HERE_API_KEY?: string;

  // OpenWebNinja Real-Time News (RapidAPI)
  RAPIDAPI_KEY?: string;

  // AI Provider settings
  AI_PROVIDER?: 'openai' | 'anthropic';
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;

  // Cache warming secret for GitHub Actions workflow
  CACHE_WARMING_SECRET?: string;

  // Cloudflare KV
  CACHE: KVNamespace;
}

export type CFContext = EventContext<Env, string, unknown>;
