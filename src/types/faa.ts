// FAA Airport Status Types

export interface FAAGroundDelay {
  airportCode: string;
  reason: string;
  averageDelay: string;
  maximumDelay: string;
}

export interface FAADeparture {
  minimum: string;
  maximum: string;
  trend: string;
}

export interface FAAArrival {
  minimum: string;
  maximum: string;
  trend: string;
}

export interface FAAGeneralDelay {
  airportCode: string;
  reason: string;
  departure?: FAADeparture;
  arrival?: FAAArrival;
}

export interface FAAClosure {
  airportCode: string;
  start: string;
  reopens: string;
}

export interface FAAGroundStop {
  airportCode: string;
  reason: string;
  endTime: string;
}

export interface FAADelayType {
  name: string;
  ground_delay_list?: FAAGroundDelay[];
  delays?: FAAGeneralDelay[];
  closures?: FAAClosure[];
  ground_stop_list?: FAAGroundStop[];
}

export interface FAAStatusResponse {
  airport_status_information: {
    update_time: string;
    delay_types: FAADelayType[];
  };
}

// Airport configuration
export interface AirportConfig {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
}

// KCLT - Charlotte Douglas International Airport
export const KCLT_AIRPORT: AirportConfig = {
  code: 'CLT',
  name: 'Charlotte Douglas International',
  latitude: 35.214,
  longitude: -80.9431,
};
