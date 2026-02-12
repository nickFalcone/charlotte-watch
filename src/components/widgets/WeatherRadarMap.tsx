import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from 'styled-components';
import * as Slider from '@radix-ui/react-slider';
import { MapContainer as LeafletMapContainer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { RetryTileLayer } from './RetryTileLayer';
import { MapRecenterButton } from '../common';
import { getMapTileUrl } from '../../utils/mapTileUrl';
import playIcon from '../../assets/icons/play.svg';
import pauseIcon from '../../assets/icons/pause.svg';
import {
  RadarMapContainer,
  RadarMapControls,
  RadarControls,
  RadarControlRow,
  RadarPlayButton,
  RadarPlayButtonIcon,
  RadarSliderRoot,
  RadarSliderTrack,
  RadarSliderRange,
  RadarSliderThumb,
  RadarTimeDisplay,
  VisuallyHidden,
} from './WeatherWidget.styles';
import 'leaflet/dist/leaflet.css';

const RADAR_CENTER: [number, number] = [35.2271, -80.8431]; // Charlotte, NC
const RADAR_ZOOM = 7;
const IEM_RADAR_WMS_URL = 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q-t.cgi';

// Generate timestamps for past 4 hours at 10-minute intervals
function generateTimeSteps(): Date[] {
  const steps: Date[] = [];
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

  // Round down to nearest 10 minutes
  const startTime = new Date(fourHoursAgo);
  startTime.setMinutes(Math.floor(startTime.getMinutes() / 10) * 10);
  startTime.setSeconds(0);
  startTime.setMilliseconds(0);

  // Generate steps every 10 minutes
  const STEP_MS = 10 * 60 * 1000;
  let current = new Date(startTime);
  while (current <= now) {
    steps.push(new Date(current));
    current = new Date(current.getTime() + STEP_MS);
  }

  return steps;
}

// Format timestamp for display
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Format timestamp for WMS TIME parameter (ISO 8601 format for IEM service)
function formatWMSTime(date: Date): string {
  return date.toISOString();
}

// Preload all radar frames before starting animation to prevent any flashing
function PreloadedRadarLayer({
  timeSteps,
  currentIndex,
}: {
  timeSteps: Date[];
  currentIndex: number;
}) {
  const map = useMap();
  const [preloadedUrls, setPreloadedUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const overlayRef = useRef<L.ImageOverlay | null>(null);

  // Preload all images when viewport changes (pan/zoom/resize)
  useEffect(() => {
    const regenerateImages = () => {
      setIsLoading(true);
      setPreloadedUrls([]);

      const bounds = map.getBounds();
      const size = map.getSize();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      // Build WMS GetMap URLs for all time steps
      const urls = timeSteps.map(time => {
        const params = new URLSearchParams({
          SERVICE: 'WMS',
          VERSION: '1.1.1',
          REQUEST: 'GetMap',
          LAYERS: 'nexrad-n0q-wmst',
          FORMAT: 'image/png',
          TRANSPARENT: 'true',
          SRS: 'EPSG:4326',
          BBOX: `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`,
          WIDTH: Math.round(size.x).toString(),
          HEIGHT: Math.round(size.y).toString(),
          TIME: formatWMSTime(time),
        });
        return `${IEM_RADAR_WMS_URL}?${params.toString()}`;
      });

      // If no URLs to load, mark as complete immediately
      if (urls.length === 0) {
        setPreloadedUrls([]);
        setIsLoading(false);
        return [];
      }

      // Preload all images
      let loadedCount = 0;
      const images: HTMLImageElement[] = [];

      urls.forEach(url => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          loadedCount++;
          if (loadedCount === urls.length) {
            setPreloadedUrls(urls);
            setIsLoading(false);
          }
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === urls.length) {
            setPreloadedUrls(urls);
            setIsLoading(false);
          }
        };
        img.src = url;
        images.push(img);
      });

      return images;
    };

    // Initial load
    const initialImages = regenerateImages();

    // Regenerate on pan/zoom (immediate)
    const handleMoveEnd = () => {
      regenerateImages();
    };

    // Debounce resize so we only regenerate once after widget resize settles (avoids loop)
    const RESIZE_DEBOUNCE_MS = 300;
    let resizeTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimeoutId) clearTimeout(resizeTimeoutId);
      resizeTimeoutId = setTimeout(() => {
        resizeTimeoutId = null;
        regenerateImages();
      }, RESIZE_DEBOUNCE_MS);
    };

    map.on('moveend', handleMoveEnd);
    map.on('resize', handleResize);

    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('resize', handleResize);
      if (resizeTimeoutId) clearTimeout(resizeTimeoutId);
      initialImages?.forEach(img => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [map, timeSteps]);

  // Update overlay when current index changes (instant, no loading)
  useEffect(() => {
    if (isLoading || preloadedUrls.length === 0) return;

    const bounds = map.getBounds();
    const url = preloadedUrls[currentIndex];

    if (!url) return;

    if (overlayRef.current) {
      overlayRef.current.setUrl(url);
      overlayRef.current.setBounds(bounds);
    } else {
      overlayRef.current = L.imageOverlay(url, bounds, {
        opacity: 0.28,
        interactive: false,
      }).addTo(map);

      // Add accessibility attributes to radar overlay image
      const overlayElement = overlayRef.current.getElement();
      if (overlayElement) {
        overlayElement.setAttribute(
          'alt',
          'NEXRAD weather radar showing precipitation patterns over Charlotte region'
        );
        overlayElement.setAttribute('role', 'img');
      }
    }

    return () => {
      if (overlayRef.current && map.hasLayer(overlayRef.current)) {
        map.removeLayer(overlayRef.current);
        overlayRef.current = null;
      }
    };
  }, [currentIndex, preloadedUrls, isLoading, map]);

  return null;
}

