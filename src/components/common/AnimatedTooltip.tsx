import styled, { keyframes } from 'styled-components';
import * as Tooltip from '@radix-ui/react-tooltip';

/**
 * Shared animated Tooltip components for consistent tooltip UX across the app.
 * Uses Radix UI Tooltip with CSS animations for smooth enter/exit transitions.
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

export const AnimatedTooltipContent = styled(Tooltip.Content)`
  padding: 8px 12px;
  background: ${props => props.theme.colors.backgroundSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 12px;
  line-height: 1.4;
  color: ${props => props.theme.colors.text};
  max-width: 300px;
  z-index: 4000;

  &[data-state='delayed-open'] {
    &[data-side='top'] {
      animation: ${slideDownAndFade} 150ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    &[data-side='bottom'] {
      animation: ${slideUpAndFade} 150ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    &[data-side='left'] {
      animation: ${slideRightAndFade} 150ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    &[data-side='right'] {
      animation: ${slideLeftAndFade} 150ms cubic-bezier(0.16, 1, 0.3, 1);
    }
  }

  &[data-state='closed'] {
    animation: ${fadeOut} 100ms cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

export const TooltipArrow = styled(Tooltip.Arrow)`
  fill: ${props => props.theme.colors.backgroundSecondary};
`;
