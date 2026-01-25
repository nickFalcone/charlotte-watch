import type { DukeOutage } from '../../types/duke';
import { getDukeCustomersAffected } from '../../types/duke';
import type { GenericAlert } from '../../types/alerts';
import { mapDukeOutageSeverity, ALERT_SEVERITY_CONFIG } from '../../types/alerts';
import { buildMapUrlIfValid } from '../../utils/mapUrl';

// Format estimated restoration time for display
function formatEstimatedRestoration(etr: string | undefined): string | undefined {
  if (!etr) return undefined;

  try {
    const date = new Date(etr);
    if (isNaN(date.getTime())) {
      // If not a valid ISO date, return as-is (might be descriptive like "Assessing")
      return etr;
    }
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return etr;
  }
}

// Convert Duke Energy outage to generic alert format
export function convertDukeOutageToGeneric(outage: DukeOutage): GenericAlert {
  const customersAffected = getDukeCustomersAffected(outage);
  const severity = mapDukeOutageSeverity(customersAffected);
  const estimatedRestoration = formatEstimatedRestoration(outage.estimatedRestorationTime);
  const isPlanned = outage.outageCause === 'planned';

  // Build summary
  const summaryParts: string[] = [
    `${customersAffected.toLocaleString()} customer${customersAffected === 1 ? '' : 's'} affected`,
  ];
  if (outage.operationCenterName) {
    summaryParts.push(`Location: ${outage.operationCenterName}`);
  }
  if (estimatedRestoration) {
    summaryParts.push(`Est. restoration: ${estimatedRestoration}`);
  }
  if (outage.outageCause) {
    summaryParts.push(isPlanned ? 'Planned outage' : 'Unplanned outage');
  }

  // Build description with additional details
  const descriptionParts: string[] = [];
  descriptionParts.push(`Type: ${isPlanned ? 'Planned maintenance' : 'Unplanned outage'}`);
  descriptionParts.push(`Customers affected: ${customersAffected.toLocaleString()}`);
  if (estimatedRestoration) {
    descriptionParts.push(`Estimated restoration: ${estimatedRestoration}`);
  }
  descriptionParts.push(`Event ID: ${outage.sourceEventNumber}`);
  if (outage.causeDescription?.trim()) {
    descriptionParts.push(`Cause: ${outage.causeDescription.trim()}`);
  }
  if (outage.crewStatTxt?.trim()) {
    descriptionParts.push(`Crew status: ${outage.crewStatTxt.trim()}`);
  }

  // Build instruction based on outage type
  const instruction = isPlanned
    ? 'This is a planned outage for maintenance. Power should be restored by the estimated time.'
    : 'Duke Energy is aware of this outage and working to restore power. For updates, visit duke-energy.com/outages or call 1-800-769-3766.';

  return {
    id: `duke-${outage.sourceEventNumber}`,
    source: 'duke',
    category: 'power',
    severity,
    title: isPlanned ? 'Planned Power Outage' : 'Power Outage',
    summary: summaryParts.join(' • '),
    description: descriptionParts.join('\n'),
    instruction,
    affectedArea: outage.operationCenterName || 'Mecklenburg County',
    endTime: outage.estimatedRestorationTime
      ? new Date(outage.estimatedRestorationTime)
      : undefined,
    updatedAt: new Date(),
    url: buildMapUrlIfValid(outage.deviceLatitudeLocation, outage.deviceLongitudeLocation),
    metadata: {
      source: 'duke',
      customersAffected,
      cause: outage.outageCause ?? 'unplanned',
      planned: isPlanned,
      eventId: outage.sourceEventNumber,
      displaySeverity: ALERT_SEVERITY_CONFIG[severity].label,
      operationCenter: outage.operationCenterName,
    },
  };
}

// Convert all Duke outages to generic format
export function convertDukeOutagesToGeneric(outages: DukeOutage[]): GenericAlert[] {
  return outages.map(convertDukeOutageToGeneric);
}
