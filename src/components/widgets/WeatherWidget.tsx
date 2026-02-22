import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Popover from '@radix-ui/react-popover';
import type { WidgetProps } from '../../types';
import infoIcon from '../../assets/icons/info.svg';
import {
  fetchCurrentWeather,
  fetchGoogleAirQuality,
  fetchGooglePollen,
  DEFAULT_LOCATION,
  formatTemp,
} from '../../utils/weatherApi';
import { queryKeys } from '../../utils/queryKeys';
import { useWidgetMetadata } from '../Widget';
import { useWeatherSummary } from '../../hooks';
import {
  WidgetTabs,
  TabPanel,
  AnimatedPopoverContent,
  InfoIcon,
  InfoTrigger,
  formatGeneratedAt,
} from '../common';
import { WeatherRadarMap } from './WeatherRadarMap';
import {
  LoadingContainer,
  LoadingText,
  ErrorContainer,
  ErrorText,
  RetryButton,
  SummaryText,
  SummaryMetaRow,
  SummaryGeneratedAt,
  ForecastCurrentRow,
  ForecastCurrentTemp,
  ForecastCurrentMeta,
  ForecastDivider,
  ForecastDayList,
  ForecastDayHeaderRow,
  ForecastDayHeaderDay,
  ForecastDayHeaderForecast,
  ForecastDayHeaderHighLow,
  ForecastDayHeaderPrecip,
  ForecastDayRow,
  ForecastDayName,
  ForecastCondition,
  ForecastHighLow,
  ForecastPrecip,
  AqiScoreRow,
  AqiScore,
  AqiCategory,
  PollutantGrid,
  PollutantItem,
  PollutantLabel,
  PollutantValue,
  PollutantCategory,
  PollenSection,
  PollenSectionTitle,
  PollenGrid,
  PollenItem,
  PollenLabel,
  PollenValue,
} from './WeatherWidget.styles';

function wmoDescription(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code === 56 || code === 57) return 'Freezing drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code === 66 || code === 67) return 'Freezing rain';
  if (code >= 71 && code <= 75) return 'Snow';
  if (code === 77) return 'Snow grains';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code === 95) return 'Thunderstorm';
  if (code === 96 || code === 99) return 'Thunderstorm with hail';
  return 'Unknown conditions';
}

const EPA_AQI_COLORS: Record<string, string> = {
  good: '#16a34a',
  moderate: '#ca8a04',
  'unhealthy for sensitive groups': '#ea580c',
  unhealthy: '#dc2626',
  'very unhealthy': '#9333ea',
  hazardous: '#7f1d1d',
};

function epaAqiColor(category: string): string {
  return EPA_AQI_COLORS[category.toLowerCase()] ?? '#6b7280';
}

function pollenColor(category: string): string {
  const lower = category.toLowerCase();
  if (lower === 'none') return '#6b7280';
  if (lower === 'very low') return '#16a34a';
  if (lower === 'low') return '#65a30d';
  if (lower === 'moderate') return '#ca8a04';
  if (lower === 'high') return '#ea580c';
  if (lower === 'very high') return '#dc2626';
  return '#6b7280';
}

function formatConcentrationUnit(units: string): string {
  if (units === 'MICROGRAMS_PER_CUBIC_METER') return 'µg/m³';
  if (units === 'PARTS_PER_BILLION') return 'ppb';
  return units;
}

function windDirectionLabel(degrees: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(degrees / 45) % 8];
}

