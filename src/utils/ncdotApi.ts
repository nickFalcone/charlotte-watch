import type { NCDOTIncident } from '../types/ncdot';
import { MECKLENBURG_COUNTY_ID, CHARLOTTE_ROADS } from '../types/ncdot';

const NCDOT_BASE_URL = 'https://eapps.ncdot.gov/services/traffic-prod/v1';

/**
 * Checks if a road name matches any Charlotte area major road
 */
export function isCharlotteRoad(roadName: string): boolean {
  const normalized = roadName.toUpperCase();
  return CHARLOTTE_ROADS.some(road =>
    road.patterns.some(pattern => normalized.includes(pattern.toUpperCase()))
  );
}

/**
 * Gets the display name for a matched Charlotte road
 */
export function getCharlotteRoadDisplay(roadName: string): string {
  const normalized = roadName.toUpperCase();
  for (const road of CHARLOTTE_ROADS) {
    if (road.patterns.some(pattern => normalized.includes(pattern.toUpperCase()))) {
      return road.display;
    }
  }
  return roadName;
}

/**
 * Filters incidents to only include those on Charlotte area major roads
 */
function filterCharlotteRoadIncidents(incidents: NCDOTIncident[]): NCDOTIncident[] {
  return incidents.filter(incident => isCharlotteRoad(incident.road));
}

/**
 * Filters out incidents with conditions we want to ignore
 */
function filterIgnoredConditions(incidents: NCDOTIncident[]): NCDOTIncident[] {
  return incidents.filter(
    incident => incident.condition.toLowerCase() !== 'shoulder closed' || incident.lanesClosed > 0
  );
}

/**
 * Deduplicates incidents by ID
 */
function dedupeIncidents(incidents: NCDOTIncident[]): NCDOTIncident[] {
  const seen = new Set<number>();
  return incidents.filter(incident => {
    if (seen.has(incident.id)) {
      return false;
    }
    seen.add(incident.id);
    return true;
  });
}

/**
 * Extracts mile marker from location string (e.g., "Mile Marker 22.6 to 22.4")
 */
function extractMileMarkers(location: string): { start: number; end: number } | null {
  const match = location.match(/Mile Marker (\d+\.?\d*) to (\d+\.?\d*)/i);
  if (match) {
    return { start: parseFloat(match[1]), end: parseFloat(match[2]) };
  }
  return null;
}

/**
 * Extract project number from reason string (e.g., "C204556")
 * Always returns with C prefix for consistency
 */
function extractProjectNumber(reason: string): string | null {
  // Match patterns like "C204556", "project C204556", "C-204556", etc.
  const match = reason.match(/\b([C]?-?\d{6})\b/i);
  if (!match) return null;

  const num = match[1].replace(/-/g, '').toUpperCase();
  // Always prefix with C if not already present
  return num.startsWith('C') ? num : `C${num}`;
}

/**
 * Normalize road name to base route (e.g., "I-485 A" -> "I-485")
 */
function normalizeRoadForConsolidation(road: string): string {
  const display = getCharlotteRoadDisplay(road);
  // Remove suffixes like " A", " I", " INNER", " OUTER"
  return display.replace(/\s+[A-Z]$/i, '').trim();
}

/**
 * Check if incident is maintenance or construction
 */
function isMaintenanceOrConstruction(incident: NCDOTIncident): boolean {
  const type = incident.incidentType.toLowerCase();
  const reason = incident.reason.toLowerCase();
  const condition = incident.condition.toLowerCase();

  return (
    type.includes('construction') ||
    type.includes('maintenance') ||
    reason.includes('construction') ||
    reason.includes('maintenance') ||
    condition.includes('construction') ||
    condition.includes('maintenance') ||
    incident.inWorkZone
  );
}

/**
 * Creates a grouping key for similar incidents
 * Incidents with the same key can potentially be consolidated
 */
