// Open-Meteo API Types
export interface OpenMeteoCurrentWeather {
  time: string;
  interval: number;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  weather_code: number;
  cloud_cover: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
}

export interface OpenMeteoHourlyWeather {
  time: string[];
  temperature_2m: number[];
  precipitation_probability: number[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: Record<string, string>;
  current: OpenMeteoCurrentWeather;
  hourly_units?: Record<string, string>;
  hourly?: OpenMeteoHourlyWeather;
}

export interface OpenMeteoAirQualityCurrent {
  time: string;
  interval: number;
  european_aqi: number;
  pm10: number;
  pm2_5: number;
  carbon_monoxide: number;
  nitrogen_dioxide: number;
  sulphur_dioxide: number;
  ozone: number;
  dust: number;
  uv_index: number;
  uv_index_clear_sky: number;
}

export interface OpenMeteoAirQualityResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: Record<string, string>;
  current: OpenMeteoAirQualityCurrent;
}

// NWS API Types
export interface NWSPointResponse {
  properties: {
    forecastZone: string;
    county: string;
    fireWeatherZone: string;
    relativeLocation: {
      properties: {
        city: string;
        state: string;
      };
    };
  };
}

export interface NWSAlertProperties {
  id: string;
  areaDesc: string;
  headline: string;
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
  certainty: 'Observed' | 'Likely' | 'Possible' | 'Unlikely' | 'Unknown';
  urgency: 'Immediate' | 'Expected' | 'Future' | 'Past' | 'Unknown';
  event: string;
  effective: string;
  expires: string;
  description: string;
  instruction: string | null;
}

export interface NWSAlert {
  id: string;
  type: string;
  properties: NWSAlertProperties;
}

export interface NWSAlertsResponse {
  features: NWSAlert[];
}

// Location configuration
export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
  state?: string;
}

// Severity colors for alerts
export const ALERT_SEVERITY_COLORS: Record<string, string> = {
  Extreme: '#dc2626',
  Severe: '#ea580c',
  Moderate: '#f59e0b',
  Minor: '#eab308',
  Unknown: '#6b7280',
};
