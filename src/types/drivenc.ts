// DriveNC v2 event API types
// Based on https://drivenc.gov/help/endpoint/event

export interface DriveNCEvent {
  ID: number;
  SourceId?: string;
  Organization?: string;
  RoadwayName: string;
  DirectionOfTravel?: string;
  Description?: string;
  Reported?: number | null; // Unix seconds
  LastUpdated?: number | null; // Unix seconds
  StartDate?: number | null; // Unix seconds
  PlannedEndDate?: number | null; // Unix seconds
  LanesAffected?: string | null;
  Latitude: number;
  Longitude: number;
  LatitudeSecondary?: number | null;
  LongitudeSecondary?: number | null;
  EventType?: string; // roadwork | closures | accidentsAndIncidents
  EventSubType?: string | null;
  IsFullClosure?: boolean;
  Severity?: string | null;
  Comment?: string | null;
  EncodedPolyline?: string | null; // Google Encoded Polyline
  DetourInstructions?: string | string[] | null;
  County?: string | null;
  OriginalEventType?: string | null;
}

export const MECKLENBURG_COUNTY_NAME = 'Mecklenburg';
