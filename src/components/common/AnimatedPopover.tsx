import styled from 'styled-components';
import * as Popover from '@radix-ui/react-popover';
import {
  slideUpAndFade,
  slideDownAndFade,
  slideRightAndFade,
  slideLeftAndFade,
  fadeOut,
} from './slideFade';

/**
 * Shared animated Popover components for consistent popover UX across the app.
 * Uses Radix UI Popover with CSS animations for smooth enter/exit transitions.
 */

export const AnimatedPopoverContent = styled(Popover.Content)`
  padding: 10px 12px;
  background: ${props => props.theme.colors.backgroundSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  box-shadow: ${props => props.theme.shadows.md};
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
