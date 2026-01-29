import styled, { keyframes } from 'styled-components';

export const pulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
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

export const EmptyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  text-align: center;
`;

export const EmptyIcon = styled.img`
  width: 40px;
  height: 40px;
  opacity: 0.6;
  object-fit: contain;
  /* Light-fill SVGs (#e3e3e3): brightness(0) in light mode, brightness(0) invert(1) in dark */
  filter: ${props => (props.theme.name === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)')};
`;

/** For emoji/text fallback when no img src (img cannot have children). */
export const EmptyIconFallback = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 24px;
  opacity: 0.6;
`;

export const EmptyText = styled.div<{ $variant?: 'success' | 'warning' }>`
  font-size: 14px;
  color: ${({ $variant, theme }) =>
    $variant === 'warning' ? theme.colors.warning : theme.colors.success};
  font-weight: 500;
`;

export const EmptySubtext = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textMuted};
`;
