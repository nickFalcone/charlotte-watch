import type {
  OpenMeteoResponse,
  OpenMeteoAirQualityResponse,
  NWSPointResponse,
  NWSAlertsResponse,
  WeatherLocation,
} from '../types';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';
const AIR_QUALITY_BASE = 'https://air-quality-api.open-meteo.com/v1';
const NWS_BASE = 'https://api.weather.gov';

// Default location: Charlotte, NC
// Temporary test location with winter alerts
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
    forecast_days: '1',
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

export async function fetchAirQuality(
  location: WeatherLocation,
  signal?: AbortSignal
): Promise<OpenMeteoAirQualityResponse> {
  const params = new URLSearchParams({
    latitude: location.latitude.toString(),
    longitude: location.longitude.toString(),
    current: [
      'european_aqi',
      'pm10',
      'pm2_5',
      'carbon_monoxide',
      'nitrogen_dioxide',
      'sulphur_dioxide',
      'ozone',
      'dust',
      'uv_index',
      'uv_index_clear_sky',
    ].join(','),
    timezone: 'auto',
  });

  const response = await fetch(`${AIR_QUALITY_BASE}/air-quality?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Air Quality API error: ${response.status}`);
  }

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

// Get wind direction as cardinal direction
export function getWindDirection(degrees: number): string {
  const directions = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// Format temperature
export function formatTemp(temp: number): string {
  return `${Math.round(temp)}°F`;
}

// Air quality interpretation
export function getAirQualityInfo(aqi: number): {
  level: string;
  color: string;
  description: string;
} {
  if (aqi <= 20)
    return { level: 'Good', color: '#22c55e', description: 'Air quality is satisfactory' };
  if (aqi <= 40)
    return { level: 'Fair', color: '#eab308', description: 'Air quality is acceptable' };
  if (aqi <= 60)
    return {
      level: 'Moderate',
      color: '#f97316',
      description: 'Members of sensitive groups may experience health effects',
    };
  if (aqi <= 80)
    return {
      level: 'Poor',
      color: '#dc2626',
      description: 'Everyone may begin to experience health effects',
    };
  if (aqi <= 100)
    return {
      level: 'Very Poor',
      color: '#7c2d12',
      description: 'Health warnings of emergency conditions',
    };
  return {
    level: 'Extremely Poor',
    color: '#1f2937',
    description: 'Health alert: everyone may experience more serious health effects',
  };
}

// UV Index interpretation
export function getUVIndexInfo(uvIndex: number): {
  level: string;
  color: string;
  description: string;
} {
  if (uvIndex <= 2)
    return { level: 'Low', color: '#22c55e', description: 'Minimal sun protection required' };
  if (uvIndex <= 5)
    return { level: 'Moderate', color: '#eab308', description: 'Sun protection recommended' };
  if (uvIndex <= 7)
    return { level: 'High', color: '#f97316', description: 'Sun protection essential' };
  if (uvIndex <= 10)
    return { level: 'Very High', color: '#dc2626', description: 'Extra sun protection required' };
  return { level: 'Extreme', color: '#7c2d12', description: 'Avoid sun exposure' };
}
