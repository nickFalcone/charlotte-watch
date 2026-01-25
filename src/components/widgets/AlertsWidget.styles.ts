import styled, { css, keyframes } from 'styled-components';
import { getAlertSeverityConfig } from '../../types/alerts';

const pulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
`;

export const AlertsContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
  overflow: hidden;
`;

export const AlertsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  flex-shrink: 0;
`;

export const AlertCount = styled.span<{ $hasAlerts: boolean }>`
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
  ${({ $hasAlerts, theme }) => {
    if ($hasAlerts) {
      const cfg = getAlertSeverityConfig(theme);
      return css`
        background: ${cfg.critical.bgColor};
        color: ${cfg.critical.color};
      `;
    }
    // No alerts: use success green
    return css`
      background: ${theme.colors.success}20;
      color: ${theme.colors.success};
    `;
  }}
`;

export const SourceFilters = styled.div`
  display: flex;
  gap: 6px;
`;

export const SourceFilter = styled.button<{ $active: boolean; $color?: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: ${({ $active, $color, theme }) =>
    $active ? ($color ? `${$color}20` : theme.colors.backgroundTertiary) : 'transparent'};
  border: 1px solid
    ${({ $active, $color, theme }) =>
      $active ? $color || theme.colors.textMuted : theme.colors.border};
  border-radius: 4px;
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.textMuted)};
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${props => props.theme.colors.backgroundSecondary};
    border-color: ${({ $color, theme }) => $color || theme.colors.textMuted};
  }
`;

export const AlertsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  flex: 1;
  padding-right: 4px;
  /* Make scrollable region keyboard accessible */
  &:focus {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: -2px;
  }
`;

export const AlertCard = styled.button<{ $severityColor: string; $severityBg: string }>`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 0;
  padding: 12px;
  font: inherit;
  text-align: left;
  border: none;
  border-left: 4px solid ${({ $severityColor }) => $severityColor};
  border-radius: 8px;
  background: ${props => props.theme.colors.backgroundSecondary};
  cursor: pointer;
  transition: all 0.15s ease;
  appearance: none;

  &:hover {
    background: ${props => props.theme.colors.backgroundTertiary};
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const AlertCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`;

export const AlertTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
`;

export const AlertSourceIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  color: ${props => props.theme.colors.text};
`;

export const AlertTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const AlertSeverityBadge = styled.span<{ $color: string; $bg: string }>`
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-radius: 4px;
  flex-shrink: 0;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`;

export const AlertSummary = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const AlertMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
`;

export const AlertMetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const CategoryBadge = styled.span<{ $color: string }>`
  padding: 2px 6px;
  font-size: 10px;
  border-radius: 4px;
  background: ${({ $color }) => `${$color}20`};
  color: ${({ $color }) => $color};
  text-transform: capitalize;
`;

export const NoAlertsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  text-align: center;
`;

export const NoAlertsIcon = styled.img`
  width: 40px;
  height: 40px;
  opacity: 0.6;
  filter: ${props => (props.theme.name === 'dark' ? 'invert(1) brightness(0.9)' : 'none')};
`;

/** For emoji/text fallback when no img src (img cannot have children). */
export const NoAlertsIconFallback = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 24px;
  opacity: 0.6;
`;

export const NoAlertsText = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.success};
  font-weight: 500;
`;

export const NoAlertsSubtext = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textMuted};
`;

export const SelectAllLink = styled.button`
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 12px;
  color: ${props => props.theme.colors.primary};
  text-decoration: underline;
  cursor: pointer;

  &:hover {
    color: ${props => props.theme.colors.primaryHover || props.theme.colors.primary};
    text-decoration: none;
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
`;

export const LoadingIcon = styled.img`
  width: 32px;
  height: 32px;
  filter: ${props => (props.theme.name === 'dark' ? 'invert(1) brightness(0.9)' : 'none')};
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
  filter: ${props => (props.theme.name === 'dark' ? 'invert(1) brightness(0.9)' : 'none')};
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

export const SourceStatus = styled.div`
  display: flex;
  gap: 8px;
  font-size: 10px;
  color: ${props => props.theme.colors.textMuted};
  flex-shrink: 0;
`;

export const SourceStatusItem = styled.span<{ $success: boolean }>`
  display: flex;
  align-items: center;
  gap: 3px;
  /* Dark: use ≥7:1 colors; light: use theme */
  color: ${({ $success, theme }) =>
    theme.name === 'dark'
      ? $success
        ? '#4ade80' // green-400, ≥7:1 on #2c2c2e
        : '#ffb0b0' // same as critical, 8.02:1 on #2c2c2e
      : $success
        ? theme.colors.success
        : theme.colors.error};

  &::before {
    content: '${({ $success }) => ($success ? '●' : '○')}';
    font-size: 8px;
  }
