import type { CATSEntity } from '../../types/cats';
import type { GenericAlert } from '../../types/alerts';
import { mapCATSSeverity, ALERT_SEVERITY_CONFIG } from '../../types/alerts';
import { isLynxLightRailRoute } from '../../utils/catsApi';

// Convert CATS alert to generic alert format
export function convertCATSAlertToGeneric(alert: CATSEntity): GenericAlert {
  const severity = mapCATSSeverity({
    effect: alert.alert.effect,
    cause: alert.alert.cause,
  });

  // Get affected routes (only LYNX routes since we filter for them)
  const affectedRoutes = alert.alert.informedEntity
    .map(entity => entity.routeId)
    .filter(routeId => routeId !== undefined)
    .filter(routeId => isLynxLightRailRoute(routeId));

  // Build title
  const effectText =
    alert.alert.effectDetail?.translation?.[0]?.text ||
    alert.alert.effect.replace(/_/g, ' ').toLowerCase();
  const causeText =
    alert.alert.causeDetail?.translation?.[0]?.text ||
    alert.alert.cause.replace(/_/g, ' ').toLowerCase();
  const title = `${effectText} - ${causeText}`;

  // Build summary with affected routes
  const routesText =
    affectedRoutes.length > 0 ? `Routes: ${affectedRoutes.join(', ')}` : 'LYNX Light Rail';
  const headerText = alert.alert.headerText?.translation?.[0]?.text || title;
  const summary = `${headerText} • ${routesText}`;

  // Build description
  const descriptionText =
    alert.alert.descriptionText?.translation?.[0]?.text || 'Transit service alert';

  // Get active period
  const activePeriod = alert.alert.activePeriod[0];
  const startTime = activePeriod?.start ? new Date(activePeriod.start * 1000) : undefined;
  const endTime = activePeriod?.end ? new Date(activePeriod.end * 1000) : undefined;

  return {
    id: `cats-${alert.id}`,
    source: 'cats',
    category: 'transit',
    severity,
    title,
    summary,
    description: descriptionText,
    affectedArea: 'Charlotte LYNX Light Rail',
    startTime,
    endTime,
    updatedAt: new Date(),
    metadata: {
      source: 'cats',
      routes: affectedRoutes,
      effect: alert.alert.effect,
      cause: alert.alert.cause,
      displaySeverity: ALERT_SEVERITY_CONFIG[severity].label,
    },
  };
}

// Convert all CATS alerts to generic format
export function convertCATSAlertsToGeneric(alerts: CATSEntity[]): GenericAlert[] {
  return alerts.map(convertCATSAlertToGeneric);
}
