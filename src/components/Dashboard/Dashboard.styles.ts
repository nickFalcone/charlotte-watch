import styled from 'styled-components';
import { Root as ToggleGroupRoot } from '@radix-ui/react-toggle-group';

export const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: ${props => props.theme.colors.background};
  padding: 20px;
  transition: background-color 0.3s ease;
`;

export const DashboardHeader = styled.header`
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  padding-left: 12px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

export const DashboardTitle = styled.h1`
  margin: 0;
  flex: 1 1 0;
  min-width: 140px;
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const CrownIcon = styled.img`
  width: 24px;
  height: 24px;
  object-fit: contain;
  /* Crown has light fill (#e3e3e3): same as ThemeToggle / EmptyStateIcon */
  filter: ${props => (props.theme.name === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)')};
`;

export const HeaderControls = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const HeaderButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: ${({ $variant, theme }) =>
    $variant === 'primary' ? theme.colors.primary : theme.colors.backgroundSecondary};
  border: 1px solid
    ${({ $variant, theme }) =>
      $variant === 'primary' ? theme.colors.primary : theme.colors.border};
  border-radius: 6px;
  color: ${props => props.theme.colors.text};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${({ $variant, theme }) =>
      $variant === 'primary' ? theme.colors.primaryHover : theme.colors.backgroundTertiary};
  }

  &:active {
    transform: scale(0.98);
  }
`;

export const GridContainer = styled.div`
  flex: 1;
  min-height: 0;

  .react-grid-layout {
    position: relative;
  }

  .react-grid-item {
    transition: all 200ms ease;
    transition-property: left, top;
  }

  .react-grid-item.cssTransforms {
    transition-property: transform;
  }

  .react-grid-item.resizing {
    z-index: 1;
    will-change: width, height;
  }

  .react-grid-item.react-draggable-dragging {
    transition: none;
    z-index: 3;
    will-change: transform;
  }

  .react-grid-item.dropping {
    visibility: hidden;
  }

  .react-grid-item.react-grid-placeholder {
    background: ${props => props.theme.colors.primary};
    opacity: 0.2;
    border-radius: 8px;
    transition-duration: 100ms;
    z-index: 2;
  }

  .react-grid-item > .react-resizable-handle {
    position: absolute;
    width: 20px;
    height: 20px;
    background-image: none;
  }

  .react-grid-item > .react-resizable-handle::after {
    content: '';
    position: absolute;
    right: 4px;
    bottom: 4px;
    width: 8px;
    height: 8px;
    border-right: 2px solid ${props => props.theme.colors.textMuted};
    border-bottom: 2px solid ${props => props.theme.colors.textMuted};
  }

  .react-grid-item > .react-resizable-handle.react-resizable-handle-se {
    bottom: 0;
    right: 0;
    cursor: se-resize;
  }

  .react-grid-item > .react-resizable-handle.react-resizable-handle-sw {
    bottom: 0;
    left: 0;
    cursor: sw-resize;
  }

  .react-grid-item > .react-resizable-handle.react-resizable-handle-ne {
    top: 0;
    right: 0;
    cursor: ne-resize;
  }

  .react-grid-item > .react-resizable-handle.react-resizable-handle-nw {
    top: 0;
    left: 0;
    cursor: nw-resize;
  }
`;

export const WidgetDrawer = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  right: ${({ $isOpen }) => ($isOpen ? '0' : '-320px')};
  width: 320px;
  height: 100vh;
  background: ${props => props.theme.colors.backgroundSecondary};
  border-left: 1px solid ${props => props.theme.colors.border};
  padding: 20px;
  transition:
    right 0.3s ease,
    background-color 0.3s ease;
  z-index: 1000;
  overflow-y: auto;
`;

export const DrawerOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transition:
    opacity 0.3s ease,
    visibility 0.3s ease;
  z-index: 999;
`;

export const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

export const DrawerTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

export const CloseButtonIcon = styled.img`
  width: 18px;
  height: 18px;
  object-fit: contain;
  filter: ${props => (props.theme.name === 'dark' ? 'invert(1) brightness(0.9)' : 'none')};
`;

export const ResetIcon = styled.img`
  width: 16px;
  height: 16px;
  object-fit: contain;
  filter: ${props => (props.theme.name === 'dark' ? 'invert(1) brightness(0.9)' : 'none')};
`;

export const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
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

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const WidgetToggleGroup = styled(ToggleGroupRoot)`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 0;
`;

export const WidgetListItem = styled.button<{ $isVisible: boolean; $color?: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 12px;
  background: ${({ $isVisible, theme }) =>
    $isVisible ? `${theme.colors.primary}20` : theme.colors.backgroundTertiary};
  border: 1px solid
    ${({ $isVisible, $color, theme }) =>
      $isVisible ? $color || theme.colors.primary : theme.colors.border};
  border-radius: 8px;
  color: ${props => props.theme.colors.text};
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${({ $isVisible, theme }) =>
      $isVisible ? `${theme.colors.primary}30` : theme.colors.backgroundSecondary};
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const WidgetListIcon = styled.img`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  object-fit: contain;
  /* Invert in dark mode so black SVGs stay visible */
  filter: ${props => (props.theme.name === 'dark' ? 'invert(1) brightness(0.9)' : 'none')};
`;

export const WidgetListInfo = styled.div`
  flex: 1;
`;

export const WidgetListName = styled.div`
  font-size: 14px;
  font-weight: 500;
`;

export const WidgetListStatus = styled.div<{ $isVisible: boolean }>`
  font-size: 12px;
  color: ${({ $isVisible, theme }) => ($isVisible ? theme.colors.success : theme.colors.textMuted)};
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: ${props => props.theme.colors.textMuted};
`;

export const EmptyStateIcon = styled.img`
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
  object-fit: contain;
  /* Same as ThemeToggle: SVGs with light fill need brightness(0) then invert in dark */
  filter: ${props => (props.theme.name === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)')};
`;

export const EmptyStateText = styled.p`
  margin: 0;
  font-size: 14px;
`;
