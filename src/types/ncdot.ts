// NC DOT TIMS API types
// Based on https://tims.ncdot.gov/tims/V2/webservices

export interface NCDOTIncident {
  id: number;
  latitude: number;
  longitude: number;
  commonName: string;
  reason: string;
  condition: string;
  incidentType: string;
  severity: number;
  direction: string;
  location: string;
  countyId: number;
  countyName: string;
  city: string;
  start: string; // ISO 8601 datetime
  end: string; // ISO 8601 datetime
  lastUpdate: string; // ISO 8601 datetime
  road: string;
  routeId: number;
  isDetour: boolean;
  detour: string;
  lanesClosed: number;
  lanesTotal: number;
  weightLimit: number;
  widthLimit: number;
  heightChange: {
    feet: number;
    inches: number;
  };
  bridgeInvolved: boolean;
  inWorkZone: boolean;
  fatality: boolean;
  hazardousMaterials: boolean;
  commercialVehicle: boolean;
  overturnedCommercialVehicle: boolean;
  creationDate: string;
  crossStreetPrefix: string;
  crossStreetNumber: number;
  crossStreetSuffix: string;
  crossStreetCommonName: string;
  eventId: number;
  event: string;
  constructionDateTime: string;
  constructionContactNumber: string;
  link: string;
  polyline: string;
  createdFromConcurrent: boolean;
  movableConstruction: string;
  workZoneSpeedLimit: number;
  icmProject: boolean;
  // Added for consolidated incidents
  consolidatedIds?: number[];
  consolidatedCount?: number;
}

// Mecklenburg County ID from NC DOT API
export const MECKLENBURG_COUNTY_ID = 60;

// Charlotte area major roads to track
export const CHARLOTTE_ROADS = [
  { patterns: ['I-77', 'I 77', 'INTERSTATE 77'], display: 'I-77' },
  { patterns: ['I-85', 'I 85', 'INTERSTATE 85'], display: 'I-85' },
  { patterns: ['I-485', 'I 485', 'INTERSTATE 485'], display: 'I-485' },
  { patterns: ['I-277', 'I 277', 'INTERSTATE 277'], display: 'I-277' },
  { patterns: ['US 74', 'US-74', 'INDEPENDENCE', 'WILKINSON'], display: 'US 74' },
  { patterns: ['US 21', 'US-21'], display: 'US 21' },
  { patterns: ['NC 16', 'NC-16'], display: 'NC 16' },
  { patterns: ['NC 24', 'NC-24', 'HARRIS'], display: 'NC 24' },
  { patterns: ['NC 49', 'NC-49'], display: 'NC 49' },
  { patterns: ['NC 51', 'NC-51', 'PINEVILLE'], display: 'NC 51' },
  { patterns: ['BILLY GRAHAM'], display: 'Billy Graham Pkwy' },
] as const;
