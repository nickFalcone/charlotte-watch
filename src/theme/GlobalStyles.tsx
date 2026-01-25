import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  /* Scrollbar styling with theme support */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.backgroundSecondary};
  }

  ::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.border};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.colors.textMuted};
  }

  /* Firefox scrollbar styling */
  * {
    scrollbar-width: thin;
    scrollbar-color: ${props => props.theme.colors.border} ${props => props.theme.colors.backgroundSecondary};
  }

  /* Links - theme-aware colors (WCAG AA+ on #2c2c2e in dark, #ffffff in light) */
  a {
    color: ${props => props.theme.colors.link};
    text-decoration: underline;
  }
  a:visited {
    color: ${props => props.theme.colors.linkVisited};
  }
  a:hover {
    color: ${props => props.theme.colors.primaryHover};
  }
  a:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }

  /* Leaflet tooltip styles with theme support */
  .leaflet-tooltip {
    background: ${props => props.theme.colors.widgetBackground} !important;
    border: 1px solid ${props => props.theme.colors.widgetBorder} !important;
    border-radius: 6px !important;
    padding: 8px 10px !important;
    box-shadow: 0 4px 12px ${props => props.theme.colors.shadow} !important;
    color: ${props => props.theme.colors.text} !important;
  }

  .leaflet-tooltip::before {
    border-top-color: ${props => props.theme.colors.widgetBackground} !important;
  }

  .leaflet-tooltip-bottom::before {
    border-bottom-color: ${props => props.theme.colors.widgetBackground} !important;
  }

  .leaflet-tooltip-left::before {
    border-left-color: ${props => props.theme.colors.widgetBackground} !important;
  }

  .leaflet-tooltip-right::before {
    border-right-color: ${props => props.theme.colors.widgetBackground} !important;
  }

  /* Range ring tooltips - minimal styling */
  .range-tooltip {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }

  .range-tooltip::before {
    display: none !important;
  }

  /* Aircraft icon - remove default leaflet marker styling */
  .aircraft-icon {
    background: transparent !important;
    border: none !important;
  }

  .airport-icon {
    background: transparent !important;
    border: none !important;
  }

  .range-label {
    background: transparent !important;
    border: none !important;
  }
`;
