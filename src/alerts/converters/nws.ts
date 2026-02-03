import type { NWSAlertsResponse, NWSAlert } from '../../types/weather';
import type { GenericAlert } from '../../types/alerts';
import { mapNWSSeverity, ALERT_SEVERITY_CONFIG } from '../../types/alerts';

/** Exclude NWS alerts that are only about NOAA Weather Radio transmitter maintenance (not weather hazards). */
function isNoaaRadioMaintenanceAlert(alert: NWSAlert): boolean {
  const desc = (alert.properties.description ?? '').toLowerCase();
  const headline = (alert.properties.headline ?? '').toLowerCase();
  const text = `${desc} ${headline}`;
  return (
    text.includes('noaa weather radio') &&
    (text.includes('transmitter') || text.includes('broadcasting')) &&
    (text.includes('off the air') ||
      text.includes('maintenance') ||
      text.includes('out of service'))
  );
}

// Convert NWS alert to generic alert format
export function convertNWSAlertToGeneric(alert: NWSAlert): GenericAlert {
  const severity = mapNWSSeverity(alert.properties.severity, alert.properties.event);

  return {
    id: alert.id,
    source: 'nws',
    category: 'weather',
    severity,
    title: alert.properties.event,
    summary: alert.properties.headline || alert.properties.event,
    description: alert.properties.description,
    instruction: alert.properties.instruction || undefined,
    affectedArea: alert.properties.areaDesc,
    startTime: new Date(alert.properties.effective),
    endTime: new Date(alert.properties.expires),
    updatedAt: new Date(),
    metadata: {
      source: 'nws',
      certainty: alert.properties.certainty,
      urgency: alert.properties.urgency,
      nwsSeverity: alert.properties.severity,
      displaySeverity: ALERT_SEVERITY_CONFIG[severity].label,
    },
  };
}

// Convert all NWS alerts to generic format (exclude NOAA radio transmitter maintenance notices)
export function convertNWSAlertsToGeneric(response: NWSAlertsResponse): GenericAlert[] {
  return response.features
    .filter(f => !isNoaaRadioMaintenanceAlert(f))
    .map(convertNWSAlertToGeneric);
}
