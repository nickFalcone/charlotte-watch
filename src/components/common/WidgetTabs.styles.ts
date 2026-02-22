import styled from 'styled-components';
import * as Tabs from '@radix-ui/react-tabs';

export const TabsContainer = styled(Tabs.Root)`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

export const TabList = styled(Tabs.List)`
  display: flex;
  gap: 0;
  flex-shrink: 0;
  padding: 0;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.backgroundTertiary};
`;

export const TabTrigger = styled(Tabs.Trigger)`
  padding: 4px 12px;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  color: ${props => props.theme.colors.textMuted};
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 44px;

  &[data-state='active'] {
    color: ${props => props.theme.colors.text};
    border-bottom-color: ${props => props.theme.colors.primary};
  }

  &:hover {
    color: ${props => props.theme.colors.text};
    background: ${props => props.theme.colors.backgroundSecondary};
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: -2px;
  }
`;

export const TabContent = styled(Tabs.Content)`
  flex: 1;
  overflow: auto;
  padding: 16px 12px 0 0;

  &[data-state='inactive'] {
    display: none;
  }
`;

export const TabContentForceMount = styled.div<{ $active: boolean }>`
  flex: 1;
  overflow: auto;
  padding: 16px 12px 0 0;
  display: ${props => (props.$active ? 'flex' : 'none')};
  flex-direction: column;
`;
