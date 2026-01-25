import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
`;

export const WeatherContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
`;

export const CurrentWeather = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

export const WeatherIcon = styled.div`
  font-size: 48px;
  line-height: 1;
`;

export const WeatherMain = styled.div`
  flex: 1;
`;

export const Temperature = styled.div`
  font-size: 36px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  line-height: 1;
`;

export const FeelsLike = styled.div`
  font-size: 13px;
  color: ${props => props.theme.colors.textSecondary};
  margin-top: 4px;
`;

export const Humidity = styled.div`
  font-size: 13px;
  color: ${props => props.theme.colors.textSecondary};
  margin-top: 4px;
`;

export const Condition = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
  margin-top: 4px;
`;

export const LocationName = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textMuted};
  margin-top: 8px;
`;

export const WeatherDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (max-width: 400px) {
    grid-template-columns: 1fr;
  }
`;

export const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  background: ${props => props.theme.colors.backgroundSecondary};
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.borderLight};
`;

export const DetailLabel = styled.span`
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const DetailValue = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin-top: 2px;
`;

export const HourlyForecast = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const HourlyForecastTitle = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const GraphContainer = styled.div`
  position: relative;
  width: 100%;
  height: 180px;
  padding: 12px 8px 8px 8px;
  background: ${props => props.theme.colors.backgroundSecondary};
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.borderLight};

  @media (max-width: 400px) {
    height: 160px;
    padding: 10px 6px 6px 6px;
  }
`;

export const GraphSvg = styled.svg`
  width: 100%;
  height: 100%;
  overflow: visible;
`;

export const GraphLegend = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 8px;
  font-size: 10px;

  @media (max-width: 300px) {
    gap: 12px;
    font-size: 9px;
  }
`;

export const LegendItem = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${props => props.theme.colors.textSecondary};
`;

export const LegendDot = styled.div<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};

  &[data-type='line'] {
    border-radius: 0;
    width: 12px;
    height: 2px;
  }
`;

export const YAxisLabel = styled.text`
  font-size: 9px;
  fill: ${props => props.theme.colors.textMuted};
  text-anchor: end;
`;

export const XAxisLabel = styled.text`
  font-size: 9px;
  fill: ${props => props.theme.colors.textMuted};
  text-anchor: middle;
`;

export const TempLine = styled.path`
  fill: none;
  stroke: #f59e0b;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
`;

export const WindLine = styled.path`
  fill: none;
  stroke: #60a5fa;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 4 4;
  opacity: 0.7;
`;

export const PrecipBar = styled.rect`
  fill: #3b82f6;
  opacity: 0.3;
`;

export const DataPoint = styled.circle`
  fill: #f59e0b;
  stroke: ${props => props.theme.colors.widgetBackground};
  stroke-width: 1.5;
`;

export const WindPoint = styled.circle`
  fill: #60a5fa;
  stroke: ${props => props.theme.colors.widgetBackground};
  stroke-width: 1;
  opacity: 0.7;
`;

export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
`;

export const LoadingText = styled.span`
  font-size: 14px;
  color: ${props => props.theme.colors.textMuted};
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

export const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  text-align: center;
`;

export const ErrorIcon = styled.div`
  font-size: 32px;
  opacity: 0.5;
`;

export const ErrorText = styled.span`
  font-size: 13px;
  color: ${props => props.theme.colors.error};
`;

export const RetryButton = styled.button`
  padding: 8px 16px;
  background: ${props => props.theme.colors.primary}30;
  border: 1px solid ${props => props.theme.colors.primary};
  border-radius: 6px;
  color: ${props => props.theme.colors.primary};
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${props => props.theme.colors.primary}40;
  }
`;

export const LastUpdated = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  text-align: right;
  margin-top: auto;
`;

export const AirQualityContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-top: 8px;
`;

export const AirQualityItem = styled.div`
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  background: ${props => props.theme.colors.backgroundSecondary};
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.borderLight};
`;

export const IndicatorValue = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const AQIIndicator = styled.div<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;
