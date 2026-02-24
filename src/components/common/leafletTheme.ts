import { css } from 'styled-components';

/** Shared Leaflet control theming for zoom, attribution, and container background */
export const leafletControlTheme = css`
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

  .leaflet-popup-content-wrapper {
    background-color: ${props => props.theme.colors.backgroundSecondary} !important;
    color: ${props => props.theme.colors.text} !important;
    border: 1px solid ${props => props.theme.colors.border} !important;
    box-shadow: 0 3px 14px rgba(0, 0, 0, 0.4) !important;
    border-radius: 8px !important;
  }

  .leaflet-popup-tip {
    background-color: ${props => props.theme.colors.backgroundSecondary} !important;
  }

  .leaflet-popup-close-button {
    color: ${props => props.theme.colors.textMuted} !important;
  }

  .leaflet-popup-close-button:hover {
    color: ${props => props.theme.colors.text} !important;
  }
`;
