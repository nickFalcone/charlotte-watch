const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY as string | undefined;

let warnedMissingKey = false;

/**
 * Get the CARTO tile URL for the current theme.
 * CARTO requires an API key on every basemap tile request; without one the tiles
 * are served with an "API KEY REQUIRED" watermark.
 */
export function getMapTileUrl(
  themeName: string,
  apiKey: string | undefined = CARTO_API_KEY
): string {
  const style = themeName === 'dark' ? 'dark_all' : 'light_all';
  const base = `https://{s}.basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}{r}.png`;

  if (!apiKey) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        'VITE_CARTO_API_KEY is not set; CARTO map tiles will show an "API KEY REQUIRED" watermark. See docs/MAP_TILES.md.'
      );
    }
    return base;
  }

  return `${base}?key=${encodeURIComponent(apiKey)}`;
}