function formatDayName(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  if (isToday) return 'Today';
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// EPA AQI breakpoints (upper bound per category) by pollutant code and native unit
// PM2.5, PM10: µg/m³ | O3, NO2, SO2, CO: ppb
const POLLUTANT_THRESHOLDS: Record<string, number[]> = {
  pm25: [9.0, 35.4, 55.4, 125.4, 225.4],
  pm10: [54, 154, 254, 354, 424],
  o3: [54, 70, 85, 105, 200],
  no2: [53, 100, 360, 649, 1249],
  so2: [35, 75, 185, 304, 604],
  co: [4400, 9400, 12400, 15400, 30400],
};

const EPA_CATEGORIES = [
  { label: 'Good', color: '#16a34a' },
  { label: 'Moderate', color: '#ca8a04' },
  { label: 'Sensitive Groups', color: '#ea580c' },
  { label: 'Unhealthy', color: '#dc2626' },
  { label: 'Very Unhealthy', color: '#9333ea' },
  { label: 'Hazardous', color: '#7f1d1d' },
] as const;

function pollutantCategory(code: string, value: number): { label: string; color: string } | null {
  const thresholds = POLLUTANT_THRESHOLDS[code];
  if (!thresholds) return null;
  const index = thresholds.findIndex(t => value <= t);
  return EPA_CATEGORIES[index === -1 ? 5 : index];
}

// Ordered list of pollutant codes for consistent display
const POLLUTANT_ORDER = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co'];

export function WeatherWidget(_props: WidgetProps) {
  const { setLastUpdated } = useWidgetMetadata();
  const [activeTab, setActiveTab] = useState('summary');

  const {
    data: weather,
    isLoading: weatherLoading,
    isError: weatherError,
    error: weatherErrorData,
    dataUpdatedAt: weatherUpdatedAt,
    refetch: refetchWeather,
  } = useQuery({
    queryKey: queryKeys.weather.current(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude),
    queryFn: ({ signal }) => fetchCurrentWeather(DEFAULT_LOCATION, signal),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10, // 10 minutes
  });

  const {
    data: airQuality,
    isLoading: airQualityLoading,
    isError: airQualityError,
    dataUpdatedAt: airQualityUpdatedAt,
    refetch: refetchAirQuality,
  } = useQuery({
    queryKey: queryKeys.weather.airQuality(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude),
    queryFn: ({ signal }) => fetchGoogleAirQuality(signal),
    staleTime: 1000 * 60 * 15, // 15 minutes
    refetchInterval: 1000 * 60 * 30, // 30 minutes
  });

  const {
    data: pollen,
    isLoading: pollenLoading,
    dataUpdatedAt: pollenUpdatedAt,
    refetch: refetchPollen,
  } = useQuery({
    queryKey: queryKeys.weather.pollen(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude),
    queryFn: ({ signal }) => fetchGooglePollen(signal),
    staleTime: 1000 * 60 * 60, // 1 hour — pollen changes slowly
    refetchInterval: 1000 * 60 * 60,
  });

  const { data: summaryData, isLoading: summaryLoading } = useWeatherSummary(weather);

  useEffect(() => {
    const times = [weatherUpdatedAt, airQualityUpdatedAt, pollenUpdatedAt].filter(
      Boolean
    ) as number[];
    setLastUpdated(times.length > 0 ? Math.max(...times) : null);
  }, [weatherUpdatedAt, airQualityUpdatedAt, pollenUpdatedAt, setLastUpdated]);

  const isLoading = weatherLoading || airQualityLoading || pollenLoading;
  const isError = weatherError || airQualityError;
  const error = weatherErrorData;

  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingText>Loading weather...</LoadingText>
      </LoadingContainer>
    );
  }

  if (isError) {
    const handleRetry = () => {
      void refetchWeather();
      void refetchAirQuality();
      void refetchPollen();
    };

    return (
      <ErrorContainer>
        <ErrorText>{error instanceof Error ? error.message : 'Failed to load weather'}</ErrorText>
        <RetryButton onClick={handleRetry}>Retry</RetryButton>
      </ErrorContainer>
    );
  }

  if (!weather) {
    return null;
  }

  const current = weather.current;
  const daily = weather.daily;
  const todayUvMax = daily?.uv_index_max[0];

  // Build ordered pollutants map for consistent display
  const pollutantMap = new Map((airQuality?.pollutants ?? []).map(p => [p.code, p]));

  // Today's pollen types from Google Pollen API
  const pollenTypes = pollen?.dailyInfo[0]?.pollenTypeInfo ?? [];

  // US EPA AQI index from Google Air Quality API
  const epaIndex = airQuality?.indexes.find(i => i.code === 'usa_epa');

  return (
    <WidgetTabs defaultValue="summary" onValueChange={setActiveTab}>
      <TabPanel value="summary" label="Summary">
        {summaryLoading || !summaryData ? (
          <LoadingContainer>
            <LoadingText>Generating summary...</LoadingText>
          </LoadingContainer>
        ) : (
          <>
            <SummaryText>{summaryData.summary}</SummaryText>
            <SummaryMetaRow>
              {summaryData.generatedAt && (
                <SummaryGeneratedAt>
                  Generated: {formatGeneratedAt(summaryData.generatedAt)}
                </SummaryGeneratedAt>
              )}
              <Popover.Root>
                <Popover.Trigger asChild>
                  <InfoTrigger aria-label="About AI summary">
                    <InfoIcon src={infoIcon} alt="" aria-hidden />
                  </InfoTrigger>
                </Popover.Trigger>
                <Popover.Portal>
                  <AnimatedPopoverContent side="top" sideOffset={6}>
                    This is an AI-generated summary of the next 12 hours of weather. Always confirm
                    details with an authoritative forecast.
                  </AnimatedPopoverContent>
                </Popover.Portal>
              </Popover.Root>
            </SummaryMetaRow>
          </>
        )}
      </TabPanel>

      <TabPanel value="forecast" label="Forecast">
        <ForecastCurrentRow>
          <ForecastCurrentTemp
            aria-label={`Current temperature ${formatTemp(current.temperature_2m)}`}
          >
            {formatTemp(current.temperature_2m)}
          </ForecastCurrentTemp>
          <ForecastCurrentMeta>
            <span>Feels like {formatTemp(current.apparent_temperature)}</span>
            <span>
              Wind {Math.round(current.wind_speed_10m)} mph{' '}
              {windDirectionLabel(current.wind_direction_10m)}
            </span>
            <span>Humidity {current.relative_humidity_2m}%</span>
          </ForecastCurrentMeta>
        </ForecastCurrentRow>

        {daily && (
          <>
            <ForecastDivider aria-hidden />
            <ForecastDayList role="list" aria-label="7-day forecast">
              <ForecastDayHeaderRow role="presentation" aria-hidden>
                <ForecastDayHeaderDay>Day</ForecastDayHeaderDay>
                <ForecastDayHeaderForecast>Forecast</ForecastDayHeaderForecast>
                <ForecastDayHeaderHighLow>High / Low</ForecastDayHeaderHighLow>
                <ForecastDayHeaderPrecip>Precip</ForecastDayHeaderPrecip>
              </ForecastDayHeaderRow>
              {daily.time.map((date, i) => (
                <ForecastDayRow key={date} role="listitem">
                  <ForecastDayName>{formatDayName(date)}</ForecastDayName>
                  <ForecastCondition>{wmoDescription(daily.weather_code[i])}</ForecastCondition>
                  <ForecastHighLow>
                    {formatTemp(daily.temperature_2m_max[i])} /{' '}
                    {formatTemp(daily.temperature_2m_min[i])}
                  </ForecastHighLow>
                  <ForecastPrecip
                    aria-label={`${daily.precipitation_probability_max[i]}% chance of rain`}
                  >
                    {daily.precipitation_probability_max[i]}%
                  </ForecastPrecip>
                </ForecastDayRow>
              ))}
            </ForecastDayList>
          </>
        )}
      </TabPanel>

      <TabPanel value="radar" label="Radar" forceMount>
        <WeatherRadarMap active={activeTab === 'radar'} />
      </TabPanel>

      <TabPanel value="air-quality" label="Air Quality">
        {epaIndex ? (
          <>
            <AqiScoreRow>
              <AqiScore aria-label={`US EPA Air Quality Index ${epaIndex.aqi}`}>
                {epaIndex.aqi}
              </AqiScore>
              <AqiCategory
                $color={epaAqiColor(epaIndex.category)}
                aria-label={`Air quality: ${epaIndex.category}`}
              >
                {epaIndex.category}
              </AqiCategory>
            </AqiScoreRow>

            <PollutantGrid aria-label="Air pollutant concentrations">
              {POLLUTANT_ORDER.map(code => {
                const p = pollutantMap.get(code);
                if (!p) return null;
                const cat = pollutantCategory(code, p.concentration.value);
                return (
                  <PollutantItem key={code}>
                    <PollutantLabel>{p.fullName}</PollutantLabel>
                    <PollutantValue>
                      {p.concentration.value.toFixed(1)}{' '}
                      {formatConcentrationUnit(p.concentration.units)}
                    </PollutantValue>
                    {cat && (
                      <PollutantCategory
                        $color={cat.color}
                        aria-label={`${p.fullName}: ${cat.label}`}
                      >
                        {cat.label}
                      </PollutantCategory>
                    )}
                  </PollutantItem>
                );
              })}
              {todayUvMax != null && (
                <PollutantItem>
                  <PollutantLabel>UV Index</PollutantLabel>
                  <PollutantValue>{todayUvMax.toFixed(1)}</PollutantValue>
                </PollutantItem>
              )}
            </PollutantGrid>

            {pollenTypes.length > 0 && (
              <PollenSection>
                <PollenSectionTitle>Pollen</PollenSectionTitle>
                <PollenGrid aria-label="Pollen levels by type">
                  {pollenTypes.map(pt => (
                    <PollenItem key={pt.code}>
                      <PollenLabel>{pt.displayName}</PollenLabel>
                      <PollenValue
                        style={{
                          color: pt.indexInfo ? pollenColor(pt.indexInfo.category) : undefined,
                        }}
                      >
                        {pt.indexInfo
                          ? `${pt.indexInfo.category} (${pt.indexInfo.value}/5)`
                          : pt.inSeason
                            ? 'No data'
                            : 'Out of season'}
                      </PollenValue>
                    </PollenItem>
                  ))}
                </PollenGrid>
              </PollenSection>
            )}
          </>
        ) : (
          <LoadingContainer>
            <LoadingText>Loading air quality...</LoadingText>
          </LoadingContainer>
        )}
      </TabPanel>
    </WidgetTabs>
  );
}
