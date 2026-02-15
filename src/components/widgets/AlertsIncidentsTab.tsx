import { useMemo } from 'react';
import type { GenericAlert, AlertSource } from '../../types/alerts';
import { useAlertSeverityConfig } from '../../hooks';
import type { SummarizeResponse } from '../../utils/alertSummaryApi';
import { AlertIcon } from '../AlertIcon';
import infoIcon from '../../assets/icons/info.svg';
import * as Popover from '@radix-ui/react-popover';
import { AnimatedPopoverContent, formatGeneratedAt, InfoIcon, InfoTrigger } from '../common';
import { getDisplaySeverity } from './alertsMapUtils';
import { SourceFilterBar } from './SourceFilterBar';
import { AlertEmptyState } from './AlertEmptyState';
import {
  AlertsContainer,
  AlertsHeader,
  AlertsHeaderRow,
  AlertCount,
  AlertsList,
  AlertCard,
  AlertCardHeader,
  AlertTitleRow,
  AlertSourceIcon,
  AlertTitle,
  AlertSeverityBadge,
  AlertSummary,
  AlertMeta,
  AlertMetaItem,
  AISummaryContainer,
  AISummaryRow,
  AISummaryText,
  AISummaryList,
  AISummaryListItem,
  AISummaryGeneratedAt,
  AISummaryMetaRow,
  AISummarySkeleton,
  AISummarySkeletonLine,
  AISummaryError,
} from './AlertsIncidentsTab.styles';

function AISummaryContent({ summary }: { summary: string }) {
  const raw = summary.trim();
  const lines = raw.split(/\n/).filter(Boolean);
  const hasBulletPrefix = lines.some(line => /^\s*[-*•]\s/.test(line));
  const normalizedLines = hasBulletPrefix
    ? lines.map(line => line.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean)
    : lines.map(line => line.trim()).filter(Boolean);
  if (normalizedLines.length > 0) {
    return (
      <AISummaryList>
        {normalizedLines.map((line, i) => (
          <AISummaryListItem key={i}>{line}</AISummaryListItem>
        ))}
      </AISummaryList>
    );
  }
  return <>{raw}</>;
}

export interface AlertsIncidentsTabProps {
  sortedAlerts: GenericAlert[];
  sortedAllAlerts: GenericAlert[];
  sources: Record<AlertSource, { success: boolean; error?: string }> | undefined;
  visibleSources: Set<AlertSource>;
  handleVisibleSourcesChange: (values: string[]) => void;
  showAllAlertSources: () => void;
  summaryData: SummarizeResponse | undefined;
  isSummaryLoading: boolean;
  isSummaryError: boolean;
  onAlertSelect: (alert: GenericAlert) => void;
}

export function AlertsIncidentsTab({
  sortedAlerts,
  sortedAllAlerts,
  sources,
  visibleSources,
  handleVisibleSourcesChange,
  showAllAlertSources,
  summaryData,
  isSummaryLoading,
  isSummaryError,
  onAlertSelect,
}: AlertsIncidentsTabProps) {
  const alertSeverityConfig = useAlertSeverityConfig();

  // Stable random skeleton line widths (30-100%)
  const aiSummarySkeletonWidths = useMemo(
    () => Array.from({ length: 9 }, () => Math.round(30 + Math.random() * 70)),
    []
  );

  return (
    <AlertsContainer>
      <AlertsHeader>
        <AlertsHeaderRow>
          <AlertCount
            $hasAlerts={sortedAlerts.length > 0}
            $allHidden={sortedAllAlerts.length > 0 && sortedAlerts.length === 0}
          >
            {sortedAllAlerts.length > 0 && sortedAlerts.length === 0
              ? '0 ALERTS VISIBLE'
              : `${sortedAlerts.length} ALERTS`}
          </AlertCount>
          {sources && visibleSources.size > 0 && (
            <SourceFilterBar
              sources={sources}
              visibleSources={visibleSources}
              onVisibleSourcesChange={handleVisibleSourcesChange}
            />
          )}
        </AlertsHeaderRow>
      </AlertsHeader>

      {sortedAllAlerts.length > 0 && (
        <AISummaryContainer>
          {isSummaryLoading ? (
            <AISummarySkeleton>
              {aiSummarySkeletonWidths.map((width, i) => (
                <AISummarySkeletonLine key={i} $width={`${width}%`} />
              ))}
            </AISummarySkeleton>
          ) : isSummaryError ? (
            <AISummaryError>Summary unavailable</AISummaryError>
          ) : summaryData?.summary ? (
            <AISummaryRow>
              <AISummaryText>
                <AISummaryContent summary={summaryData.summary} />
                <AISummaryMetaRow>
                  {summaryData.generatedAt && (
                    <AISummaryGeneratedAt>
                      Generated: {formatGeneratedAt(summaryData.generatedAt)}
                    </AISummaryGeneratedAt>
                  )}
                  <Popover.Root>
                    <Popover.Trigger asChild>
                      <InfoTrigger aria-label="About AI summary">
                        <InfoIcon src={infoIcon} alt="" aria-hidden />
                      </InfoTrigger>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <AnimatedPopoverContent side="top" sideOffset={6}>
                        This is an AI-generated summary of the most important alerts. Always confirm
                        details with source references.
                      </AnimatedPopoverContent>
                    </Popover.Portal>
                  </Popover.Root>
                </AISummaryMetaRow>
              </AISummaryText>
            </AISummaryRow>
          ) : null}
        </AISummaryContainer>
      )}

      {sortedAlerts.length === 0 ? (
        <AlertEmptyState
          sources={sources}
          sortedAllAlerts={sortedAllAlerts}
          sortedAlerts={sortedAlerts}
          visibleSources={visibleSources}
          showAllAlertSources={showAllAlertSources}
        />
      ) : (
        <AlertsList tabIndex={0} role="region" aria-label="Alerts list">
          {sortedAlerts.map(alert => {
            const severityConfig = alertSeverityConfig[alert.severity];

            return (
              <AlertCard
                key={alert.id}
                type="button"
                aria-label={`${severityConfig.label}: ${alert.title}`}
                $accentColor={severityConfig.color}
                $accentBg={severityConfig.bgColor}
                onClick={() => onAlertSelect(alert)}
              >
                <AlertCardHeader>
                  <AlertTitleRow>
                    <AlertSourceIcon>
                      <AlertIcon source={alert.source} size={16} />
                    </AlertSourceIcon>
                    <AlertTitle>{alert.title}</AlertTitle>
                  </AlertTitleRow>
                  <AlertSeverityBadge $color={severityConfig.color} $bg={severityConfig.bgColor}>
                    {getDisplaySeverity(alert) || severityConfig.label}
                  </AlertSeverityBadge>
                </AlertCardHeader>
                <AlertSummary>{alert.summary}</AlertSummary>
                <AlertMeta>
                  {alert.affectedArea && (
                    <AlertMetaItem>
                      {alert.affectedArea.length > 160
                        ? `${alert.affectedArea.slice(0, 160)}...`
                        : alert.affectedArea}
                    </AlertMetaItem>
                  )}
                </AlertMeta>
              </AlertCard>
            );
          })}
        </AlertsList>
      )}
    </AlertsContainer>
  );
}
