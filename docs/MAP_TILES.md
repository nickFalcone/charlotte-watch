# Map Tile Configuration

## Current Setup

The flight tracker uses **CARTO basemap tiles** with theme-aware selection:

- **Dark Mode**: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
- **Light Mode**: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`

The tile URL automatically switches based on the current theme (`useTheme()` hook).

### Retry Logic

The `RetryTileLayer` component (`src/components/widgets/RetryTileLayer.tsx`) handles failed tile loads:

- **Max retries**: 3 attempts per tile
- **Backoff**: Exponential delay (1s, 2s, 3s)
- **Cache busting**: Adds `_retry=N` param to bypass cached failures

This handles intermittent network issues and rate limiting.

---

## Known Issues

### Missing Tiles (Half Map Black)

**Symptom**: Some map tiles fail to load, leaving black areas with aircraft markers visible but no basemap.

**Causes**:
1. **CARTO rate limiting** - Free tier has undocumented limits
2. **Network interruption** - Temporary connectivity issues
3. **CDN edge issues** - Regional CARTO CDN problems

**Current mitigation**: Automatic retry with exponential backoff.

---

## Alternative Tile Providers

If CARTO continues to be unreliable, consider these alternatives:

### 1. Stadia Maps (Recommended)

**Pros**: Reliable, free tier (200k tiles/month), good dark theme
**Cons**: Requires API key

```tsx
// Sign up at https://stadiamaps.com/ for free API key
url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=YOUR_KEY"
```

### 2. MapTiler

**Pros**: Generous free tier, multiple styles
**Cons**: Requires API key

```tsx
// Sign up at https://www.maptiler.com/ for free API key
url="https://api.maptiler.com/maps/darkmatter/{z}/{x}/{y}.png?key=YOUR_KEY"
```

### 3. Mapbox

**Pros**: Very reliable, extensive customization
**Cons**: Requires API key, can get expensive at scale

```tsx
// Sign up at https://mapbox.com/ for API key
url="https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=YOUR_TOKEN"
```

### 4. OpenStreetMap (Fallback)

**Pros**: Free, no API key, very reliable
**Cons**: Light theme only (no dark mode), not as pretty

```tsx
url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
```

### 5. Self-Hosted Tiles

**Pros**: Full control, no rate limits
**Cons**: Complex setup, storage costs, maintenance

Tools: [OpenMapTiles](https://openmaptiles.org/), [TileServer GL](https://tileserver.readthedocs.io/)

---

## Switching Tile Providers

To change providers, update `FlightTrackerWidget.tsx`:

```tsx
// Example: Static tile URL
const mapTileUrl = 'https://new-provider-url/{z}/{x}/{y}.png';

// Example: Theme-aware tile URLs (current implementation)
const mapTileUrl =
  theme.name === 'dark'
    ? 'https://provider.com/dark/{z}/{x}/{y}.png'
    : 'https://provider.com/light/{z}/{x}/{y}.png';

<RetryTileLayer
  attribution='&copy; <a href="https://provider.com/">Provider</a>'
  url={mapTileUrl}
  maxRetries={3}
  retryDelay={1000}
/>
```

If using an API key, add it to environment variables:

```bash
# .env.local (dev)
VITE_MAP_API_KEY=your-key

# Netlify (prod)
# Add MAP_API_KEY in dashboard
```

Then reference in code:
```tsx
url={`https://tiles.example.com/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAP_API_KEY}`}
```

---

## Performance Tips

1. **Limit zoom levels** - Currently set to 8-12, which reduces tile requests
2. **Use retina tiles** - The `{r}` in URL serves @2x tiles on high-DPI displays
3. **Browser caching** - Tiles are cached by the browser; clear cache if seeing stale data
4. **Preload tiles** - Consider preloading tiles for the default view area (not currently implemented)

---

## Monitoring Tile Failures

Open browser DevTools → Network tab → Filter by "png" to see tile requests. Failed tiles show as red. The retry logic will attempt to reload them automatically.
