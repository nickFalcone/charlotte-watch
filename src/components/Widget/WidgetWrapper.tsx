import type { ReactNode } from 'react';
import type { WidgetConfig } from '../../types';
import { WidgetMetadataProvider } from './WidgetMetadataContext';
import { useWidgetMetadataValue } from './useWidgetMetadata';
import { TimeUpdated } from './TimeUpdated';
import dragIcon from '../../assets/icons/drag.svg';
import lockedIcon from '../../assets/icons/locked.svg';
import unlockedIcon from '../../assets/icons/unlocked.svg';
import {
  WidgetContainer,
  WidgetHeader,
  WidgetTitleSection,
  WidgetIcon,
  WidgetTitle,
  WidgetControls,
  ControlButton,
  ControlButtonIcon,
  ControlTooltipContent,
  WidgetContent,
  DragHandle,
} from './WidgetWrapper.styles';
import * as Tooltip from '@radix-ui/react-tooltip';
import { AnimatedTooltipContent } from '../common';

interface WidgetWrapperProps {
  config: WidgetConfig;
  icon: string;
  color: string;
  children: ReactNode;
  onToggleVisibility?: () => void;
  onToggleLock?: () => void;
  onOpenSettings?: () => void;
}

function WidgetWrapperInner({
  config,
  icon,
  color,
  children,
  onToggleVisibility,
  onToggleLock,
  onOpenSettings,
}: WidgetWrapperProps) {
  const { lastUpdated, getPausedReason } = useWidgetMetadataValue();

  return (
    <WidgetContainer $accentColor={color}>
      <WidgetHeader $locked={config.locked}>
        <WidgetTitleSection className="widget-drag-handle">
          <DragHandle src={dragIcon} alt="" aria-hidden $locked={config.locked} />
          <WidgetIcon src={icon} alt="" />
          <WidgetTitle>{config.title}</WidgetTitle>
          <TimeUpdated timestamp={lastUpdated} getPausedReason={getPausedReason} />
        </WidgetTitleSection>
        <WidgetControls>
          {onToggleLock && (
            <Tooltip.Provider delayDuration={600}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <ControlButton
                    aria-label={
                      config.locked
                        ? 'Unlock widget location and dimensions'
                        : 'Lock widget location and dimensions'
                    }
                    onClick={e => {
                      e.stopPropagation();
                      onToggleLock();
                    }}
                  >
                    <ControlButtonIcon
                      src={config.locked ? lockedIcon : unlockedIcon}
                      alt=""
                      aria-hidden
                    />
                  </ControlButton>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <AnimatedTooltipContent side="top" sideOffset={5} asChild>
                    <ControlTooltipContent>
                      {config.locked
                        ? 'Unlock widget location and dimensions'
                        : 'Lock widget location and dimensions'}
                    </ControlTooltipContent>
                  </AnimatedTooltipContent>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          )}
          {onOpenSettings && (
            <ControlButton
              onClick={e => {
                e.stopPropagation();
                onOpenSettings();
              }}
              title="Settings"
            >
              ⚙
            </ControlButton>
          )}
          {onToggleVisibility && (
            <ControlButton
              onClick={e => {
                e.stopPropagation();
                onToggleVisibility();
              }}
              title="Hide widget"
            >
              ✕
            </ControlButton>
          )}
        </WidgetControls>
      </WidgetHeader>
      <WidgetContent>{children}</WidgetContent>
    </WidgetContainer>
  );
}

export function WidgetWrapper(props: WidgetWrapperProps) {
  return (
    <WidgetMetadataProvider>
      <WidgetWrapperInner {...props} />
    </WidgetMetadataProvider>
  );
}
