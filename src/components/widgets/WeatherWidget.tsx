import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addHours, format } from 'date-fns';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { WidgetProps } from '../../types';
import {
  fetchCurrentWeather,
  fetchAirQuality,
  DEFAULT_LOCATION,
  getWindDirection,
  formatTemp,
  getAirQualityInfo,
  getUVIndexInfo,
} from '../../utils/weatherApi';
import { queryKeys } from '../../utils/queryKeys';
import { useWidgetMetadata } from '../Widget';
import {
  WeatherContainer,
  CurrentWeather,
  WeatherMain,
  Temperature,
  FeelsLike,
  WeatherDetails,
  DetailItem,
  DetailLabel,
  DetailValue,
  LoadingContainer,
  LoadingText,
  ErrorContainer,
  ErrorText,
  RetryButton,
  HourlyForecast,
  HourlyForecastTitle,
  GraphContainer,
  IndicatorValue,
  AQIIndicator,
} from './WeatherWidget.styles';

// WeatherChart component using Recharts
interface WeatherChartProps {
  hourlyData: Array<{
    time: string;
    temp: number;
    precip: number;
    windSpeed: number;
  }>;
}

function WeatherChart({ hourlyData }: WeatherChartProps) {
  const chartData = hourlyData.map((hour, index) => ({
    time: hour.time,
    temperature: hour.temp,
    precipitation: hour.precip,
    windSpeed: hour.windSpeed,
    hour: index,
  }));

  return (
    <GraphContainer>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="time"
            stroke="#94a3b8"
            fontSize={10}
            interval="preserveStartEnd"
            tick={{ fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="temp"
            orientation="left"
            stroke="#f59e0b"
            fontSize={9}
            width={25}
            tick={{ fontSize: 8 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="precip"
            orientation="right"
            stroke="#3b82f6"
            fontSize={9}
            width={20}
            tick={{ fontSize: 8 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} iconSize={8} />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temperature"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 2 }}
            name="Temp"
          />
          <Bar
            yAxisId="precip"
            dataKey="precipitation"
            fill="#3b82f6"
            opacity={0.6}
            name="Rain %"
          />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="windSpeed"
            stroke="#60a5fa"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={{ fill: '#60a5fa', strokeWidth: 1, r: 1.5 }}
            name="Wind"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </GraphContainer>
  );
}

export function WeatherWidget(_props: WidgetProps) {
  const { setLastUpdated } = useWidgetMetadata();

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
    queryFn: ({ signal }) => fetchAirQuality(DEFAULT_LOCATION, signal),
    staleTime: 1000 * 60 * 15, // 15 minutes
    refetchInterval: 1000 * 60 * 30, // 30 minutes
  });

  // Sync React Query's dataUpdatedAt timestamp to widget metadata context.
  // MUST use useEffect to avoid infinite render loops - calling setLastUpdated directly
  // in render causes the context to update, triggering re-render, causing another update, etc.
  useEffect(() => {
    const latestTime =
      weatherUpdatedAt && airQualityUpdatedAt
        ? Math.max(weatherUpdatedAt, airQualityUpdatedAt)
        : weatherUpdatedAt || airQualityUpdatedAt;
    setLastUpdated(latestTime || null);
  }, [weatherUpdatedAt, airQualityUpdatedAt, setLastUpdated]);

  const isLoading = weatherLoading || airQualityLoading;
  const isError = weatherError || airQualityError;
  const error = weatherErrorData;

  if (isLoading) {
    return (
      <LoadingContainer>
        {/* <WeatherIcon src={planeIcon} alt="Loading weather" /> */}
        <LoadingText>Loading weather...</LoadingText>
      </LoadingContainer>
    );
  }

  if (isError) {
    const handleRetry = () => {
      void refetchWeather();
      void refetchAirQuality();
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
  const windDir = getWindDirection(current.wind_direction_10m);

  // Format hourly forecast data
  const hourlyData = weather.hourly
    ? (() => {
        const hours = weather.hourly.time.slice(0, 12);
        const temps = weather.hourly.temperature_2m.slice(0, 12);
        const precip = weather.hourly.precipitation_probability.slice(0, 12);
        const windSpeed = weather.hourly.wind_speed_10m.slice(0, 12);

        return hours.map((_, index) => {
          const timeLabel =
            index === 0 ? 'Now' : format(addHours(new Date(), index), 'ha').toLowerCase();

          return {
            time: timeLabel,
            temp: temps[index],
            precip: precip[index],
            windSpeed: windSpeed[index],
          };
        });
      })()
    : [];

  // Air quality data
  const aqiInfo = airQuality?.current ? getAirQualityInfo(airQuality.current.european_aqi) : null;
  const uvInfo = airQuality?.current ? getUVIndexInfo(airQuality.current.uv_index) : null;

  return (
    <WeatherContainer>
      <CurrentWeather>
        {/* <WeatherIcon>{weatherInfo.icon}</WeatherIcon> */}
        <WeatherMain>
          <Temperature>{formatTemp(current.temperature_2m)}</Temperature>
          <FeelsLike>Feels like {formatTemp(current.apparent_temperature)}</FeelsLike>
          {/* <Condition>{weatherInfo.description}</Condition> */}
        </WeatherMain>
      </CurrentWeather>

      <WeatherDetails>
        <DetailItem>
          <DetailLabel>Humidity</DetailLabel>
          <DetailValue>{current.relative_humidity_2m}%</DetailValue>
        </DetailItem>
        <DetailItem>
          <DetailLabel>Wind</DetailLabel>
          <DetailValue>
            {Math.round(current.wind_speed_10m)} mph {windDir}
          </DetailValue>
        </DetailItem>
        {aqiInfo && (
          <DetailItem>
            <DetailLabel>Air Quality</DetailLabel>
            <IndicatorValue>
              <AQIIndicator $color={aqiInfo.color} />
              <span>
                {aqiInfo.level} ({airQuality!.current.european_aqi})
              </span>
            </IndicatorValue>
          </DetailItem>
        )}
        {uvInfo && (
          <DetailItem>
            <DetailLabel>UV Index</DetailLabel>
            <IndicatorValue>
              <AQIIndicator $color={uvInfo.color} />
              <span>
                {uvInfo.level} ({airQuality!.current.uv_index})
              </span>
            </IndicatorValue>
          </DetailItem>
        )}
      </WeatherDetails>

      {hourlyData.length > 0 && (
        <HourlyForecast>
          <HourlyForecastTitle>Next 12 Hours</HourlyForecastTitle>
          <WeatherChart hourlyData={hourlyData} />
        </HourlyForecast>
      )}
    </WeatherContainer>
  );
}
