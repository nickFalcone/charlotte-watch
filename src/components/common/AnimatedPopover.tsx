import styled, { keyframes } from 'styled-components';
import * as Popover from '@radix-ui/react-popover';

/**
 * Shared animated Popover components for consistent popover UX across the app.
 * Uses Radix UI Popover with CSS animations for smooth enter/exit transitions.
 */

// Keyframe animations
const slideUpAndFade = keyframes`
  from {
    opacity: 0;
    transform: translateY(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideDownAndFade = keyframes`
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideRightAndFade = keyframes`
  from {
    opacity: 0;
    transform: translateX(-2px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const slideLeftAndFade = keyframes`
  from {
    opacity: 0;
    transform: translateX(2px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

export const AnimatedPopoverContent = styled(Popover.Content)`
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

  &[data-state='open'] {
    &[data-side='top'] {
      animation: ${slideDownAndFade} 200ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    &[data-side='bottom'] {
      animation: ${slideUpAndFade} 200ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    &[data-side='left'] {
      animation: ${slideRightAndFade} 200ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    &[data-side='right'] {
      animation: ${slideLeftAndFade} 200ms cubic-bezier(0.16, 1, 0.3, 1);
    }
  }

  &[data-state='closed'] {
    animation: ${fadeOut} 150ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const PopoverArrow = styled(Popover.Arrow)`
  fill: ${props => props.theme.colors.backgroundSecondary};
`;
