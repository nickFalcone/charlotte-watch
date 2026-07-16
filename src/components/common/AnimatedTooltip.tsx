import styled from 'styled-components';
import * as Tooltip from '@radix-ui/react-tooltip';
import {
  slideUpAndFade,
  slideDownAndFade,
  slideRightAndFade,
  slideLeftAndFade,
  fadeOut,
} from './slideFade';

/**
 * Shared animated Tooltip components for consistent tooltip UX across the app.
 * Uses Radix UI Tooltip with CSS animations for smooth enter/exit transitions.
 */

export const AnimatedTooltipContent = styled(Tooltip.Content)`
  padding: 8px 12px;
  background: ${props => props.theme.colors.backgroundSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  box-shadow: ${props => props.theme.shadows.sm};
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
