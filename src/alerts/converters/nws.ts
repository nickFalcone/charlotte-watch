import type { NWSAlertsResponse, NWSAlert } from '../../types/weather';
import type { GenericAlert } from '../../types/alerts';
import { mapNWSSeverity, ALERT_SEVERITY_CONFIG } from '../../types/alerts';

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

// Convert all NWS alerts to generic format
export function convertNWSAlertsToGeneric(response: NWSAlertsResponse): GenericAlert[] {
  return response.features.map(convertNWSAlertToGeneric);
}
