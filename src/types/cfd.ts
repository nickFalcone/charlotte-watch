// Charlotte Fire Department (CFD) Twitter feed types
// Uses same structure as CATS Twitter (twitter241 RapidAPI)
// Enriched with parsed location and geocoded coordinates from API

export interface CFDTweet {
  id: string;
  text: string;
  createdAt: string;
  author?: { id: string };
  type?: string;
  /** Parsed address/intersection from tweet */
  location?: string;
  /** Geocoded coordinates (from HERE API) */
  latitude?: number;
  longitude?: number;
}

export interface CFDTwitterResponse {
  data: CFDTweet[];
}
