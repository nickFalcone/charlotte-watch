/**
 * One-time script to fetch route geometry from NCDOT ArcGIS REST services.
 * Generates src/data/charlotteRouteGeometry.ts with mile-marker-indexed
 * coordinate arrays for Charlotte-area roads.
 *
 * Uses the NCDOT Mile Marker Hatching service which provides actual
 * mile marker positions (not segment-local measures).
 *
 * Usage: npx tsx scripts/fetch-route-geometry.ts
 *
 * Data source: NCDOT Mile Marker Hatching (Hatch 0.10)
 * https://gis11.services.ncdot.gov/arcgis/rest/services/NCDOT_MileMarker_Hatching/MapServer/13
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Hatch 0.10 layer - mile marker hatches at 0.10 mile intervals
const HATCH_LAYER_URL =
  'https://gis11.services.ncdot.gov/arcgis/rest/services/NCDOT_MileMarker_Hatching/MapServer/13/query';

// Charlotte metro bounding box (generous to capture full road extents)
const CHARLOTTE_BBOX = {
  xmin: -81.15,
  ymin: 34.95,
  xmax: -80.45,
  ymax: 35.55,
};

// RteId format: {class}{direction:4}{route:3}{county:3}
// Direction '0000' = primary direction, '0400' = alternate direction

// Route definitions matching CHARLOTTE_ROADS in src/types/ncdot.ts
interface RouteQuery {
  routeId: string;
  rteClass: string; // '1'=Interstate, '2'=US, '3'=NC
  routeNum: string; // 3-digit padded route number
}

const ROUTE_QUERIES: RouteQuery[] = [
  { routeId: 'I-77', rteClass: '1', routeNum: '077' },
  { routeId: 'I-85', rteClass: '1', routeNum: '085' },
  { routeId: 'I-485', rteClass: '1', routeNum: '485' },
  { routeId: 'I-277', rteClass: '1', routeNum: '277' },
  { routeId: 'US 74', rteClass: '2', routeNum: '074' },
  { routeId: 'US 21', rteClass: '2', routeNum: '021' },
  { routeId: 'NC 16', rteClass: '3', routeNum: '016' },
  { routeId: 'NC 24', rteClass: '3', routeNum: '024' },
  { routeId: 'NC 49', rteClass: '3', routeNum: '049' },
  { routeId: 'NC 51', rteClass: '3', routeNum: '051' },
];

interface RawPoint {
  mile: number;
  lat: number;
  lng: number;
}

interface RouteGeometry {
  routeId: string;
  points: RawPoint[];
  minMile: number;
  maxMile: number;
}

/**
 * Query NCDOT Hatch layer with pagination for a specific direction code.
 */
