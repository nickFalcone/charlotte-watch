import type { AlertSource } from '../../types/alerts';
import { ALERT_SOURCE_LABELS } from '../../types/alerts';
import noResultsIcon from '../../assets/icons/no-results.svg';
import {
  NoAlertsContainer,
  NoAlertsIcon,
  NoAlertsText,
  NoAlertsSubtext,
  SelectAllLink,
} from './AlertsIncidentsTab.styles';

interface AlertEmptyStateProps {
  sources: Record<AlertSource, { success: boolean; error?: string }> | undefined;
  sortedAllAlerts: { length: number };
  sortedAlerts: { length: number };
  visibleSources: Set<AlertSource>;
  showAllAlertSources: () => void;
}

export function AlertEmptyState({
  sources,
  sortedAllAlerts,
  sortedAlerts,
  visibleSources,
  showAllAlertSources,
}: AlertEmptyStateProps) {
  // Case 1: Some sources failed to connect
  if (sources && Object.values(sources).some(status => !status.success)) {
    const unavailable = (Object.entries(sources) as [AlertSource, { success: boolean }][])
      .filter(([, status]) => !status.success)
      .map(([key]) => ALERT_SOURCE_LABELS[key]);

    return (
      <NoAlertsContainer>
        <NoAlertsText>Alert Sources Unavailable</NoAlertsText>
        <NoAlertsSubtext>
          {unavailable.join(', ')} {unavailable.length === 1 ? 'is' : 'are'} currently unavailable
        </NoAlertsSubtext>
      </NoAlertsContainer>
    );
  }

  // Case 2: Alerts exist but all are in hidden sources
  const allAlertsHidden = sortedAllAlerts.length > 0 && sortedAlerts.length === 0;

  if (allAlertsHidden) {
    return (
      <NoAlertsContainer>
        <NoAlertsIcon src={noResultsIcon} alt="" />
        <NoAlertsText $variant="warning">No Visible Alerts</NoAlertsText>
        <NoAlertsSubtext>
          {sortedAllAlerts.length} {sortedAllAlerts.length === 1 ? 'alert is' : 'alerts are'} in
          hidden sources.{' '}
          <SelectAllLink onClick={showAllAlertSources}>View all sources</SelectAllLink>.
        </NoAlertsSubtext>
      </NoAlertsContainer>
    );
  }

  // Case 3: No alerts, but some sources are hidden
  if (sources) {
    const totalSources = Object.keys(sources).length;
    const hiddenCount = totalSources - visibleSources.size;
    if (hiddenCount > 0) {
      return (
        <NoAlertsContainer>
          <NoAlertsIcon src={noResultsIcon} alt="" />
          <NoAlertsText>No Active Alerts</NoAlertsText>
          <NoAlertsSubtext>
            {hiddenCount} {hiddenCount === 1 ? 'source is' : 'sources are'} hidden (summary
            considers all sources).{' '}
            <SelectAllLink onClick={showAllAlertSources}>View all sources</SelectAllLink>.
          </NoAlertsSubtext>
        </NoAlertsContainer>
      );
    }
  }

  // Case 4: No alerts, all systems normal
  return (
    <NoAlertsContainer>
      <NoAlertsIcon src={noResultsIcon} alt="" />
      <NoAlertsText>No Active Alerts</NoAlertsText>
      <NoAlertsSubtext>All systems normal</NoAlertsSubtext>
    </NoAlertsContainer>
  );
}
