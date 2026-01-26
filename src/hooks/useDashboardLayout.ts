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
      // Merge RGL's layout (visible items only) into the full store layout so we
      // never drop hidden items. RGL/allLayouts only contains visible widgets.
      const merged: Layouts = {};

      (Object.keys(layouts) as (keyof Layouts)[]).forEach(breakpoint => {
        const existing = layouts[breakpoint] || [];
        const rglLayout = allLayouts[breakpoint] || [];
        const rglMap = new Map(rglLayout.map(item => [item.i, item]));

        merged[breakpoint] = existing.map(existingItem => {
          const rglItem = rglMap.get(existingItem.i);
          if (rglItem) {
            return {
              ...rglItem,
              minW: existingItem.minW ?? rglItem.minW ?? 1,
              minH: existingItem.minH ?? rglItem.minH ?? 1,
            };
          }
          return existingItem;
        });
      });

      setLayouts(merged);
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
                // Enforce definition minimums only; preserve layout's breakpoint-specific w/h
                const minW = definition.minSize?.w ?? 1;
                const minH = definition.minSize?.h ?? 1;

                return {
                  ...item,
                  static: widgetLockMap.get(item.i) || false,
                  minW,
                  minH,
                  w: Math.max(item.w, minW),
                  h: Math.max(item.h, minH),
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
