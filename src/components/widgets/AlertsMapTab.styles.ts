import styled from 'styled-components';
import { leafletControlTheme } from '../common';

export const AlertsFullMapContainer = styled.div`
  height: 100%;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  ${leafletControlTheme}
`;

export const NoGeoAlertsContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  color: ${props => props.theme.colors.textMuted};
  font-size: 14px;
`;

export const MapControlsOverlay = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
`;
