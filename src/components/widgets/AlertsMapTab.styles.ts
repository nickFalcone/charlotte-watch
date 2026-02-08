import styled from 'styled-components';

export const AlertsFullMapContainer = styled.div`
  height: 100%;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  position: relative;

  .leaflet-container {
    height: 100%;
    width: 100%;
    background: ${props => props.theme.colors.backgroundSecondary};
  }

  .leaflet-control-zoom {
    border: 1px solid ${props => props.theme.colors.border} !important;
    border-radius: 4px !important;
  }

  .leaflet-control-zoom a {
    background-color: ${props => props.theme.colors.backgroundSecondary} !important;
    color: ${props => props.theme.colors.text} !important;
    border-bottom: 1px solid ${props => props.theme.colors.border} !important;
  }

  .leaflet-control-zoom a:hover {
    background-color: ${props => props.theme.colors.backgroundTertiary} !important;
  }

  .leaflet-control-attribution {
    background-color: ${props => props.theme.colors.backgroundSecondary} !important;
    color: ${props => props.theme.colors.textMuted} !important;
    font-size: 10px !important;
    opacity: 0.8;
  }

  .leaflet-control-attribution a {
    color: ${props => props.theme.colors.primary} !important;
  }
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
