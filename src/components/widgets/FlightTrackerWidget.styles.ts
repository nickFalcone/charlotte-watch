import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
`;

const radarSweep = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

export const FlightContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 8px;
  overflow: hidden;
`;

export const FlightHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`;

export const AirportInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const AirportCode = styled.h3`
  font-size: 14px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin: 0;
`;

export const FlightCount = styled.span<{ $hasFlights: boolean }>`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  background: ${({ $hasFlights, theme }) =>
    $hasFlights ? `${theme.colors.secondary}30` : `${theme.colors.textMuted}30`};
  color: ${({ $hasFlights, theme }) =>
    $hasFlights ? theme.colors.secondary : theme.colors.textMuted};
  font-weight: 500;
`;

export const StatsRow = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  flex-wrap: wrap;
`;

export const StatBadge = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  background: ${({ $color }) => `${$color}15`};
  border: 1px solid ${({ $color }) => `${$color}30`};
  border-radius: 4px;
  font-size: 11px;
  color: ${({ $color }) => $color};
`;

export const StatValue = styled.span`
  font-weight: 600;
`;

export const MapContainer = styled.div`
  flex: 1;
  min-height: 0;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  background: ${props => props.theme.colors.backgroundTertiary};

  .leaflet-container {
    height: 100%;
    width: 100%;
    background: ${props => props.theme.colors.backgroundTertiary};
  }

  .leaflet-tile-pane {
    filter: ${props =>
      props.theme.name === 'dark'
        ? 'brightness(0.6) contrast(1.1) saturate(0.8)'
        : 'brightness(1) contrast(1) saturate(1)'};
  }

  .leaflet-control-attribution {
    background: ${props => props.theme.colors.backgroundSecondary} !important;
    color: ${props => props.theme.colors.textMuted} !important;
    font-size: 9px !important;
    padding: 2px 6px !important;
    opacity: 0.8;
  }

  .leaflet-control-attribution a {
    color: ${props => props.theme.colors.textSecondary} !important;
  }

  .leaflet-control-zoom {
    border: none !important;
    box-shadow: none !important;
  }

  .leaflet-control-zoom a {
    background: ${props => props.theme.colors.backgroundSecondary} !important;
    color: ${props => props.theme.colors.text} !important;
    border: 1px solid ${props => props.theme.colors.border} !important;
    width: 28px !important;
    height: 28px !important;
    line-height: 26px !important;
    font-size: 14px !important;
  }

  .leaflet-control-zoom a:hover {
    background: ${props => props.theme.colors.backgroundTertiary} !important;
  }
`;

export const MapOverlay = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const MapControls = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MapControlButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: ${props => props.theme.colors.backgroundSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.backgroundTertiary};
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
`;

export const ResetButton = MapControlButton;

export const LegendItem = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: ${props => props.theme.colors.backgroundSecondary};
  border-radius: 4px;
  font-size: 10px;
  color: ${props => props.theme.colors.text};
  border: 1px solid ${props => props.theme.colors.border};
  opacity: 0.95;
`;

export const LegendPlane = styled.span<{ $color: string }>`
  display: inline-block;
  width: 12px;
  height: 12px;
  color: ${({ $color }) => $color};
  filter: drop-shadow(0 0 3px ${({ $color }) => $color});
`;

export const AirportMarker = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 500;
  pointer-events: none;
`;

export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
`;

export const RadarIcon = styled.div`
  position: relative;
  width: 60px;
  height: 60px;

  &::before {
    content: '📡';
    font-size: 40px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    width: 2px;
    height: 50%;
    background: linear-gradient(to bottom, transparent, #8b5cf6);
    transform-origin: bottom center;
    animation: ${radarSweep} 2s linear infinite;
  }
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
  max-width: 200px;
`;

export const RetryButton = styled.button`
  padding: 8px 16px;
  background: ${props => props.theme.colors.secondary}30;
  border: 1px solid ${props => props.theme.colors.secondary};
  border-radius: 6px;
  color: ${props => props.theme.colors.secondary};
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${props => props.theme.colors.secondary}40;
  }
`;

export const EmptyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  text-align: center;
`;

export const EmptyIcon = styled.div`
  font-size: 40px;
  opacity: 0.5;
`;

export const EmptyText = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

export const LastUpdated = styled.div`
  font-size: 10px;
  color: ${props => props.theme.colors.textMuted};
  text-align: right;
  flex-shrink: 0;
`;

export const TooltipContent = styled.div`
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-width: 140px;
`;

export const TooltipHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

export const TooltipCallsign = styled.span`
  font-weight: 700;
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', monospace;
`;

export const TooltipPhase = styled.span<{ $color: string }>`
  font-size: 9px;
  padding: 2px 6px;
  background: ${({ $color }) => `${$color}30`};
  color: ${({ $color }) => $color};
  border-radius: 3px;
  font-weight: 600;
`;

export const TooltipRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 3px;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const TooltipLabel = styled.span`
  color: ${props => props.theme.colors.textMuted};
`;

export const TooltipValue = styled.span`
  color: ${props => props.theme.colors.text};
  font-family: 'Monaco', 'Menlo', monospace;
`;

export const CreditIndicator = styled.div<{ $percentUsed: number }>`
  position: absolute;
  bottom: 16px;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: ${props => props.theme.colors.backgroundSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  font-size: 9px;
  opacity: 0.9;
  color: ${({ $percentUsed, theme }) =>
    $percentUsed > 90
      ? theme.colors.error
      : $percentUsed > 70
        ? theme.colors.warning
        : theme.colors.textMuted};
`;

export const CreditBar = styled.div<{ $percentUsed: number }>`
  width: 15px;
  height: 4px;
  background: ${props => props.theme.colors.backgroundTertiary};
  border-radius: 2px;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ $percentUsed }) => Math.min(100, $percentUsed)}%;
    background: ${({ $percentUsed, theme }) =>
      $percentUsed > 90
        ? theme.colors.error
        : $percentUsed > 70
          ? theme.colors.warning
          : theme.colors.success};
    border-radius: 2px;
    transition: width 0.3s ease;
  }
`;
