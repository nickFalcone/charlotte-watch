import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
`;

export const StockContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
`;

export const TreemapContainer = styled.div`
  flex: 1;
  min-height: 200px;
  position: relative;
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
  width: 48px;
  height: 48px;
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

export const StockTooltip = styled.div`
  background: ${props => props.theme.colors.widgetBackground};
  border: 1px solid ${props => props.theme.colors.widgetBorder};
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 12px;
  color: ${props => props.theme.colors.text};
  box-shadow: 0 4px 12px ${props => props.theme.colors.shadow};
`;

export const TooltipSymbol = styled.div`
  font-weight: 700;
  font-size: 14px;
`;

export const TooltipName = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 11px;
  margin-bottom: 6px;
`;

export const TooltipPrice = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 2px;
`;

export const TooltipMarketCap = styled.div`
  color: ${props => props.theme.colors.textMuted};
  font-size: 11px;
  margin-top: 4px;
`;

export const TooltipChange = styled.div<{ $positive: boolean }>`
  color: ${({ $positive, theme }) => ($positive ? theme.colors.success : theme.colors.error)};
  font-weight: 600;
`;
