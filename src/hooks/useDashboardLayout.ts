import { useCallback } from 'react';
import type { Layout, Layouts } from 'react-grid-layout';
import { useDashboardStore } from '../stores';
import type { WidgetConfig } from '../types';
import { widgetRegistry } from '../components/widgets';

export function useDashboardLayout() {
  const {
    layouts,
    widgets,
    setLayouts,
    updateLayout,
    toggleWidgetVisibility,
    toggleWidgetLock,
    updateWidgetSettings,
    updateWidgetTitle,
    resetLayout,
    addWidget,
    removeWidget,
  } = useDashboardStore();

  const visibleWidgets = widgets.filter(widget => widget.visible);
  const hiddenWidgets = widgets.filter(widget => !widget.visible);

  const handleLayoutChange = useCallback(
    (_currentLayout: Layout[], allLayouts: Layouts) => {
      // Preserve minW and minH from the original layouts
      const preservedLayouts: Layouts = {};

      Object.entries(allLayouts).forEach(([breakpoint, layout]) => {
        const originalLayout = layouts[breakpoint as keyof Layouts] || [];
        const originalMap = new Map(originalLayout.map(item => [item.i, item]));

        preservedLayouts[breakpoint as keyof Layouts] = layout.map(item => {
          const original = originalMap.get(item.i);
          return {
            ...item,
            minW: original?.minW ?? item.minW ?? 1,
            minH: original?.minH ?? item.minH ?? 1,
          };
        });
      });

      setLayouts(preservedLayouts);
    },
    [layouts, setLayouts]
  );

  const getWidgetById = useCallback(
    (id: string): WidgetConfig | undefined => {
      return widgets.find(widget => widget.id === id);
    },
    [widgets]
  );

  const getVisibleLayouts = useCallback((): Layouts => {
    const visibleIds = new Set(visibleWidgets.map(w => w.id));
    const widgetLockMap = new Map(widgets.map(w => [w.id, w.locked || false]));

    return Object.fromEntries(
      Object.entries(layouts).map(([breakpoint, layout]) => [
        breakpoint,
        layout
          .filter(item => visibleIds.has(item.i))
          .map(item => {
            // Ensure minimum dimensions are respected and prefer default size for newly visible widgets
            const widget = widgets.find(w => w.id === item.i);
            if (widget) {
              const definition = widgetRegistry[widget.type];
              if (definition) {
                // For newly visible widgets, prefer default size over potentially smaller saved sizes
                const preferredW = Math.max(
                  item.w,
                  definition.minSize?.w || definition.defaultSize.w
                );
                const preferredH = Math.max(
                  item.h,
                  definition.minSize?.h || definition.defaultSize.h
                );

                return {
                  ...item,
                  static: widgetLockMap.get(item.i) || false,
                  minW: definition.minSize?.w || definition.defaultSize.w,
                  minH: definition.minSize?.h || definition.defaultSize.h,
                  // Ensure current size meets minimums
                  w: preferredW,
                  h: preferredH,
                };
              }
            }
            return {
              ...item,
              static: widgetLockMap.get(item.i) || false,
            };
          }),
      ])
    ) as Layouts;
  }, [layouts, visibleWidgets, widgets]);

  return {
    layouts,
    widgets,
    visibleWidgets,
    hiddenWidgets,
    setLayouts,
    updateLayout,
    toggleWidgetVisibility,
    toggleWidgetLock,
    updateWidgetSettings,
    updateWidgetTitle,
    resetLayout,
    addWidget,
    removeWidget,
    handleLayoutChange,
    getWidgetById,
    getVisibleLayouts,
  };
}
