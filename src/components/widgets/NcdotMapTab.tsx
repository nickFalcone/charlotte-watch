import { CHARLOTTE_CENTER } from '../../utils/mapConstants';
import {
  NcdotMapContainer,
  NcdotMapFrame,
  NcdotMapFooter,
  NcdotMapLink,
} from './NcdotMapTab.styles';

const NCDOT_MAP_BASE_URL = 'https://www.drivenc.gov/Map/EmbeddedMap';
const NCDOT_MAP_LAYERS = ['Cameras', 'Incidents', 'Closures', 'Roadwork', 'RoadConditions'];

// DriveNC's own "Charlotte" region preset is zoom 9; a higher value zooms in (Google Maps scale).
const NCDOT_MAP_ZOOM = 11;
const [NCDOT_MAP_LAT, NCDOT_MAP_LNG] = CHARLOTTE_CENTER;

export const NCDOT_EMBED_URL = `${NCDOT_MAP_BASE_URL}?lat=${NCDOT_MAP_LAT}&lng=${NCDOT_MAP_LNG}&zoom=${NCDOT_MAP_ZOOM}&layers=${NCDOT_MAP_LAYERS.join(',')}&size=4`;
export const NCDOT_MAP_PAGE_URL = 'https://www.drivenc.gov/map';

/** NCDOT DriveNC embedded map (cameras, incidents, closures, roadwork) for the Charlotte region. */
export function NcdotMapTab() {
  return (
    <NcdotMapContainer>
      <NcdotMapFrame
        src={NCDOT_EMBED_URL}
        title="NCDOT DriveNC traffic map for the Charlotte region"
        loading="lazy"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <NcdotMapFooter>
        <NcdotMapLink href={NCDOT_MAP_PAGE_URL} target="_blank" rel="noopener noreferrer">
          Open DriveNC map in a new tab
        </NcdotMapLink>
      </NcdotMapFooter>
    </NcdotMapContainer>
  );
}
