import styled from 'styled-components';
import { AnimatedPopoverContent } from '../common';

// Semi-transparent overlay above the dialog (z-index 1000) but below the popover
// (z-index 3000), blocking clicks and signalling that the tour requires attention.
export const TourOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2999;
  background: ${props => props.theme.overlay};
  opacity: 0.9;
`;

// Fixed-width popover so both steps render at the same size
export const TourContent = styled(AnimatedPopoverContent)`
  width: 320px;
  max-width: 90vw;
  padding: 16px;
`;

export const TourTitle = styled.h3`
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

export const TourBody = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${props => props.theme.colors.textMuted};
`;

// Mini replica of a widget header — decorative only, no interactivity
export const TourWidgetPreview = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  margin: 10px 0;
  background: ${props => props.theme.colors.backgroundTertiary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  pointer-events: none;
  user-select: none;
`;

// Sized-down icon for use inside the decorative widget preview
export const TourPreviewIcon = styled.img`
  width: 18px;
  height: 18px;
  object-fit: contain;
  filter: ${props => props.theme.iconFilter};
  opacity: 0.7;
`;

// Fake widget title text inside the preview
export const TourPreviewLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const TourHintList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const TourHintItem = styled.li`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 1.4;
  color: ${props => props.theme.colors.textMuted};
`;

export const TourHintIcon = styled.img`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  object-fit: contain;
  filter: ${props => props.theme.iconFilter};
  opacity: 0.65;
`;

// CSS-drawn bottom-right corner to represent the resize handle (no resize SVG in assets)
export const TourResizeCorner = styled.div`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border-right: 2px solid ${props => props.theme.colors.textMuted};
  border-bottom: 2px solid ${props => props.theme.colors.textMuted};
  border-radius: 0 0 2px 0;
  opacity: 0.65;
`;

export const TourFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
`;

export const TourDots = styled.div`
  display: flex;
  gap: 5px;
  align-items: center;
`;

export const TourDot = styled.div<{ $active: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${props => (props.$active ? props.theme.colors.primary : props.theme.colors.border)};
  transition: background 0.2s ease;
`;

export const TourButton = styled.button`
  padding: 5px 14px;
  /* #004c99 gives 7.54:1 against #ffffff (WCAG AAA) in both light and dark themes */
  background: #004c99;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: ${props => props.theme.transitions.fast};

  &:hover {
    /* #003880 gives 10.07:1 against #ffffff */
    background: #003880;
  }

  &:focus-visible {
    outline: 2px solid #004c99;
    outline-offset: 2px;
  }
`;
