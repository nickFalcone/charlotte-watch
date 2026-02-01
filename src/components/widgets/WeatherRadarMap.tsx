import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from 'styled-components';
import { MapContainer as LeafletMapContainer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { RetryTileLayer } from './RetryTileLayer';
import { MapRecenterButton } from '../common';
import {
  RadarMapContainer,
  RadarMapControls,
  RadarControls,
  RadarControlRow,
  RadarPlayButton,
  RadarTimeline,
  RadarTimeDisplay,
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

export function WeatherRadarMap() {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const theme = useTheme();
  const timeSteps = useMemo(() => generateTimeSteps(), []);
  const [currentIndex, setCurrentIndex] = useState(timeSteps.length - 1); // Start at most recent
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef<number>();

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

  const mapTileUrl =
    theme.name === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

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
      }, 350); // 350ms per frame - faster playback, steps still 10 min apart

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

  const handleTimelineChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(e.target.value, 10);
    setCurrentIndex(newIndex);
    setIsPlaying(false); // Pause when user scrubs
  }, []);

  return (
    <RadarMapContainer ref={containerRef}>
      <LeafletMapContainer
        center={RADAR_CENTER}
        zoom={RADAR_ZOOM}
        zoomControl={true}
        scrollWheelZoom={true}
        wheelPxPerZoomLevel={100}
        wheelDebounceTime={100}
        // minZoom={RADAR_ZOOM}
        maxZoom={10}
        dragging={true}
        doubleClickZoom={true}
        touchZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <MapController mapRef={mapRef} />
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
          <RadarPlayButton onClick={togglePlayPause} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? '⏸' : '▶'}
          </RadarPlayButton>
          <RadarTimeline
            type="range"
            min="0"
            max={timeSteps.length - 1}
            value={currentIndex}
            onChange={handleTimelineChange}
            title="Drag to view different times"
          />
          <RadarTimeDisplay>
            {formatTime(currentTime)}
            {isCurrentTime && ' (Now)'}
          </RadarTimeDisplay>
        </RadarControlRow>
      </RadarControls>
    </RadarMapContainer>
  );
}