function MapController({ mapRef }: { mapRef: React.MutableRefObject<LeafletMap | null> }) {
  const map = useMap();
  mapRef.current = map;
  return null;
}

// Component to mark base map tiles as decorative for accessibility
// Base map tiles are decorative because geographic context is provided via aria-label
// and the informative content (radar overlay) has its own accessible description
function TileAccessibilityHandler() {
  const map = useMap();

  useEffect(() => {
    const mapContainer = map.getContainer();

    // Function to mark a tile as decorative
    const markTileAsDecorative = (tile: Element) => {
      if (!tile.hasAttribute('alt') || tile.getAttribute('alt') !== '') {
        tile.setAttribute('alt', '');
      }
      if (!tile.hasAttribute('role')) {
        tile.setAttribute('role', 'presentation');
      }
      if (!tile.hasAttribute('aria-hidden')) {
        tile.setAttribute('aria-hidden', 'true');
      }
    };

    // Process all existing tiles immediately
    const processExistingTiles = () => {
      const tileImages = mapContainer.querySelectorAll('.leaflet-tile-pane img');
      tileImages.forEach(markTileAsDecorative);
    };

    // Initial processing
    processExistingTiles();

    // Use MutationObserver to catch tiles added dynamically
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLImageElement && node.classList.contains('leaflet-tile')) {
            markTileAsDecorative(node);
          }
        });
      });
    });

    // Observe the tile pane for new tiles
    const tilePane = mapContainer.querySelector('.leaflet-tile-pane');
    if (tilePane) {
      observer.observe(tilePane, {
        childList: true,
        subtree: true,
      });
    }

    // Also listen for tile load events as a backup
    const handleTileLoad = (e: L.TileEvent) => {
      const tile = e.tile as HTMLImageElement;
      if (tile) {
        markTileAsDecorative(tile);
      }
    };

    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        layer.on('tileload', handleTileLoad);
      }
    });

    // Re-process tiles after map events that might load new tiles
    const reprocessTiles = () => {
      setTimeout(processExistingTiles, 100);
    };

    map.on('moveend', reprocessTiles);
    map.on('zoomend', reprocessTiles);

    return () => {
      observer.disconnect();
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
          layer.off('tileload', handleTileLoad);
        }
      });
      map.off('moveend', reprocessTiles);
      map.off('zoomend', reprocessTiles);
    };
  }, [map]);

  return null;
}

