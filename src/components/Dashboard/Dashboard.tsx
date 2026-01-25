import { useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import * as Dialog from '@radix-ui/react-dialog';
import * as ToggleGroup from '@radix-ui/react-toggle-group';

import { useDashboardLayout } from '../../hooks';
import { WidgetWrapper } from '../Widget';
import { widgetRegistry } from '../widgets';
import { WIDGET_COLORS, WIDGET_ICONS } from '../widgets/constants';
import { BREAKPOINTS, COLS, ROW_HEIGHT, MARGIN } from '../../utils/layoutDefaults';
import { ThemeToggle } from '../../theme';
import {
  DashboardContainer,
  DashboardHeader,
  DashboardTitle,
  HeaderControls,
  HeaderButton,
  GridContainer,
  WidgetDrawer,
  DrawerOverlay,
  DrawerHeader,
  DrawerTitle,
  CloseButton,
  WidgetToggleGroup,
  WidgetListItem,
  WidgetListIcon,
  WidgetListInfo,
  WidgetListName,
  WidgetListStatus,
  EmptyState,
  EmptyStateIcon,
  EmptyStateText,
} from './Dashboard.styles';

const ResponsiveGridLayout = WidthProvider(Responsive);

export function Dashboard() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const {
    widgets,
    visibleWidgets,
    getVisibleLayouts,
    handleLayoutChange,
    toggleWidgetVisibility,
    toggleWidgetLock,
    updateWidgetSettings,
    resetLayout,
  } = useDashboardLayout();

  const visibleLayouts = getVisibleLayouts();

  return (
    <DashboardContainer>
      <Dialog.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DashboardHeader as="header" role="banner">
          <DashboardTitle as="h1">
            <span aria-hidden="true">📊</span>
            Charlotte Monitor
          </DashboardTitle>
          <HeaderControls>
            <ThemeToggle />
            <Dialog.Trigger asChild>
              <HeaderButton aria-label="Open widgets menu">
                <span aria-hidden="true">📦</span>
                Widgets
              </HeaderButton>
            </Dialog.Trigger>
            <HeaderButton
              $variant="secondary"
              onClick={resetLayout}
              aria-label="Reset dashboard layout"
            >
              <span aria-hidden="true">↻</span>
              Reset
            </HeaderButton>
          </HeaderControls>
        </DashboardHeader>

        <GridContainer as="main" role="main">
          {visibleWidgets.length > 0 ? (
            <ResponsiveGridLayout
              layouts={visibleLayouts}
              breakpoints={BREAKPOINTS}
              cols={COLS}
              rowHeight={ROW_HEIGHT}
              margin={MARGIN}
              onLayoutChange={handleLayoutChange}
              draggableHandle=".widget-drag-handle"
              useCSSTransforms
              compactType="vertical"
              preventCollision={false}
              isResizable={true}
              resizeHandles={['se']}
            >
              {visibleWidgets.map(widget => {
                const definition = widgetRegistry[widget.type];
                const WidgetComponent = definition.component;

                return (
                  <div key={widget.id}>
                    <WidgetWrapper
                      config={widget}
                      icon={WIDGET_ICONS[widget.type]}
                      color={WIDGET_COLORS[widget.type]}
                      onToggleVisibility={() => toggleWidgetVisibility(widget.id)}
                      onToggleLock={() => toggleWidgetLock(widget.id)}
                    >
                      <WidgetComponent
                        config={widget}
                        onSettingsChange={settings => updateWidgetSettings(widget.id, settings)}
                      />
                    </WidgetWrapper>
                  </div>
                );
              })}
            </ResponsiveGridLayout>
          ) : (
            <EmptyState>
              <EmptyStateIcon>📭</EmptyStateIcon>
              <EmptyStateText>No widgets visible. Click "Widgets" to add some.</EmptyStateText>
            </EmptyState>
          )}
        </GridContainer>

        <Dialog.Portal>
          <Dialog.Overlay asChild>
            <DrawerOverlay $isOpen={isDrawerOpen} />
          </Dialog.Overlay>
          <Dialog.Content asChild>
            <WidgetDrawer $isOpen={isDrawerOpen} as="aside" aria-label="Widget manager">
              <DrawerHeader>
                <Dialog.Title asChild>
                  <DrawerTitle as="h2">Manage Widgets</DrawerTitle>
                </Dialog.Title>
                <Dialog.Close asChild>
                  <CloseButton aria-label="Close widget manager">✕</CloseButton>
                </Dialog.Close>
              </DrawerHeader>
              <WidgetToggleGroup
                type="multiple"
                value={widgets.filter(w => w.visible).map(w => w.id)}
                onValueChange={newValue => {
                  const visibleIds = widgets.filter(w => w.visible).map(w => w.id);
                  const added = newValue.filter(id => !visibleIds.includes(id));
                  const removed = visibleIds.filter(id => !newValue.includes(id));
                  if (added.length) toggleWidgetVisibility(added[0]);
                  else if (removed.length) toggleWidgetVisibility(removed[0]);
                }}
                aria-label="Widget visibility"
                orientation="vertical"
              >
                {widgets.map(widget => (
                  <ToggleGroup.Item
                    key={widget.id}
                    value={widget.id}
                    asChild
                    aria-label={`${widget.title} - ${widget.visible ? 'Visible' : 'Hidden'}. Click to ${widget.visible ? 'hide' : 'show'}`}
                  >
                    <WidgetListItem $isVisible={widget.visible} $color={WIDGET_COLORS[widget.type]}>
                      <WidgetListIcon aria-hidden="true">
                        {WIDGET_ICONS[widget.type]}
                      </WidgetListIcon>
                      <WidgetListInfo>
                        <WidgetListName>{widget.title}</WidgetListName>
                        <WidgetListStatus $isVisible={widget.visible}>
                          {widget.visible ? 'Visible' : 'Hidden'}
                        </WidgetListStatus>
                      </WidgetListInfo>
                    </WidgetListItem>
                  </ToggleGroup.Item>
                ))}
              </WidgetToggleGroup>
            </WidgetDrawer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </DashboardContainer>
  );
}
