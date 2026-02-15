import { useTheme } from 'styled-components';
import type { AlertSource } from '../../types/alerts';
import {
  ALERT_SOURCE_LABELS,
  ALERT_SOURCE_FULL_NAMES,
  DARK_STATUS_SUCCESS,
  DARK_STATUS_ERROR,
} from '../../types/alerts';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as Tooltip from '@radix-ui/react-tooltip';
import { AnimatedTooltipContent } from '../common';
import {
  SourceToggleGroup,
  SourceToggleItem,
  TooltipContent,
  TooltipRow,
  TooltipArrow,
} from './AlertsIncidentsTab.styles';

interface SourceFilterBarProps {
  sources: Record<AlertSource, { success: boolean; error?: string }>;
  visibleSources: Set<AlertSource>;
  onVisibleSourcesChange: (values: string[]) => void;
}

export function SourceFilterBar({
  sources,
  visibleSources,
  onVisibleSourcesChange,
}: SourceFilterBarProps) {
  const theme = useTheme();

  return (
    <Tooltip.Provider delayDuration={300}>
      <ToggleGroup.Root
        type="multiple"
        value={Array.from(visibleSources)}
        onValueChange={onVisibleSourcesChange}
        asChild
      >
        <SourceToggleGroup>
          {(Object.entries(sources) as [AlertSource, { success: boolean; error?: string }][]).map(
            ([sourceKey, status]) => {
              const isVisible = visibleSources.has(sourceKey);
              return (
                <Tooltip.Root key={sourceKey}>
                  <Tooltip.Trigger asChild>
                    <ToggleGroup.Item value={sourceKey} asChild>
                      <SourceToggleItem $success={status.success} $visible={isVisible}>
                        {ALERT_SOURCE_LABELS[sourceKey]}
                      </SourceToggleItem>
                    </ToggleGroup.Item>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <AnimatedTooltipContent side="top" sideOffset={5} asChild>
                      <TooltipContent>
                        <TooltipRow>{ALERT_SOURCE_FULL_NAMES[sourceKey]}</TooltipRow>
                        <TooltipRow
                          $color={
                            theme.name === 'dark'
                              ? status.success
                                ? DARK_STATUS_SUCCESS
                                : DARK_STATUS_ERROR
                              : status.success
                                ? theme.colors.success
                                : theme.colors.error
                          }
                        >
                          {status.success ? 'Connected' : `Error: ${status.error || 'Failed'}`}
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
            }
          )}
        </SourceToggleGroup>
      </ToggleGroup.Root>
    </Tooltip.Provider>
  );
}
