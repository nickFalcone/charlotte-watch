import type {
  FAAStatusResponse,
  FAAGroundDelay,
  FAAGeneralDelay,
  FAAClosure,
  FAAGroundStop,
} from '../types';
import type { GenericAlert } from '../types/alerts';
import { mapFAADelaySeverity } from '../types/alerts';

// Use proxy path in dev, Pages Function in production
const FAA_STATUS_URL = import.meta.env.DEV
  ? '/proxy/faa/api/airport-status-information'
  : '/api/faa-status';

export async function fetchFAAStatus(signal?: AbortSignal): Promise<FAAStatusResponse> {
  const response = await fetch(FAA_STATUS_URL, { signal });

  if (!response.ok) {
    throw new Error(`FAA Status API error: ${response.status}`);
  }

  // The API returns XML, we need to parse it
  const text = await response.text();
  return parseFAAStatusXML(text);
}

// Parse FAA XML response into structured data
function parseFAAStatusXML(xml: string): FAAStatusResponse {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  const updateTimeEl = doc.querySelector('Update_Time');
  const updateTime = updateTimeEl?.textContent || new Date().toISOString();

  const delayTypes: FAAStatusResponse['airport_status_information']['delay_types'] = [];

  // Parse Ground Delay Programs
  const groundDelays = doc.querySelectorAll('Ground_Delay_List Ground_Delay');
  if (groundDelays.length > 0) {
    const groundDelayList: FAAGroundDelay[] = [];
    groundDelays.forEach(gd => {
      groundDelayList.push({
        airportCode: gd.querySelector('ARPT')?.textContent || '',
        reason: gd.querySelector('Reason')?.textContent || '',
        averageDelay: gd.querySelector('Avg')?.textContent || '',
        maximumDelay: gd.querySelector('Max')?.textContent || '',
      });
    });
    delayTypes.push({ name: 'Ground Delay Programs', ground_delay_list: groundDelayList });
  }

  // Parse Ground Stops
  const groundStops = doc.querySelectorAll('Ground_Stop_List Program');
  if (groundStops.length > 0) {
    const groundStopList: FAAGroundStop[] = [];
    groundStops.forEach(gs => {
      groundStopList.push({
        airportCode: gs.querySelector('ARPT')?.textContent || '',
        reason: gs.querySelector('Reason')?.textContent || '',
        endTime: gs.querySelector('End_Time')?.textContent || '',
      });
    });
    delayTypes.push({ name: 'Ground Stops', ground_stop_list: groundStopList });
  }

  // Parse Arrival/Departure Delays
  const delays = doc.querySelectorAll('Arrival_Departure_Delay_List Delay');
  if (delays.length > 0) {
    const delayList: FAAGeneralDelay[] = [];
    delays.forEach(d => {
      const delay: FAAGeneralDelay = {
        airportCode: d.querySelector('ARPT')?.textContent || '',
        reason: d.querySelector('Reason')?.textContent || '',
      };

      const arrMin = d.querySelector('Arrival_Delay Min')?.textContent;
      const arrMax = d.querySelector('Arrival_Delay Max')?.textContent;
      const arrTrend = d.querySelector('Arrival_Delay Trend')?.textContent;
      if (arrMin || arrMax) {
        delay.arrival = {
          minimum: arrMin || '',
          maximum: arrMax || '',
          trend: arrTrend || '',
        };
      }

      const depMin = d.querySelector('Departure_Delay Min')?.textContent;
      const depMax = d.querySelector('Departure_Delay Max')?.textContent;
      const depTrend = d.querySelector('Departure_Delay Trend')?.textContent;
      if (depMin || depMax) {
        delay.departure = {
          minimum: depMin || '',
          maximum: depMax || '',
          trend: depTrend || '',
        };
      }

      delayList.push(delay);
    });
    delayTypes.push({ name: 'General Arrival/Departure Delay Info', delays: delayList });
  }

  // Parse Closures
  const closures = doc.querySelectorAll('Airport_Closure_List Airport');
  if (closures.length > 0) {
    const closureList: FAAClosure[] = [];
    closures.forEach(c => {
      closureList.push({
        airportCode: c.querySelector('ARPT')?.textContent || '',
        start: c.querySelector('Start')?.textContent || '',
        reopens: c.querySelector('Reopen')?.textContent || '',
      });
    });
    delayTypes.push({ name: 'Airport Closures', closures: closureList });
  }

  return {
    airport_status_information: {
      update_time: updateTime,
      delay_types: delayTypes,
    },
  };
}

