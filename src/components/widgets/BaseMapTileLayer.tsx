import { useTheme } from 'styled-components';
import { getMapTileUrl } from '../../utils/mapTileUrl';
import { CARTO_ATTRIBUTION } from '../../utils/mapConstants';
import { RetryTileLayer } from './RetryTileLayer';

interface BaseMapTileLayerProps {
  /** Additional attribution HTML shown after the CARTO credit (e.g. for overlaid data sources) */
  extraAttribution?: string;
}

/**
 * Standard CARTO base tile layer for all Charlotte Monitor maps.
 * Handles theme-aware tile URL selection and CARTO attribution automatically.
 * Must be rendered inside a react-leaflet MapContainer.
 */
export function BaseMapTileLayer({ extraAttribution }: BaseMapTileLayerProps = {}) {
  const theme = useTheme();
  const attribution = extraAttribution
    ? `${CARTO_ATTRIBUTION} | ${extraAttribution}`
    : CARTO_ATTRIBUTION;
  return <RetryTileLayer url={getMapTileUrl(theme.name)} attribution={attribution} />;
}
