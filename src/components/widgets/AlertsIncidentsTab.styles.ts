import styled, { css, keyframes } from 'styled-components';
import { getAlertSeverityConfig, DARK_STATUS_SUCCESS, DARK_STATUS_ERROR } from '../../types/alerts';

// Re-export shared card list components with Alert-prefixed aliases
export {
  CardList as AlertsList,
  CardItem as AlertCard,
  CardItemHeader as AlertCardHeader,
  CardTitleRow as AlertTitleRow,
  CardSourceIcon as AlertSourceIcon,
  CardTitle as AlertTitle,
  CardBadge as AlertSeverityBadge,
  CardSummary as AlertSummary,
  CardMeta as AlertMeta,
  CardMetaItem as AlertMetaItem,
} from '../common/CardList.styles';

// Re-export shared empty state components
export {
  EmptyContainer as NoAlertsContainer,
  EmptyIcon as NoAlertsIcon,
  EmptyText as NoAlertsText,
  EmptySubtext as NoAlertsSubtext,
} from '../common/WidgetStates.styles';

// Incidents tab layout

export const AlertsContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
  overflow: hidden;
`;

export const AlertsHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  flex-shrink: 0;
`;

export const AlertsHeaderRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
`;

export const AlertCount = styled.span<{ $hasAlerts: boolean; $allHidden?: boolean }>`
  flex-shrink: 0;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
  white-space: nowrap;
  ${({ $hasAlerts, $allHidden, theme }) => {
    const cfg = getAlertSeverityConfig(theme);
    if ($allHidden) {
      return css`
        background: ${cfg.moderate.bgColor};
        color: ${cfg.moderate.color};
      `;
    }
    if ($hasAlerts) {
      return css`
        background: ${cfg.critical.bgColor};
        color: ${cfg.critical.color};
      `;
    }
    return css`
      background: ${theme.colors.success}20;
      color: ${theme.colors.success};
    `;
  }}
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

// Source filter toggle group styles

export const SourceToggleGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
  flex: 1;
`;

export const SourceToggleItem = styled.button<{
  $success: boolean;
  $visible: boolean;
}>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;

  /* Status color for the dot */
  --status-color: ${({ $success, theme }) =>
    theme.name === 'dark'
      ? $success
        ? DARK_STATUS_SUCCESS
        : DARK_STATUS_ERROR
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
    content: '${({ $success }) => ($success ? '\u25CF' : '\u25CB')}';
    font-size: 10px;
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
  font-size: 14px;
  color: ${props => props.theme.colors.text};
  line-height: 1.45;
  flex: 1;
  min-width: 0;
`;

export const AISummaryList = styled.ul`
  margin: 0;
  padding-left: 1.25em;
  list-style-type: disc;
`;

export const AISummaryListItem = styled.li`
  margin-bottom: 0.5em;
  line-height: 1.45;
  &::marker {
    color: ${props => props.theme.colors.text};
  }
  &:last-child {
    margin-bottom: 0;
  }
`;

export const AISummaryMetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
`;

export const AISummaryGeneratedAt = styled.div`
  font-size: 10px;
  color: ${props => props.theme.colors.textMuted};
`;

export const AISummarySkeleton = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 200px;
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
  font-size: 14px;
  color: ${props => props.theme.colors.textMuted};
  font-style: italic;
  flex: 1;
`;
