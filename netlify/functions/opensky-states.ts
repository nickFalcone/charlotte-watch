import type { Handler, HandlerEvent } from '@netlify/functions';

// Allowlisted parameters for OpenSky API
// See: https://openskynetwork.github.io/opensky-api/rest.html
const ALLOWED_PARAMS = ['lamin', 'lamax', 'lomin', 'lomax', 'extended', 'icao24', 'time'];

// Validate latitude (-90 to 90)
function isValidLatitude(value: string): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num >= -90 && num <= 90;
}

// Validate longitude (-180 to 180)
function isValidLongitude(value: string): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num >= -180 && num <= 180;
}

// Validate extended parameter (0 or 1)
function isValidExtended(value: string): boolean {
  return value === '0' || value === '1';
}

// Validate ICAO24 address (6 hex characters)
function isValidIcao24(value: string): boolean {
  return /^[0-9a-f]{6}$/i.test(value);
}

// Validate Unix timestamp
function isValidTime(value: string): boolean {
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0 && num < 2147483647; // Valid Unix timestamp range
}

// Parse and validate query parameters, returning safe URLSearchParams
function parseAndValidateParams(event: HandlerEvent): URLSearchParams | null {
  const params = event.queryStringParameters || {};
  const validated = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    // Skip if not in allowlist
    if (!ALLOWED_PARAMS.includes(key)) {
      continue;
    }

    // Skip null/undefined values
    if (value === null || value === undefined) {
      continue;
    }

    // Validate based on parameter type
    let isValid = false;

    switch (key) {
      case 'lamin':
      case 'lamax':
        isValid = isValidLatitude(value);
        break;
      case 'lomin':
      case 'lomax':
        isValid = isValidLongitude(value);
        break;
      case 'extended':
        isValid = isValidExtended(value);
        break;
      case 'icao24':
        isValid = isValidIcao24(value);
        break;
      case 'time':
        isValid = isValidTime(value);
        break;
      default:
        isValid = false;
    }

    if (isValid) {
      validated.set(key, value);
    }
  }

  return validated;
}

const handler: Handler = async event => {
  // Parse and validate query parameters (allowlist + type validation)
  const validatedParams = parseAndValidateParams(event);

  if (!validatedParams) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid query parameters' }),
    };
  }

  const token = event.headers['authorization'];

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = token;
  }

  try {
    const queryString = validatedParams.toString();
    const url = queryString
      ? `https://opensky-network.org/api/states/all?${queryString}`
      : 'https://opensky-network.org/api/states/all';

    const response = await fetch(url, { headers, cache: 'no-store' });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
      body: JSON.stringify(data),
    };
  } catch {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch aircraft data' }),
    };
  }
};

export { handler };
