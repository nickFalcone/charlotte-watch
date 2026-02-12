/** Get the CARTO tile URL for the current theme */
export function getMapTileUrl(themeName: string): string {
  return themeName === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
}
