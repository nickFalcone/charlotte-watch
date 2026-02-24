import styled from 'styled-components';
import { leafletControlTheme } from '../common';

export const TransitMapContainer = styled.div`
  height: 100%;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  ${leafletControlTheme}
`;

export const MapControlsOverlay = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
`;

export const TransitAlertStrip = styled.div`
  border-top: 1px solid ${props => props.theme.colors.border};
  overflow-y: auto;
  max-height: 130px;
  flex-shrink: 0;
`;

export const TransitAlertItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 6px 12px;
  font-size: 12px;
  line-height: 1.4;
  border-bottom: 1px solid ${props => props.theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

export const TransitAlertText = styled.span`
  flex: 1;
  color: ${props => props.theme.colors.text};
`;

export const TransitAlertLink = styled.a`
  flex-shrink: 0;
  font-size: 11px;
  color: ${props => props.theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

export const TransitLoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  color: ${props => props.theme.colors.textMuted};
  font-size: 14px;
`;
