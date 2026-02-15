import styled from 'styled-components';
import { leafletControlTheme } from '../common';

// Re-export shared widget state components (used by AlertsWidget.tsx)
export {
  LoadingContainer,
  LoadingIcon,
  LoadingText,
  ErrorContainer,
  ErrorText,
  RetryButton,
} from '../common/WidgetStates.styles';

// Re-export shared card components (used by AlertDetailModal.tsx)
export {
  CardSourceIcon as AlertSourceIcon,
  CardBadge as AlertSeverityBadge,
} from '../common/CardList.styles';

// Re-export shared modal components (used by AlertDetailModal.tsx)
export {
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

// Alert detail modal specific components

export const SegmentCard = styled.div`
  padding: 10px 12px;
  background: ${props => props.theme.colors.backgroundSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  margin-top: 6px;

  &:first-of-type {
    margin-top: 0;
  }
`;

export const SegmentHeader = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin-bottom: 4px;
`;

export const SegmentDetail = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.4;
`;

export const AlertMapContainer = styled.div`
  width: 100%;
  height: 250px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid ${props => props.theme.colors.border};
  ${leafletControlTheme}
`;