export function WeatherRadarMap() {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const theme = useTheme();
  const timeSteps = useMemo(() => generateTimeSteps(), []);
  const [currentIndex, setCurrentIndex] = useState(timeSteps.length - 1); // Start at most recent
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef<number>();
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  // When the widget is resized, tell Leaflet to recalculate size after resize settles (debounce to avoid loop)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const RESIZE_DEBOUNCE_MS = 250;
    const observer = new ResizeObserver(() => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        timeoutId = null;
        mapRef.current?.invalidateSize();
      }, RESIZE_DEBOUNCE_MS);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleRecenter = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
      mapRef.current.setView(RADAR_CENTER, RADAR_ZOOM, { animate: true });
    }
  }, []);

  const mapTileUrl = getMapTileUrl(theme.name);

  const currentTime = timeSteps[currentIndex] || new Date();
  const isCurrentTime = currentIndex === timeSteps.length - 1;

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = window.setInterval(() => {
        setCurrentIndex(prev => {
          // Loop back to start after reaching the end
          if (prev >= timeSteps.length - 1) {
            return 0;
          }
          return prev + 1;
        });
      }, 200); // 200ms per frame, 5 frames per second, frames are 10 min apart

      return () => {
        if (animationRef.current) {
          clearInterval(animationRef.current);
        }
      };
    }
  }, [isPlaying, timeSteps.length]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleSliderChange = useCallback((value: number[]) => {
    setCurrentIndex(value[0]);
    setIsPlaying(false); // Pause when user scrubs
  }, []);

  // Announce time changes to screen readers
  useEffect(() => {
    if (timeSteps[currentIndex]) {
      const timeStr = formatTime(timeSteps[currentIndex]);
      const isCurrent = currentIndex === timeSteps.length - 1;
      setLiveAnnouncement(`Radar at ${timeStr}${isCurrent ? ', current time' : ''}`);
    }
  }, [currentIndex, timeSteps]);

  return (
    <RadarMapContainer ref={containerRef}>
      <VisuallyHidden>
        Interactive weather radar map showing NEXRAD precipitation data for the Charlotte, North
        Carolina region over the past 4 hours. Use the play button to animate radar frames or the
        slider to view specific times. Map can be panned and zoomed. Geographic base map tiles are
        decorative, precipitation overlay shows weather patterns.
      </VisuallyHidden>
      <VisuallyHidden aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </VisuallyHidden>
      <LeafletMapContainer
        center={RADAR_CENTER}
        zoom={RADAR_ZOOM}
        zoomControl={true}
        scrollWheelZoom={false}
        maxZoom={10}
        dragging={true}
        doubleClickZoom={true}
        touchZoom={true}
        style={{ height: '100%', width: '100%' }}
        aria-label="NEXRAD weather radar map for Charlotte region, past 4 hours"
      >
        <MapController mapRef={mapRef} />
        <TileAccessibilityHandler />
        <RetryTileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={mapTileUrl}
          maxRetries={3}
          retryDelay={1000}
        />
        <PreloadedRadarLayer timeSteps={timeSteps} currentIndex={currentIndex} />
      </LeafletMapContainer>

      <RadarMapControls>
        <MapRecenterButton
          onClick={handleRecenter}
          title="Recenter on Charlotte"
          aria-label="Recenter on Charlotte"
        />
      </RadarMapControls>

      <RadarControls>
        <RadarControlRow>
          <RadarPlayButton
            onClick={togglePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <RadarPlayButtonIcon src={isPlaying ? pauseIcon : playIcon} alt="" aria-hidden />
          </RadarPlayButton>
          <Slider.Root
            value={[currentIndex]}
            onValueChange={handleSliderChange}
            min={0}
            max={Math.max(0, timeSteps.length - 1)}
            step={1}
            asChild
          >
            <RadarSliderRoot>
              <Slider.Track asChild>
                <RadarSliderTrack>
                  <Slider.Range asChild>
                    <RadarSliderRange />
                  </Slider.Range>
                </RadarSliderTrack>
              </Slider.Track>
              <Slider.Thumb asChild>
                <RadarSliderThumb aria-label="Select radar time frame" />
              </Slider.Thumb>
            </RadarSliderRoot>
          </Slider.Root>
          <RadarTimeDisplay>
            {formatTime(currentTime)}
            {isCurrentTime && ' (Now)'}
          </RadarTimeDisplay>
        </RadarControlRow>
      </RadarControls>
    </RadarMapContainer>
  );
}
