import { useMemo } from 'react';
import { useTheme } from 'styled-components';
import type { GenericAlert, AlertSource } from '../../types/alerts';
import type { SummarizeResponse } from '../../utils/alertSummaryApi';
import { AlertIcon } from '../AlertIcon';
import infoIcon from '../../assets/icons/info.svg';
import noResultsIcon from '../../assets/icons/no-results.svg';
import * as Popover from '@radix-ui/react-popover';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as Tooltip from '@radix-ui/react-tooltip';
import {
  AnimatedPopoverContent,
  AnimatedTooltipContent,
  formatGeneratedAt,
  InfoIcon,
  InfoTrigger,
} from '../common';
import { getDisplaySeverity } from './alertsMapUtils';
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
  NoAlertsContainer,
  NoAlertsIcon,
  NoAlertsText,
  NoAlertsSubtext,
  SelectAllLink,
  SourceToggleGroup,
  SourceToggleItem,
  TooltipContent,
  TooltipRow,
  TooltipArrow,
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
} from './AlertsWidget.styles';

const SOURCE_LABELS: Record<AlertSource, string> = {
  nws: 'NWS',
  faa: 'FAA',
  duke: 'Duke',
  ncdot: 'NCDOT',
  cats: 'CATS',
  cmpd: 'CMPD',
  cms: 'CMS',
  'here-flow': 'Traffic',
  traffic: 'Traffic',
  system: 'System',
  custom: 'Custom',
};

const SOURCE_FULL_NAMES: Record<AlertSource, string> = {
  nws: 'National Weather Service',
  faa: 'Federal Aviation Administration',
  duke: 'Duke Energy',
  ncdot: 'NC Dept. of Transportation',
  cats: 'Charlotte Area Transit System',
  cmpd: 'Charlotte-Mecklenburg Police',
  cms: 'Charlotte-Mecklenburg Schools',
  'here-flow': 'HERE Traffic Flow',
  traffic: 'Traffic',
  system: 'System',
  custom: 'Custom',
};

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
  alertSeverityConfig: Record<string, { color: string; bgColor: string; label: string }>;
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
  alertSeverityConfig,
  onAlertSelect,
}: AlertsIncidentsTabProps) {
  const theme = useTheme();

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
            <Tooltip.Provider delayDuration={300}>
              <ToggleGroup.Root
                type="multiple"
                value={Array.from(visibleSources)}
                onValueChange={handleVisibleSourcesChange}
                asChild
              >
                <SourceToggleGroup>
                  {(
                    Object.entries(sources) as [AlertSource, { success: boolean; error?: string }][]
                  ).map(([sourceKey, status]) => {
                    const isVisible = visibleSources.has(sourceKey);
                    return (
                      <Tooltip.Root key={sourceKey}>
                        <Tooltip.Trigger asChild>
                          <ToggleGroup.Item value={sourceKey} asChild>
                            <SourceToggleItem $success={status.success} $visible={isVisible}>
                              {SOURCE_LABELS[sourceKey]}
                            </SourceToggleItem>
                          </ToggleGroup.Item>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <AnimatedTooltipContent side="top" sideOffset={5} asChild>
                            <TooltipContent>
                              <TooltipRow>{SOURCE_FULL_NAMES[sourceKey]}</TooltipRow>
                              <TooltipRow
                                $color={
                                  theme.name === 'dark'
                                    ? status.success
                                      ? '#4ade80'
                                      : '#ffb0b0'
                                    : status.success
                                      ? theme.colors.success
                                      : theme.colors.error
                                }
                              >
                                {status.success
                                  ? 'Connected'
                                  : `Error: ${status.error || 'Failed'}`}
                              </TooltipRow>
                              <TooltipRow>{isVisible ? 'Visible' : 'Hidden'}</TooltipRow>
                              <Tooltip.Arrow asChild>
                                <TooltipArrow />
                              </Tooltip.Arrow>
                            </TooltipContent>
                          </AnimatedTooltipContent>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    );
                  })}
                </SourceToggleGroup>
              </ToggleGroup.Root>
            </Tooltip.Provider>
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
        sources && Object.values(sources).some(status => !status.success) ? (
          <NoAlertsContainer>
            <NoAlertsText>Alert Sources Unavailable</NoAlertsText>
            <NoAlertsSubtext>
              {(() => {
                const unavailable = (
                  Object.entries(sources) as [AlertSource, { success: boolean }][]
                )
                  .filter(([_, status]) => !status.success)
                  .map(([key]) => SOURCE_LABELS[key]);
                return `${unavailable.join(', ')} ${unavailable.length === 1 ? 'is' : 'are'} currently unavailable`;
              })()}
            </NoAlertsSubtext>
          </NoAlertsContainer>
        ) : (
          (() => {
            const allAlertsHidden = sortedAllAlerts.length > 0 && sortedAlerts.length === 0;
            return (
              <NoAlertsContainer>
                <NoAlertsIcon src={noResultsIcon} alt="" />
                <NoAlertsText $variant={allAlertsHidden ? 'warning' : undefined}>
                  {allAlertsHidden ? 'No Visible Alerts' : 'No Active Alerts'}
                </NoAlertsText>
                <NoAlertsSubtext>
                  {allAlertsHidden ? (
                    <>
                      {sortedAllAlerts.length}{' '}
                      {sortedAllAlerts.length === 1 ? 'alert is' : 'alerts are'} in hidden sources.{' '}
                      <SelectAllLink onClick={showAllAlertSources}>View all sources</SelectAllLink>.
                    </>
                  ) : !sources ? (
                    'All systems normal'
                  ) : (
                    (() => {
                      const totalSources = Object.keys(sources).length;
                      const hiddenCount = totalSources - visibleSources.size;
                      if (hiddenCount > 0) {
                        return (
                          <>
                            {hiddenCount} {hiddenCount === 1 ? 'source is' : 'sources are'} hidden
                            (summary considers all sources).{' '}
                            <SelectAllLink onClick={showAllAlertSources}>
                              View all sources
                            </SelectAllLink>
                            .
                          </>
                        );
                      }
                      return 'All systems normal';
                    })()
                  )}
                </NoAlertsSubtext>
              </NoAlertsContainer>
            );
          })()
        )
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