// Parse delay string to minutes
function parseDelayToMinutes(delayStr: string): number {
  let minutes = 0;
  const hourMatch = delayStr.match(/(\d+)\s*hour/i);
  const minMatch = delayStr.match(/(\d+)\s*min/i);

  if (hourMatch) minutes += parseInt(hourMatch[1], 10) * 60;
  if (minMatch) minutes += parseInt(minMatch[1], 10);

  return minutes;
}

// Convert FAA status to generic alerts for a specific airport
export function convertFAAStatusToAlerts(
  status: FAAStatusResponse,
  airportCode: string
): GenericAlert[] {
  const alerts: GenericAlert[] = [];
  const now = new Date();

  for (const delayType of status.airport_status_information.delay_types) {
    // Ground Delay Programs
    if (delayType.ground_delay_list) {
      for (const gd of delayType.ground_delay_list) {
        if (gd.airportCode === airportCode) {
          const avgMinutes = parseDelayToMinutes(gd.averageDelay);
          const reasonHash = gd.reason.substring(0, 20).replace(/\s+/g, '-');
          alerts.push({
            id: `faa-gdp-${gd.airportCode}-${avgMinutes}-${reasonHash}`,
            source: 'faa',
            category: 'aviation',
            severity: mapFAADelaySeverity(avgMinutes),
            title: `Ground Delay Program - ${gd.airportCode}`,
            summary: `Average delay: ${gd.averageDelay}`,
            description: `Maximum delay: ${gd.maximumDelay}\nReason: ${gd.reason}`,
            affectedArea: gd.airportCode,
            updatedAt: now,
            metadata: {
              source: 'faa',
              type: 'ground_delay',
              averageDelay: gd.averageDelay,
              maximumDelay: gd.maximumDelay,
            },
          });
        }
      }
    }

    // Ground Stops
    if (delayType.ground_stop_list) {
      for (const gs of delayType.ground_stop_list) {
        if (gs.airportCode === airportCode) {
          const reasonHash = gs.reason.substring(0, 20).replace(/\s+/g, '-');
          const endTimeHash = gs.endTime.substring(0, 10).replace(/\s+/g, '-');
          alerts.push({
            id: `faa-gs-${gs.airportCode}-${reasonHash}-${endTimeHash}`,
            source: 'faa',
            category: 'aviation',
            severity: 'critical',
            title: `Ground Stop - ${gs.airportCode}`,
            summary: `All departures halted`,
            description: `Reason: ${gs.reason}\nExpected end: ${gs.endTime}`,
            affectedArea: gs.airportCode,
            updatedAt: now,
            metadata: { source: 'faa', type: 'ground_stop', endTime: gs.endTime },
          });
        }
      }
    }

    // General Delays
    if (delayType.delays) {
      for (const d of delayType.delays) {
        if (d.airportCode === airportCode) {
          const parts: string[] = [];
          let maxDelay = 0;

          if (d.arrival) {
            parts.push(`Arrivals: ${d.arrival.minimum}-${d.arrival.maximum} (${d.arrival.trend})`);
            maxDelay = Math.max(maxDelay, parseDelayToMinutes(d.arrival.maximum));
          }
          if (d.departure) {
            parts.push(
              `Departures: ${d.departure.minimum}-${d.departure.maximum} (${d.departure.trend})`
            );
            maxDelay = Math.max(maxDelay, parseDelayToMinutes(d.departure.maximum));
          }

          const reasonHash = d.reason.substring(0, 20).replace(/\s+/g, '-');
          alerts.push({
            id: `faa-delay-${d.airportCode}-${maxDelay}-${reasonHash}`,
            source: 'faa',
            category: 'aviation',
            severity: mapFAADelaySeverity(maxDelay),
            title: `Flight Delays - ${d.airportCode}`,
            summary: d.reason,
            description: parts.join('\n'),
            affectedArea: d.airportCode,
            updatedAt: now,
            metadata: { source: 'faa', type: 'delay', arrival: d.arrival, departure: d.departure },
          });
        }
      }
    }

    // Closures
    if (delayType.closures) {
      for (const c of delayType.closures) {
        if (c.airportCode === airportCode) {
          const startHash = c.start.substring(0, 10).replace(/\s+/g, '-');
          const reopenHash = c.reopens.substring(0, 10).replace(/\s+/g, '-');
          alerts.push({
            id: `faa-closure-${c.airportCode}-${startHash}-${reopenHash}`,
            source: 'faa',
            category: 'aviation',
            severity: 'critical',
            title: `Airport Closure - ${c.airportCode}`,
            summary: `Closed until ${c.reopens}`,
            description: `Start: ${c.start}\nReopens: ${c.reopens}`,
            affectedArea: c.airportCode,
            updatedAt: now,
            metadata: { source: 'faa', type: 'closure', start: c.start, reopens: c.reopens },
          });
        }
      }
    }
  }

  return alerts;
}