function getConsolidationKey(incident: NCDOTIncident): string {
  const normalizedRoad = normalizeRoadForConsolidation(incident.road);
  const projectNumber = extractProjectNumber(incident.reason);

  // For construction projects with a project number, group by project
  // This consolidates different segments/directions of the same project
  if (projectNumber) {
    return [normalizedRoad, projectNumber].join('|');
  }

  // For recurring maintenance (no project number), group by location and type
  // This consolidates maintenance windows on different days at the same location
  if (isMaintenanceOrConstruction(incident)) {
    return [
      normalizedRoad,
      incident.direction,
      incident.location, // Include mile marker range
      incident.condition.toLowerCase().trim(),
    ].join('|');
  }

  // For crashes and other incidents, include date for strict grouping
  return [
    normalizedRoad,
    incident.direction,
    incident.reason.toLowerCase().trim(),
    incident.condition.toLowerCase().trim(),
    incident.start?.slice(0, 10) || '', // Same start date
  ].join('|');
}

/**
 * Consolidates similar incidents into single alerts
 * Groups by road, direction, reason, condition, and same-day timing
 */
function consolidateSimilarIncidents(incidents: NCDOTIncident[]): NCDOTIncident[] {
  const groups = new Map<string, NCDOTIncident[]>();

  // Group incidents by consolidation key
  for (const incident of incidents) {
    const key = getConsolidationKey(incident);
    console.log(`[NCDOT] Incident ${incident.id} key: ${key}`);
    const group = groups.get(key) || [];
    group.push(incident);
    groups.set(key, group);
  }

  // Merge each group into a single incident
  const consolidated: NCDOTIncident[] = [];

  console.log(`[NCDOT] Found ${groups.size} unique consolidation groups`);
  for (const [key, group] of groups.entries()) {
    if (group.length > 1) {
      console.log(
        `[NCDOT] Group "${key}" has ${group.length} incidents:`,
        group.map(i => i.id)
      );
    }
    if (group.length === 1) {
      consolidated.push(group[0]);
      continue;
    }

    // Sort by mile marker to get proper range
    const withMileMarkers = group
      .map(inc => ({ incident: inc, markers: extractMileMarkers(inc.location) }))
      .filter(item => item.markers !== null);

    // Use the most recently updated incident as the base
    const sortedByUpdate = [...group].sort(
      (a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()
    );
    const base = { ...sortedByUpdate[0] };

    // Calculate the full mile marker range if available
    if (withMileMarkers.length > 1) {
      const allMarkers = withMileMarkers.flatMap(item => [item.markers!.start, item.markers!.end]);
      const minMarker = Math.min(...allMarkers);
      const maxMarker = Math.max(...allMarkers);

      // Update location to show full span
      const locationPrefix = base.location.replace(/Mile Marker [\d.]+ to [\d.]+/i, '').trim();
      base.location = `${locationPrefix} Mile Marker ${maxMarker} to ${minMarker}`.trim();
    }

    // Use earliest start and latest end time
    const startTimes = group.map(inc => new Date(inc.start).getTime()).filter(t => !isNaN(t));
    const endTimes = group.map(inc => new Date(inc.end).getTime()).filter(t => !isNaN(t));
    if (startTimes.length > 0) {
      base.start = new Date(Math.min(...startTimes)).toISOString();
    }
    if (endTimes.length > 0) {
      base.end = new Date(Math.max(...endTimes)).toISOString();
    }

    // Sum up lane closures (take max lanes total)
    base.lanesClosed = Math.max(...group.map(inc => inc.lanesClosed));
    base.lanesTotal = Math.max(...group.map(inc => inc.lanesTotal));

    // Track consolidated incident info
    base.consolidatedIds = group.map(inc => inc.id);
    base.consolidatedCount = group.length;

    consolidated.push(base);
  }

  return consolidated;
}

/**
 * Fetches NC DOT traffic incidents for Mecklenburg County
 * Filters to only include Charlotte area major roads
 */
export async function fetchNCDOTIncidents(signal?: AbortSignal): Promise<NCDOTIncident[]> {
  try {
    const url = `${NCDOT_BASE_URL}/counties/${MECKLENBURG_COUNTY_ID}/incidents?verbose=true&recent=true`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`NC DOT API returned ${response.status}: ${response.statusText}`);
    }

    const incidents: NCDOTIncident[] = await response.json();
    const charlotteIncidents = filterCharlotteRoadIncidents(incidents);
    const filteredIncidents = filterIgnoredConditions(charlotteIncidents);
    const dedupedIncidents = dedupeIncidents(filteredIncidents);
    const consolidatedIncidents = consolidateSimilarIncidents(dedupedIncidents);

    return consolidatedIncidents;
  } catch (error) {
    console.error('Failed to fetch NC DOT incidents:', error);
    throw error;
  }
}