`;

// Source filter toggle group styles
export const SourceToggleGroup = styled.div`
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  flex-wrap: wrap;
`;

export const SourceToggleItem = styled.button<{
  $success: boolean;
  $visible: boolean;
}>`
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;

  /* Status color for the dot */
  --status-color: ${({ $success, theme }) =>
    theme.name === 'dark'
      ? $success
        ? '#4ade80'
        : '#ffb0b0'
      : $success
        ? theme.colors.success
        : theme.colors.error};

  /* Visible: solid background, full opacity */
  /* Hidden: transparent background, reduced opacity */
  background: ${({ $visible, theme }) =>
    $visible ? theme.colors.backgroundTertiary : 'transparent'};
  opacity: ${({ $visible }) => ($visible ? 1 : 0.5)};
  color: ${({ $visible, theme }) => ($visible ? theme.colors.text : theme.colors.textMuted)};

  &::before {
    content: '${({ $success }) => ($success ? '●' : '○')}';
    font-size: 8px;
    color: var(--status-color);
  }

  &:hover {
    background: ${props => props.theme.colors.backgroundTertiary};
    opacity: ${({ $visible }) => ($visible ? 1 : 0.7)};
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 1px;
  }
`;

// Tooltip styles
export const TooltipContent = styled.div`
  padding: 8px 10px;
  background: ${props => props.theme.colors.backgroundSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 11px;
  line-height: 1.4;
  color: ${props => props.theme.colors.text};
  max-width: 200px;
  z-index: 3000;
`;

export const TooltipRow = styled.div<{ $color?: string }>`
  color: ${({ $color, theme }) => $color || theme.colors.textSecondary};

  &:not(:last-child) {
    margin-bottom: 2px;
  }
`;

export const TooltipArrow = styled.div`
  fill: ${props => props.theme.colors.backgroundSecondary};
`;

export const AlertModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.7);
  z-index: 2000;
  overflow-y: auto;
`;

export const AlertModalContent = styled.div`
  max-width: 600px;
  max-height: 80vh;
  width: 100%;
  background: ${props => props.theme.colors.widgetBackground};
  border-radius: 12px;
  border: 1px solid ${props => props.theme.colors.widgetBorder};
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

export const AlertModalHeader = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: ${({ $color }) => `${$color}15`};
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

export const AlertModalTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const AlertModalTitleText = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

export const AlertModalCloseIcon = styled.img`
  width: 18px;
  height: 18px;
  object-fit: contain;
  filter: ${props => (props.theme.name === 'dark' ? 'invert(1) brightness(0.9)' : 'none')};
`;

export const AlertModalClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: ${props => props.theme.colors.textMuted};
  font-size: 18px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${props => props.theme.colors.backgroundTertiary};
    color: ${props => props.theme.colors.text};
  }
`;

export const AlertModalBody = styled.div`
  padding: 20px;
  overflow-y: auto;
  flex: 1;
`;

export const AlertModalSection = styled.div`
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const AlertModalLabel = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

export const AlertModalText = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.text};
  line-height: 1.5;
  white-space: pre-wrap;
`;

// AI Summary styles
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export const AISummaryContainer = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: ${props => props.theme.colors.backgroundTertiary};
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.borderLight};
  flex-shrink: 0;
`;

export const AISummaryRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  min-width: 0;
`;

export const AISummaryText = styled.div`
  font-size: 16px;
  color: ${props => props.theme.colors.text};
  line-height: 1.2;
  flex: 1;
  min-width: 0;
`;

export const AISummaryInfoIcon = styled.img`
  width: 14px;
  height: 14px;
  object-fit: contain;
  filter: ${props => (props.theme.name === 'dark' ? 'invert(1) brightness(0.9)' : 'none')};
`;

export const AISummaryInfoTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${props => props.theme.colors.textMuted};
  cursor: pointer;
  flex-shrink: 0;
  transition:
    color 0.15s ease,
    background 0.15s ease;

  &:hover {
    color: ${props => props.theme.colors.text};
    background: ${props => props.theme.colors.backgroundSecondary};
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const AISummaryPopoverContent = styled.div`
  padding: 10px 12px;
  background: ${props => props.theme.colors.backgroundSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 12px;
  line-height: 1.45;
  color: ${props => props.theme.colors.text};
  max-width: 260px;
  z-index: 3000;
`;

export const AISummarySkeleton = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const AISummarySkeletonLine = styled.div<{ $width?: string }>`
  height: 14px;
  width: ${({ $width }) => $width || '100%'};
  background: linear-gradient(
    90deg,
    ${props => props.theme.colors.backgroundTertiary} 25%,
    ${props => props.theme.colors.border} 50%,
    ${props => props.theme.colors.backgroundTertiary} 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  border-radius: 4px;
`;

export const AISummaryError = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textMuted};
  font-style: italic;
  flex: 1;
`;
