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

export const WeatherIcon = styled.img`
  width: 48px;
  height: 48px;
  filter: ${props => props.theme.iconFilter};
`;

export const WeatherMain = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  flex: 0 0 auto;
  min-width: 0;
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

export const WeatherTopRow = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
`;

export const Next12Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1 1 200px;
  min-width: 0;
`;

/** Section title in sentence case for softer hierarchy (e.g. "Next 12 hours"). */
export const SectionTitleSentenceCase = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 600;
  letter-spacing: 0.3px;
`;

// --- Forecast tab ---

export const ForecastCurrentRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 8px 24px;
`;

export const ForecastCurrentTemp = styled.div`
  font-size: 36px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  line-height: 1;
`;

export const ForecastCurrentMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  color: ${props => props.theme.colors.textSecondary};
`;

export const ForecastDivider = styled.hr`
  border: none;
  border-top: 1px solid ${props => props.theme.colors.borderLight};
  margin: 8px 0;
`;

export const ForecastDayList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const ForecastDayHeaderRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 5px 0 4px;
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border-bottom: 1px solid ${props => props.theme.colors.borderLight};
`;

export const ForecastDayHeaderDay = styled.span`
  min-width: 36px;
`;

export const ForecastDayHeaderForecast = styled.span`
  flex: 1;
  min-width: 0;
  margin-left: 12px;
`;

export const ForecastDayHeaderHighLow = styled.span`
  white-space: nowrap;
`;

export const ForecastDayHeaderPrecip = styled.span`
  min-width: 40px;
  text-align: right;
  margin-left: 12px;
`;

export const ForecastDayRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 5px 0;
  border-bottom: 1px solid ${props => props.theme.colors.borderLight};

  &:last-child {
    border-bottom: none;
  }
`;

export const ForecastDayName = styled.span`
  font-size: 13px;
  color: ${props => props.theme.colors.text};
  font-weight: 500;
  min-width: 36px;
`;

export const ForecastCondition = styled.span`
  font-size: 13px;
  color: ${props => props.theme.colors.textSecondary};
  flex: 1;
  min-width: 0;
  margin-left: 12px;
`;

export const ForecastHighLow = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${props => props.theme.colors.text};
  white-space: nowrap;
`;

export const ForecastPrecip = styled.span`
  font-size: 12px;
  color: ${props => props.theme.colors.textMuted};
  min-width: 40px;
  text-align: right;
  margin-left: 12px;
`;

// --- Summary tab ---

export const SummaryText = styled.p`
  font-size: 16px;
  line-height: 1.6;
  color: ${props => props.theme.colors.textSecondary};
  margin: 0;
`;

export const SummaryMetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
`;

// --- Air Quality tab ---

export const AqiScoreRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`;

export const AqiScore = styled.div`
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
  color: ${props => props.theme.colors.text};
`;

export const AqiCategory = styled.div<{ $color: string }>`
  font-size: 14px;
  font-weight: 600;
  color: ${({ $color }) => $color};
`;

export const PollutantGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

export const PollutantItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  background: ${props => props.theme.colors.backgroundSecondary};
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.borderLight};
`;

export const PollutantLabel = styled.span`
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

export const PollutantValue = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme.colors.text};
`;

export const PollutantCategory = styled.span<{ $color: string }>`
  font-size: 11px;
  font-weight: 500;
  color: ${({ $color }) => $color};
`;

export const PollenSection = styled.div`
  margin-top: 16px;
`;

export const PollenSectionTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.theme.colors.textSecondary};
  letter-spacing: 0.3px;
  margin-bottom: 8px;
`;

export const PollenGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

export const PollenItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  background: ${props => props.theme.colors.backgroundSecondary};
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.borderLight};
`;

export const PollenLabel = styled.span`
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

export const PollenValue = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme.colors.text};
`;

export const PollenUnavailable = styled.p`
  font-size: 13px;
  color: ${props => props.theme.colors.textMuted};
  margin: 0;
`;

export const RadarMapContainer = styled.div`
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
  border-radius: 8px;
  overflow: hidden;
  background: ${props => props.theme.colors.backgroundSecondary};
  border: 1px solid ${props => props.theme.colors.borderLight};

  .leaflet-container {
    height: 100%;
    width: 100%;
    background: ${props => props.theme.colors.backgroundTertiary};
  }

  .leaflet-tile-pane {
    filter: ${props =>
      props.theme.name === 'dark'
        ? 'brightness(0.78) contrast(1.2) saturate(0.85)'
        : 'brightness(1) contrast(1) saturate(1)'};
  }

  .leaflet-tile-pane img {
    /* Decorative: base map tiles provide visual context but geographic info is redundant
       with interactive map controls. Screen readers get map description via aria-label. */
    alt: '';
  }

  .leaflet-control-zoom {
    border: 1px solid ${props => props.theme.colors.border} !important;
    border-radius: 4px !important;
  }

  .leaflet-control-zoom a {
    background-color: ${props => props.theme.colors.backgroundSecondary} !important;
    color: ${props => props.theme.colors.text} !important;
    border-bottom: 1px solid ${props => props.theme.colors.border} !important;
  }

  .leaflet-control-attribution {
    background: ${props => props.theme.colors.backgroundSecondary} !important;
    color: ${props => props.theme.colors.textMuted} !important;
    font-size: 9px !important;
    padding: 2px 6px !important;
  }
`;

export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

export const RadarMapControls = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const RadarControls = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${props => props.theme.colors.backgroundSecondary}ee;
  backdrop-filter: blur(8px);
  border-top: 1px solid ${props => props.theme.colors.border};
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1000;
`;

export const RadarControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const RadarPlayButton = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: ${props => props.theme.colors.primary};
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover {
    background: ${props => props.theme.colors.primaryHover || props.theme.colors.primary};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

/** Play/pause icon on primary button; filter ensures white icon for contrast in both themes. */
export const RadarPlayButtonIcon = styled.img`
  width: 14px;
  height: 14px;
  object-fit: contain;
  filter: brightness(0) invert(1);
`;

/** Radix Slider parts for radar timeline - track container */
export const RadarSliderRoot = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
`;

/** Radix Slider track (background) */
export const RadarSliderTrack = styled.span`
  position: relative;
  flex-grow: 1;
  height: 4px;
  border-radius: 2px;
  background: ${props => props.theme.colors.backgroundTertiary};
  cursor: pointer;
`;

/** Radix Slider range (filled portion) */
export const RadarSliderRange = styled.span`
  position: absolute;
  height: 100%;
  border-radius: 2px;
  background: ${props => props.theme.colors.primary};
`;

/** Radix Slider thumb */
export const RadarSliderThumb = styled.span`
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${props => props.theme.colors.primary};
  cursor: pointer;
  transition: transform 0.15s ease;

  &:hover {
    transform: scale(1.2);
  }
`;

export const RadarTimeDisplay = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.text};
  font-weight: 500;
  min-width: 120px;
  text-align: right;
  flex-shrink: 0;
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

export const ErrorIcon = styled.img`
  width: 32px;
  height: 32px;
  opacity: 0.5;
  filter: ${props => props.theme.iconFilter};
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
