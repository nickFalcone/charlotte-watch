// OpenSky Network OAuth2 Token Management
// Handles token acquisition, caching, and automatic refresh
//
// SECURITY: Credentials are NEVER exposed to the client bundle.
// - In development: Vite proxy injects credentials server-side
// - In production: Netlify function handles auth server-side

interface TokenData {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

// In-memory token cache
let cachedToken: TokenData | null = null;

// Token refresh buffer - refresh 5 minutes before expiry
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

// Auth endpoint - proxy in dev, Pages Function in prod
const AUTH_ENDPOINT = import.meta.env.DEV
  ? '/proxy/opensky-auth/auth/realms/opensky-network/protocol/openid-connect/token'
  : '/api/opensky-auth';

// Fetch a new token from OpenSky (Keycloak realm)
// Credentials are injected server-side by proxy (dev) or Netlify function (prod)
async function fetchNewToken(): Promise<TokenData> {
  const response = await fetch(AUTH_ENDPOINT, {
    method: 'POST',
    // Note: In dev, Vite proxy intercepts and adds credentials + body
    // In prod, Netlify function handles credentials server-side
  });

  if (!response.ok) {
    throw new Error(`Failed to obtain OpenSky token: ${response.status}`);
  }

  const data = await response.json();

  // Token expires in 30 minutes (1800 seconds), store as ms timestamp
  const expiresInMs = (data.expires_in || 1800) * 1000;
  const expiresAt = Date.now() + expiresInMs;

  return {
    accessToken: data.access_token,
    expiresAt,
  };
}

// Check if current token is valid (not expired or about to expire)
function isTokenValid(token: TokenData | null): boolean {
  if (!token) return false;
  return Date.now() < token.expiresAt - REFRESH_BUFFER_MS;
}

// Track if auth has been attempted and failed (to avoid repeated failures)
let authFailed = false;

// Get a valid token, refreshing if necessary
export async function getAccessToken(): Promise<string | null> {
  // If auth previously failed, don't retry (fall back to unauthenticated)
  if (authFailed) {
    return null;
  }

  // Return cached token if still valid
  if (isTokenValid(cachedToken)) {
    return cachedToken!.accessToken;
  }

  // Fetch new token
  try {
    cachedToken = await fetchNewToken();
    return cachedToken.accessToken;
  } catch (error) {
    console.error('Failed to get OpenSky token:', error);
    authFailed = true; // Don't retry on subsequent calls
    return null; // Fall back to unauthenticated
  }
}

// Check if authentication is configured
// Since credentials are server-side only, we assume configured and try once
export function isAuthConfigured(): boolean {
  return !authFailed;
}

// Get token expiry info (for debugging/display)
export function getTokenInfo(): { expiresAt: Date; remainingMs: number } | null {
  if (!cachedToken) return null;

  return {
    expiresAt: new Date(cachedToken.expiresAt),
    remainingMs: cachedToken.expiresAt - Date.now(),
  };
}

// Clear cached token (useful for testing or forced refresh)
export function clearToken(): void {
  cachedToken = null;
}