async function queryHatchesForDirection(
  rteClass: string,
  routeNum: string,
  directionCode: string
): Promise<unknown[]> {
  const allFeatures: unknown[] = [];
  let offset = 0;
  const pageSize = 2000;
  const where = `RteClass='${rteClass}' AND RteId LIKE '${rteClass}${directionCode}${routeNum}%'`;

  while (true) {
    const params = new URLSearchParams({
      where,
      geometry: `${CHARLOTTE_BBOX.xmin},${CHARLOTTE_BBOX.ymin},${CHARLOTTE_BBOX.xmax},${CHARLOTTE_BBOX.ymax}`,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'RteClass,RteId,Milepost',
      returnGeometry: 'true',
      outSR: '4326',
      resultOffset: String(offset),
      resultRecordCount: String(pageSize),
      f: 'json',
    });

    const url = `${HATCH_LAYER_URL}?${params.toString()}`;
    console.error(`  Fetching dir=${directionCode} offset=${offset}...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      features?: unknown[];
      exceededTransferLimit?: boolean;
      error?: { message: string };
    };

    if (data.error) {
      throw new Error(`ArcGIS error: ${data.error.message}`);
    }

    const features = data.features || [];
    allFeatures.push(...features);

    if (!data.exceededTransferLimit || features.length === 0) {
      break;
    }
    offset += features.length;
  }

  return allFeatures;
}

/**
 * Get the midpoint of a hatch mark polyline geometry.
 */
function getHatchMidpoint(feature: unknown): { lat: number; lng: number; mile: number } | null {
  const f = feature as {
    geometry?: { paths?: number[][][] };
    attributes?: { Milepost?: string };
  };

  if (!f.geometry?.paths || !f.attributes?.Milepost) return null;

  const milepost = parseFloat(f.attributes.Milepost);
  if (!Number.isFinite(milepost) || milepost < 0) return null;

  const allCoords: number[][] = [];
  for (const path of f.geometry.paths) {
    for (const coord of path) {
      if (coord.length >= 2) {
        allCoords.push(coord);
      }
    }
  }

  if (allCoords.length === 0) return null;

  const first = allCoords[0];
  const last = allCoords[allCoords.length - 1];
  const lat = (first[1] + last[1]) / 2;
  const lng = (first[0] + last[0]) / 2;

  if (
    lat < CHARLOTTE_BBOX.ymin ||
    lat > CHARLOTTE_BBOX.ymax ||
    lng < CHARLOTTE_BBOX.xmin ||
    lng > CHARLOTTE_BBOX.xmax
  ) {
    return null;
  }

  return {
    lat: Math.round(lat * 1000000) / 1000000,
    lng: Math.round(lng * 1000000) / 1000000,
    mile: milepost,
  };
}

/**
 * Resample points to targetInterval mile spacing via linear interpolation.
 */
function resample(points: RawPoint[], targetInterval: number): RawPoint[] {
  if (points.length < 2) return points;

  const result: RawPoint[] = [points[0]];
  const minMile = points[0].mile;
  const maxMile = points[points.length - 1].mile;

  let currentMile = Math.ceil(minMile / targetInterval) * targetInterval;
  if (currentMile <= minMile) currentMile += targetInterval;
  let segIdx = 0;

  while (currentMile < maxMile) {
    while (segIdx < points.length - 1 && points[segIdx + 1].mile < currentMile) {
      segIdx++;
    }
    if (segIdx >= points.length - 1) break;

    const p1 = points[segIdx];
    const p2 = points[segIdx + 1];
    const segLength = p2.mile - p1.mile;
    if (segLength <= 0) {
      currentMile += targetInterval;
      continue;
    }

    const t = (currentMile - p1.mile) / segLength;
    result.push({
      mile: Math.round(currentMile * 1000) / 1000,
      lat: Math.round((p1.lat + t * (p2.lat - p1.lat)) * 1000000) / 1000000,
      lng: Math.round((p1.lng + t * (p2.lng - p1.lng)) * 1000000) / 1000000,
    });

    currentMile += targetInterval;
  }

  const lastPoint = points[points.length - 1];
  if (result.length === 0 || Math.abs(result[result.length - 1].mile - lastPoint.mile) > 0.01) {
    result.push(lastPoint);
  }

  return result;
}

/**
 * Process one route: query hatches, extract midpoints, sort, resample.
 */
async function processRoute(query: RouteQuery): Promise<RouteGeometry | null> {
  console.error(`\nProcessing ${query.routeId}...`);

  // Try direction codes in order: 0000, 0400, 0800 (loop roads like I-485)
  const directionCodes = ['0000', '0400', '0800'];
  let features: unknown[] = [];

  for (const dir of directionCodes) {
    features = await queryHatchesForDirection(query.rteClass, query.routeNum, dir);
    if (features.length > 0) break;
    console.error(`  No features for dir=${dir}, trying next...`);
  }

  if (features.length === 0) {
    console.error(`  WARNING: No data found for ${query.routeId}`);
    return null;
  }

  console.error(`  Got ${features.length} hatch features`);

  // Extract midpoints
  const points: RawPoint[] = [];
  for (const feature of features) {
    const point = getHatchMidpoint(feature);
    if (point) points.push(point);
  }

  console.error(`  Extracted ${points.length} valid points`);
  if (points.length < 2) {
    console.error(`  WARNING: Insufficient points for ${query.routeId}`);
    return null;
  }

  // Sort by mile marker
  points.sort((a, b) => a.mile - b.mile);

  // Deduplicate (skip points < 0.05 miles apart)
  const deduped: RawPoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (Math.abs(points[i].mile - deduped[deduped.length - 1].mile) >= 0.05) {
      deduped.push(points[i]);
    }
  }

  console.error(
    `  After dedup: ${deduped.length} points, mile ${deduped[0].mile}-${deduped[deduped.length - 1].mile}`
  );

  // Resample to 0.25 mile intervals
  const resampled = resample(deduped, 0.25);
  console.error(`  After resample (0.25mi): ${resampled.length} points`);

  return {
    routeId: query.routeId,
    points: resampled,
    minMile: resampled[0].mile,
    maxMile: resampled[resampled.length - 1].mile,
  };
}

/**
 * Generate TypeScript source file content.
 */
function generateTypeScript(routes: RouteGeometry[]): string {
  const lines: string[] = [];

  lines.push(
    '// Auto-generated by scripts/fetch-route-geometry.ts',
    `// Generated: ${new Date().toISOString()}`,
    '// Source: NCDOT Mile Marker Hatching Service (Hatch 0.10)',
    '// https://gis11.services.ncdot.gov/arcgis/rest/services/NCDOT_MileMarker_Hatching/MapServer/13',
    '',
    'export interface RoutePoint {',
    '  /** Mile marker value */',
    '  mile: number;',
    '  lat: number;',
    '  lng: number;',
    '}',
    '',
    'export interface RouteGeometry {',
    '  /** Normalized display name matching getCharlotteRoadDisplay() output */',
    '  routeId: string;',
    '  /** Points sorted ascending by mile marker */',
    '  points: RoutePoint[];',
    '  minMile: number;',
    '  maxMile: number;',
    '}',
    '',
    'export const CHARLOTTE_ROUTE_GEOMETRY: RouteGeometry[] = ['
  );

  for (const route of routes) {
    lines.push('  {');
    lines.push(`    routeId: '${route.routeId}',`);
    lines.push(`    minMile: ${route.minMile},`);
    lines.push(`    maxMile: ${route.maxMile},`);
    lines.push('    points: [');
    for (const p of route.points) {
      lines.push(`      { mile: ${p.mile}, lat: ${p.lat}, lng: ${p.lng} },`);
    }
    lines.push('    ],');
    lines.push('  },');
  }

  lines.push('];');
  lines.push('');

  return lines.join('\n');
}

async function main() {
  console.error('Fetching Charlotte route geometry from NCDOT Mile Marker Hatching...\n');

  const routes: RouteGeometry[] = [];
  for (const query of ROUTE_QUERIES) {
    const route = await processRoute(query);
    if (route) routes.push(route);
  }

  console.error(`\n--- Summary ---`);
  let totalPoints = 0;
  for (const route of routes) {
    console.error(
      `${route.routeId}: ${route.points.length} points (mile ${route.minMile}-${route.maxMile})`
    );
    totalPoints += route.points.length;
  }
  console.error(`Total: ${totalPoints} points across ${routes.length} routes`);

  const tsContent = generateTypeScript(routes);
  const outPath = join(__dirname, '..', 'src', 'data', 'charlotteRouteGeometry.ts');
  writeFileSync(outPath, tsContent, 'utf-8');
  console.error(`\nWrote ${outPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
