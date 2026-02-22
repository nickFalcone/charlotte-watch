import { useTheme } from 'styled-components';
import { getMapTileUrl } from '../../utils/mapTileUrl';
import { CARTO_ATTRIBUTION } from '../../utils/mapConstants';
import { RetryTileLayer } from './RetryTileLayer';

/**
 * Standard CARTO base tile layer for all Charlotte Monitor maps.
 * Handles theme-aware tile URL selection and CARTO attribution automatically.
 * Must be rendered inside a react-leaflet MapContainer.
 */
export function BaseMapTileLayer() {
  const theme = useTheme();
  return <RetryTileLayer url={getMapTileUrl(theme.name)} attribution={CARTO_ATTRIBUTION} />;
}
