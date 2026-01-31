import styled, { keyframes } from 'styled-components';
import * as Dialog from '@radix-ui/react-dialog';

/**
 * Shared animated Dialog components for consistent modal UX across the app.
 * Uses Radix UI Dialog with CSS animations for smooth enter/exit transitions.
 */

// Keyframe animations
const overlayShow = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const overlayHide = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

const contentShow = keyframes`
  from {
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
`;

const contentHide = keyframes`
  from {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.96);
  }
`;

export const AnimatedDialogOverlay = styled(Dialog.Overlay)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 2000;

  &[data-state='open'] {
    animation: ${overlayShow} 150ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  &[data-state='closed'] {
    animation: ${overlayHide} 150ms cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

export const AnimatedDialogContent = styled(Dialog.Content)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  max-width: 600px;
  max-height: 85vh;
  background: ${props => props.theme.colors.widgetBackground};
  border-radius: 12px;
  border: 1px solid ${props => props.theme.colors.widgetBorder};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 2001;

  &[data-state='open'] {
    animation: ${contentShow} 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  &[data-state='closed'] {
    animation: ${contentHide} 150ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const DialogHeader = styled.div<{ $color?: string }>`
  display: flex;
  align-items: top;
  justify-content: space-between;
  padding: 16px 20px;
  background: ${({ $color }) => ($color ? `${$color}15` : 'transparent')};
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

export const DialogTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const DialogTitleText = styled(Dialog.Title)`
  margin: 0 12px 0 0;
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

export const DialogCloseIcon = styled.img`
  width: 18px;
  height: 18px;
  object-fit: contain;
  filter: ${props => (props.theme.name === 'dark' ? 'invert(1) brightness(0.9)' : 'none')};
`;

export const DialogCloseButton = styled(Dialog.Close)`
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

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const DialogBody = styled.div`
  padding: 20px;
  overflow-y: auto;
  flex: 1;
`;

export const DialogSection = styled.div`
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const DialogLabel = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

export const DialogText = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.text};
  line-height: 1.5;
  white-space: pre-wrap;
`;
