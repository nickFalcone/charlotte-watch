// CATS (Charlotte Area Transit System) GTFS-RT Alert types
// Based on GTFS-RT Alert format from transit.land API

export interface CATSAlertTranslation {
  text: string;
  language: string;
}

export interface CATSAlertText {
  translation: CATSAlertTranslation[];
}

export interface CATSInformedEntity {
  routeId?: string;
  stopId?: string;
}

export interface CATSActivePeriod {
  start?: number; // Unix timestamp
  end?: number; // Unix timestamp
}

export interface CATSAlert {
  activePeriod: CATSActivePeriod[];
  informedEntity: CATSInformedEntity[];
  cause: string; // e.g., "CONSTRUCTION", "OTHER_CAUSE"
  effect: string; // e.g., "DETOUR", "NO_SERVICE"
  headerText?: CATSAlertText;
  descriptionText?: CATSAlertText;
  ttsHeaderText?: CATSAlertText;
  ttsDescriptionText?: CATSAlertText;
  causeDetail?: CATSAlertText;
  effectDetail?: CATSAlertText;
}

export interface CATSEntity {
  id: string;
  alert: CATSAlert;
}

export interface CATSResponseHeader {
  gtfsRealtimeVersion: string;
  incrementality: string;
  timestamp: string;
}

export interface CATSAlertsResponse {
  header: CATSResponseHeader;
  entity: CATSEntity[];
}

// LYNX Light Rail route identifiers
// Based on CATS GTFS route IDs for light rail services
// Note: Currently no LYNX alerts are appearing in the live feed
export const LYNX_LIGHT_RAIL_ROUTES = [
  '501', // LYNX Blue Line
  '510', // LYNX Gold Line
  // Add any additional light rail route IDs as they become available
] as const;

export type LynxRouteId = (typeof LYNX_LIGHT_RAIL_ROUTES)[number];

// CATS Twitter (X) feed from RapidAPI twitter-api47 - used to augment GTFS alerts
export interface CATSTweet {
  id: string;
  text: string;
  createdAt: string;
  author?: { id: string };
  type?: string;
}

export interface CATSTwitterResponse {
  data: CATSTweet[];
}
