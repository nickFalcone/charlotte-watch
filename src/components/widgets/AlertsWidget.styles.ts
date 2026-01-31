import styled, { css, keyframes } from 'styled-components';
import { getAlertSeverityConfig } from '../../types/alerts';

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

// Re-export shared widget state components
export {
  LoadingContainer,
  LoadingIcon,
  LoadingText,
  ErrorContainer,
  ErrorIcon,
  ErrorText,
  RetryButton,
  EmptyContainer as NoAlertsContainer,
  EmptyIcon as NoAlertsIcon,
  EmptyIconFallback as NoAlertsIconFallback,
  EmptyText as NoAlertsText,
  EmptySubtext as NoAlertsSubtext,
} from '../common/WidgetStates.styles';

// Re-export shared modal components with Alert-prefixed aliases
export {
  ModalOverlay as AlertModalOverlay,
  ModalContent as AlertModalContent,
  ModalHeader as AlertModalHeader,
  ModalTitle as AlertModalTitle,
  ModalTitleText as AlertModalTitleText,
  ModalClose as AlertModalClose,
  ModalCloseIcon as AlertModalCloseIcon,
  ModalBody as AlertModalBody,
  ModalSection as AlertModalSection,
  ModalLabel as AlertModalLabel,
  ModalText as AlertModalText,
} from '../common/DetailModal.styles';

// Alert-specific components below

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

export const AlertCount = styled.span<{ $hasAlerts: boolean; $allHidden?: boolean }>`
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

export const CategoryBadge = styled.span<{ $color: string }>`
  padding: 2px 6px;
  font-size: 10px;
  border-radius: 4px;
  background: ${({ $color }) => `${$color}20`};
  color: ${({ $color }) => $color};
  text-transform: capitalize;
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
  /* Dark: use >=7:1 colors; light: use theme */
  color: ${({ $success, theme }) =>
    theme.name === 'dark'
      ? $success
        ? '#4ade80' // green-400, >=7:1 on #2c2c2e
        : '#ffb0b0' // same as critical, 8.02:1 on #2c2c2e
      : $success
        ? theme.colors.success
        : theme.colors.error};

  &::before {
    content: '${({ $success }) => ($success ? '\u25CF' : '\u25CB')}';
    font-size: 8px;
  }
`;

// Source filter toggle group styles -- full-width row so sources wrap in their own area
export const SourceToggleGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
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

export const AISummaryTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
`;

export const AISummaryTitle = styled.h3`
  font-size: 16px;
  color: ${props => props.theme.colors.text};
  line-height: 1.2;
  margin: 0;
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

export const AISummaryGeneratedAt = styled.div`
  font-size: 10px;
  color: ${props => props.theme.colors.textMuted};
  margin-top: 8px;
  text-align: right;
`;

// Info popover components moved to src/components/common/InfoPopover.styles.ts
// (InfoIcon, InfoTrigger, PopoverContent) for reuse across widgets

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
