import styled from 'styled-components';

export const WidgetContainer = styled.div<{ $accentColor?: string }>`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${props => props.theme.colors.widgetBackground};
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.widgetBorder};
  overflow: hidden;
  box-shadow: 0 4px 6px -1px ${props => props.theme.colors.widgetShadow};
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 8px 15px -3px ${props => props.theme.colors.shadow};
  }

  ${({ $accentColor }) =>
    $accentColor &&
    `
    border-top: 3px solid ${$accentColor};
  `}
`;

export const WidgetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${props => props.theme.colors.backgroundTertiary};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  cursor: grab;
  transition: background-color 0.2s ease;

  &:active {
    cursor: grabbing;
  }
`;

export const WidgetTitleSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
`;

export const WidgetIcon = styled.span`
  font-size: 18px;
  flex-shrink: 0;
`;

export const WidgetTitle = styled.h2`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const WidgetControls = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

export const ControlButton = styled.button<{ $variant?: 'default' | 'danger' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: ${props => props.theme.colors.textMuted};
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s ease;

  &:hover {
    background: ${({ $variant, theme }) =>
      $variant === 'danger' ? `${theme.colors.error}30` : theme.colors.backgroundSecondary};
    color: ${({ $variant, theme }) =>
      $variant === 'danger' ? theme.colors.error : theme.colors.text};
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const WidgetContent = styled.div`
  flex: 1;
  padding: 16px;
  overflow: auto;
  color: ${props => props.theme.colors.text};
`;

export const DragHandle = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${props => props.theme.colors.textMuted};
  font-size: 12px;

  &::before {
    content: '⋮⋮';
    letter-spacing: -2px;
  }
`;
