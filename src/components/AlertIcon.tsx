import styled from 'styled-components';
import type { AlertSource, AlertCategory } from '../types/alerts';

// Import SVG icons as URLs (not React components)
import policeIconUrl from '../assets/icons/police.svg';
import trafficIconUrl from '../assets/icons/traffic.svg';
import constructionIconUrl from '../assets/icons/construction.svg';
import powerIconUrl from '../assets/icons/power.svg';
import hurricaneIconUrl from '../assets/icons/hurricane.svg';
import planeIconUrl from '../assets/icons/plane.svg';

/**
 * Theme-aware icon image that inverts colors in dark mode.
 * Works by applying CSS filters to the SVG.
 */
const IconImg = styled.img<{ size?: number }>`
  width: ${props => props.size || 20}px;
  height: ${props => props.size || 20}px;
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;

  /* Invert colors in dark mode to make black SVGs visible */
  filter: ${props => (props.theme.name === 'dark' ? 'invert(1) brightness(0.9)' : 'none')};
`;

/**
 * Maps alert sources to their corresponding SVG icon URLs.
 */
const SOURCE_ICON_MAP: Partial<Record<AlertSource, string>> = {
  cmpd: policeIconUrl,
  'here-flow': trafficIconUrl,
  traffic: trafficIconUrl,
  ncdot: constructionIconUrl,
  duke: powerIconUrl,
  nws: hurricaneIconUrl,
  faa: planeIconUrl,
  cats: planeIconUrl,
};

/**
 * Maps alert categories to their corresponding SVG icon URLs.
 */
const CATEGORY_ICON_MAP: Partial<Record<AlertCategory, string>> = {
  traffic: trafficIconUrl,
  power: powerIconUrl,
  weather: hurricaneIconUrl,
  aviation: planeIconUrl,
  transit: planeIconUrl,
};

interface AlertIconProps {
  source?: AlertSource;
  category?: AlertCategory;
  size?: number;
  className?: string;
}

/**
 * Theme-aware alert icon component.
 * Uses SVG icons only - no emoji fallbacks.
 * Automatically adapts to light/dark mode via CSS filters.
 *
 * Usage:
 *   <AlertIcon source="cmpd" size={24} />
 *   <AlertIcon category="weather" size={20} />
 */
export function AlertIcon({ source, category, size = 20, className }: AlertIconProps) {
  // Try to find icon by source first, then by category
  const iconUrl = source
    ? SOURCE_ICON_MAP[source]
    : category
      ? CATEGORY_ICON_MAP[category]
      : undefined;

  // Return null if no icon available
  if (!iconUrl) {
    return null;
  }

  return (
    <IconImg src={iconUrl} alt={source || category || 'alert'} size={size} className={className} />
  );
}