// Get all FAA alerts (not filtered by airport)
export function convertAllFAAStatusToAlerts(status: FAAStatusResponse): GenericAlert[] {
  const alerts: GenericAlert[] = [];
  const now = new Date();

  for (const delayType of status.airport_status_information.delay_types) {
    if (delayType.ground_delay_list) {
      for (const gd of delayType.ground_delay_list) {
        const avgMinutes = parseDelayToMinutes(gd.averageDelay);
        const reasonHash = gd.reason.substring(0, 20).replace(/\s+/g, '-');
        alerts.push({
          id: `faa-gdp-${gd.airportCode}-${avgMinutes}-${reasonHash}`,
          source: 'faa',
          category: 'aviation',
          severity: mapFAADelaySeverity(avgMinutes),
          title: `Ground Delay - ${gd.airportCode}`,
          summary: `Avg: ${gd.averageDelay} | Max: ${gd.maximumDelay}`,
          description: `Reason: ${gd.reason}`,
          affectedArea: gd.airportCode,
          updatedAt: now,
          metadata: { source: 'faa', type: 'ground_delay' },
        });
      }
    }

    if (delayType.ground_stop_list) {
      for (const gs of delayType.ground_stop_list) {
        const reasonHash = gs.reason.substring(0, 20).replace(/\s+/g, '-');
        const endTimeHash = gs.endTime.substring(0, 10).replace(/\s+/g, '-');
        alerts.push({
          id: `faa-gs-${gs.airportCode}-${reasonHash}-${endTimeHash}`,
          source: 'faa',
          category: 'aviation',
          severity: 'critical',
          title: `Ground Stop - ${gs.airportCode}`,
          summary: `All departures halted until ${gs.endTime}`,
          description: `Reason: ${gs.reason}`,
          affectedArea: gs.airportCode,
          updatedAt: now,
          metadata: { source: 'faa', type: 'ground_stop' },
        });
      }
    }

    if (delayType.delays) {
      for (const d of delayType.delays) {
        let maxDelay = 0;
        const summary = [];
        if (d.arrival) {
          maxDelay = Math.max(maxDelay, parseDelayToMinutes(d.arrival.maximum));
          summary.push(`Arr: ${d.arrival.maximum}`);
        }
        if (d.departure) {
          maxDelay = Math.max(maxDelay, parseDelayToMinutes(d.departure.maximum));
          summary.push(`Dep: ${d.departure.maximum}`);
        }

        const reasonHash = d.reason.substring(0, 20).replace(/\s+/g, '-');
        alerts.push({
          id: `faa-delay-${d.airportCode}-${maxDelay}-${reasonHash}`,
          source: 'faa',
          category: 'aviation',
          severity: mapFAADelaySeverity(maxDelay),
          title: `Delays - ${d.airportCode}`,
          summary: summary.join(' | '),
          description: `Reason: ${d.reason}`,
          affectedArea: d.airportCode,
          updatedAt: now,
          metadata: { source: 'faa', type: 'delay' },
        });
      }
    }

    if (delayType.closures) {
      for (const c of delayType.closures) {
        const startHash = c.start.substring(0, 10).replace(/\s+/g, '-');
        const reopenHash = c.reopens.substring(0, 10).replace(/\s+/g, '-');
        alerts.push({
          id: `faa-closure-${c.airportCode}-${startHash}-${reopenHash}`,
          source: 'faa',
          category: 'aviation',
          severity: 'critical',
          title: `Closure - ${c.airportCode}`,
          summary: `Reopens: ${c.reopens}`,
          description: `Start: ${c.start}`,
          affectedArea: c.airportCode,
          updatedAt: now,
          metadata: { source: 'faa', type: 'closure' },
        });
      }
    }
  }

  return alerts;
}
