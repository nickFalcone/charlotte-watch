import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Popover from '@radix-ui/react-popover';
import type { WidgetProps } from '../../types';
import {
  fetchCurrentWeather,
  fetchAirQuality,
  DEFAULT_LOCATION,
  formatTemp,
} from '../../utils/weatherApi';
import { queryKeys } from '../../utils/queryKeys';
import { useWidgetMetadata } from '../Widget';
import { useWeatherSummary } from '../../hooks';
import { AnimatedPopoverContent, InfoIcon, InfoTrigger } from '../common';
import infoIcon from '../../assets/icons/info.svg';
import { WeatherRadarMap } from './WeatherRadarMap';
import {
  WeatherContainer,
  WeatherMain,
  NowLabel,
  Temperature,
  FeelsLike,
  WeatherTopRow,
  LoadingContainer,
  LoadingText,
  ErrorContainer,
  ErrorText,
  RetryButton,
  Next12Section,
  SectionTitleRow,
  SectionTitle,
  SummaryBox,
  SummaryInlineTrigger,
  WeatherSummaryText,
} from './WeatherWidget.styles';

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

  const { data: summaryData, isLoading: summaryLoading } = useWeatherSummary(weather, {
    airQuality,
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

  return (
    <WeatherContainer>
      <WeatherTopRow>
        <WeatherMain>
          <NowLabel>Now</NowLabel>
          <Temperature>{formatTemp(current.temperature_2m)}</Temperature>
          <FeelsLike>Feels like {formatTemp(current.apparent_temperature)}</FeelsLike>
        </WeatherMain>
        <Next12Section>
          {summaryLoading && <WeatherSummaryText>Generating summary...</WeatherSummaryText>}
          {!summaryLoading && summaryData?.summary && (
            <SummaryBox>
              {summaryData.summary}
              <SummaryInlineTrigger>
                <Popover.Root>
                  <Popover.Trigger asChild>
                    <InfoTrigger aria-label="About AI summary">
                      <InfoIcon src={infoIcon} alt="" aria-hidden />
                    </InfoTrigger>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <AnimatedPopoverContent side="top" sideOffset={6}>
                      This is an AI-generated summary of the expected weather over the next 12
                      hours.
                    </AnimatedPopoverContent>
                  </Popover.Portal>
                </Popover.Root>
              </SummaryInlineTrigger>
            </SummaryBox>
          )}
        </Next12Section>
      </WeatherTopRow>

      <Next12Section>
        <SectionTitleRow>
          <SectionTitle>NEXRAD Radar - Past 4 Hours</SectionTitle>
        </SectionTitleRow>
        <WeatherRadarMap />
      </Next12Section>
    </WeatherContainer>
  );
}
