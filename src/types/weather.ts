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

export interface OpenMeteoDailyWeather {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
  wind_speed_10m_max: number[];
  wind_direction_10m_dominant: number[];
  uv_index_max: number[];
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
  daily_units?: Record<string, string>;
  daily?: OpenMeteoDailyWeather;
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

// Google Air Quality API
export interface GoogleAirQualityIndex {
  code: string; // 'usa_epa', 'uaqi'
  displayName: string;
  aqi: number;
  aqiDisplay: string;
  color: { red?: number; green?: number; blue?: number };
  category: string; // 'Good', 'Moderate', 'Unhealthy for Sensitive Groups', etc.
  dominantPollutant?: string;
}

export interface GoogleAirQualityPollutant {
  code: string; // 'pm25', 'pm10', 'no2', 'o3', 'so2', 'co'
  displayName: string;
  fullName: string;
  concentration: {
    value: number;
    units: string; // 'MICROGRAMS_PER_CUBIC_METER', 'PARTS_PER_BILLION'
  };
}

export interface GoogleAirQualityResponse {
  dateTime: string;
  regionCode: string;
  indexes: GoogleAirQualityIndex[];
  pollutants: GoogleAirQualityPollutant[];
}

// Google Pollen API
export interface GooglePollenIndexInfo {
  code: string; // 'UPI'
  displayName: string;
  value: number; // 0–5
  category: string; // 'None', 'Very Low', 'Low', 'Moderate', 'High', 'Very High'
  indexDescription: string;
}

export interface GooglePollenTypeInfo {
  code: string; // 'GRASS', 'TREE', 'WEED'
  displayName: string;
  inSeason: boolean;
  indexInfo?: GooglePollenIndexInfo;
}

export interface GooglePollenDailyInfo {
  date: { year: number; month: number; day: number };
  pollenTypeInfo: GooglePollenTypeInfo[];
}

export interface GooglePollenResponse {
  regionCode: string;
  dailyInfo: GooglePollenDailyInfo[];
}
