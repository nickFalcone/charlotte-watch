import type {
  OpenMeteoResponse,
  GoogleAirQualityResponse,
  GooglePollenResponse,
  NWSPointResponse,
  NWSAlertsResponse,
  WeatherLocation,
} from '../types';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';
const NWS_BASE = 'https://api.weather.gov';

// Default location: Charlotte, NC
export const DEFAULT_LOCATION: WeatherLocation = {
  name: 'Charlotte',
  latitude: 35.2271,
  longitude: -80.8431,
  state: 'NC',
};

// Cache of known forecast zones to avoid unnecessary API calls
// Format: "latitude,longitude" -> zone ID
const KNOWN_FORECAST_ZONES: Record<string, string> = {
  // Charlotte, NC forecast zone
  '35.2271,-80.8431': 'NCZ071',
};

export async function fetchCurrentWeather(
  location: WeatherLocation,
  signal?: AbortSignal
): Promise<OpenMeteoResponse> {
  const params = new URLSearchParams({
    latitude: location.latitude.toString(),
    longitude: location.longitude.toString(),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
    ].join(','),
    hourly: [
      'temperature_2m',
      'precipitation_probability',
      'wind_speed_10m',
      'wind_direction_10m',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_direction_10m_dominant',
      'uv_index_max',
    ].join(','),
    forecast_days: '7',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    timezone: 'auto',
  });

  const response = await fetch(`${OPEN_METEO_BASE}/forecast?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  return response.json();
}

export async function fetchGoogleAirQuality(
  signal?: AbortSignal
): Promise<GoogleAirQualityResponse> {
  const response = await fetch('/api/google-air-quality', { signal });
  if (!response.ok) throw new Error(`Air quality API error: ${response.status}`);
  return response.json();
}

export async function fetchGooglePollen(signal?: AbortSignal): Promise<GooglePollenResponse> {
  const response = await fetch('/api/google-pollen', { signal });
  if (!response.ok) throw new Error(`Pollen API error: ${response.status}`);
  return response.json();
}

export async function fetchNWSPoint(
  location: WeatherLocation,
  signal?: AbortSignal
): Promise<NWSPointResponse> {
  const response = await fetch(`${NWS_BASE}/points/${location.latitude},${location.longitude}`, {
    headers: {
      'User-Agent': 'CharlotteMonitor/1.0 (weather-dashboard)',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`NWS Point API error: ${response.status}`);
  }

  return response.json();
}

export async function fetchNWSAlertsByZone(
  zoneId: string,
  signal?: AbortSignal
): Promise<NWSAlertsResponse> {
  // Extract zone ID from URL if full URL is provided
  const zone = zoneId.includes('/') ? zoneId.split('/').pop() : zoneId;

  const response = await fetch(`${NWS_BASE}/alerts/active/zone/${zone}`, {
    headers: {
      'User-Agent': 'CharlotteMonitor/1.0 (weather-dashboard)',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`NWS Alerts API error: ${response.status}`);
  }

  return response.json();
}

export async function fetchNWSAlertsByState(
  state: string,
  signal?: AbortSignal
): Promise<NWSAlertsResponse> {
  const response = await fetch(`${NWS_BASE}/alerts/active?area=${state}`, {
    headers: {
      'User-Agent': 'CharlotteMonitor/1.0 (weather-dashboard)',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`NWS Alerts API error: ${response.status}`);
  }

  return response.json();
}

// Combined function to get alerts for a location
export async function fetchAlertsForLocation(
  location: WeatherLocation,
  signal?: AbortSignal
): Promise<NWSAlertsResponse> {
  try {
    // Check if we have a cached zone for this location to avoid waterfall fetch
    const locationKey = `${location.latitude},${location.longitude}`;
    const cachedZone = KNOWN_FORECAST_ZONES[locationKey];

    if (cachedZone) {
      // Use cached zone directly - saves one API call
      return await fetchNWSAlertsByZone(cachedZone, signal);
    }

    // Cache miss: fetch point info to find the zone (waterfall fetch)
    const pointData = await fetchNWSPoint(location, signal);
    const zoneUrl = pointData.properties.forecastZone;

    // Then fetch alerts for that zone
    return await fetchNWSAlertsByZone(zoneUrl, signal);
  } catch {
    // Fallback to state-level alerts if point lookup fails
    if (location.state) {
      return await fetchNWSAlertsByState(location.state, signal);
    }
    throw new Error('Could not fetch alerts: no zone or state available');
  }
}

// Format temperature
export function formatTemp(temp: number): string {
  return `${Math.round(temp)}°F`;
}
