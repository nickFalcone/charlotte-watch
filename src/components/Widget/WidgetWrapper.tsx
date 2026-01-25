import type { ReactNode } from 'react';
import type { WidgetConfig } from '../../types';
import { WidgetMetadataProvider } from './WidgetMetadataContext';
import { useWidgetMetadataValue } from './useWidgetMetadata';
import { TimeUpdated } from './TimeUpdated';
import {
  WidgetContainer,
  WidgetHeader,
  WidgetTitleSection,
  WidgetIcon,
  WidgetTitle,
  WidgetControls,
  ControlButton,
  WidgetContent,
  DragHandle,
} from './WidgetWrapper.styles';

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
      <WidgetHeader>
        <WidgetTitleSection className="widget-drag-handle">
          <DragHandle />
          <WidgetIcon>{icon}</WidgetIcon>
          <WidgetTitle>{config.title}</WidgetTitle>
          <TimeUpdated timestamp={lastUpdated} getPausedReason={getPausedReason} />
        </WidgetTitleSection>
        <WidgetControls>
          {onToggleLock && (
            <ControlButton
              onClick={e => {
                e.stopPropagation();
                onToggleLock();
              }}
              title={config.locked ? 'Unlock widget' : 'Lock widget'}
            >
              {config.locked ? '🔒' : '🔓'}
            </ControlButton>
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
              $variant="danger"
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
