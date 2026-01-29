import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Layout, Layouts } from 'react-grid-layout';
import type { DashboardStore, WidgetConfig } from '../types';
import type { AlertSource } from '../types/alerts';
import { DEFAULT_LAYOUTS, DEFAULT_WIDGET_CONFIGS } from '../utils/layoutDefaults';
import { widgetRegistry } from '../components/widgets';

export const useDashboardStore = create<DashboardStore>()(
  persist(
    set => ({
      layouts: DEFAULT_LAYOUTS,
      widgets: DEFAULT_WIDGET_CONFIGS,
      hiddenAlertSources: [],

      setLayouts: (layouts: Layouts) => set({ layouts }),

      updateLayout: (breakpoint: string, layout: Layout[]) =>
        set(state => ({
          layouts: {
            ...state.layouts,
            [breakpoint]: layout,
          },
        })),

      toggleWidgetVisibility: (widgetId: string) =>
        set(state => {
          const widget = state.widgets.find(w => w.id === widgetId);
          if (!widget) return state;

          const newVisibility = !widget.visible;

          // If making widget visible, ensure it has proper default dimensions
          let newLayouts = state.layouts;
          if (newVisibility) {
            const definition = widgetRegistry[widget.type];
            if (definition) {
              newLayouts = { ...state.layouts };
              (Object.keys(state.layouts) as (keyof typeof state.layouts)[]).forEach(breakpoint => {
                const prev = state.layouts[breakpoint] || [];
                const itemIndex = prev.findIndex(item => item.i === widgetId);
                const minW = definition.minSize?.w ?? 1;
                const minH = definition.minSize?.h ?? 1;

                const next =
                  itemIndex >= 0
                    ? prev.map((it, i) =>
                        i !== itemIndex
                          ? it
                          : {
                              ...it,
                              w: Math.max(it.w, minW),
                              h: Math.max(it.h, minH),
                              minW,
                              minH,
                            }
                      )
                    : [
                        ...prev,
                        {
                          i: widgetId,
                          x: 0,
                          y: prev.length > 0 ? Math.max(...prev.map(item => item.y + item.h)) : 0,
                          w: definition.defaultSize.w,
                          h: definition.defaultSize.h,
                          minW,
                          minH,
                        },
                      ];

                newLayouts[breakpoint] = next;
              });
            }
          }

          return {
            widgets: state.widgets.map(w =>
              w.id === widgetId ? { ...w, visible: newVisibility } : w
            ),
            layouts: newLayouts,
          };
        }),

      toggleWidgetLock: (widgetId: string) =>
        set(state => ({
          widgets: state.widgets.map(widget =>
            widget.id === widgetId ? { ...widget, locked: !widget.locked } : widget
          ),
        })),

      updateWidgetSettings: (widgetId: string, settings: Record<string, unknown>) =>
        set(state => ({
          widgets: state.widgets.map(widget =>
            widget.id === widgetId
              ? { ...widget, settings: { ...widget.settings, ...settings } }
              : widget
          ),
        })),

      updateWidgetTitle: (widgetId: string, title: string) =>
        set(state => ({
          widgets: state.widgets.map(widget =>
            widget.id === widgetId ? { ...widget, title } : widget
          ),
        })),

      resetLayout: () =>
        set({
          layouts: DEFAULT_LAYOUTS,
          widgets: DEFAULT_WIDGET_CONFIGS,
        }),

      addWidget: (widget: WidgetConfig) =>
        set(state => {
          const definition = widgetRegistry[widget.type];
          if (!definition) {
            console.error(`No definition found for widget type: ${widget.type}`);
            return state;
          }

          const newLayouts: Layouts = { ...state.layouts };

          // Add the widget to each breakpoint layout with proper dimensions
          Object.keys(DEFAULT_LAYOUTS).forEach(breakpoint => {
            const existingLayout = newLayouts[breakpoint as keyof Layouts] || [];

            // Simple positioning: add to the end of the layout
            const x = 0;
            let y = 0;

            if (existingLayout.length > 0) {
              // Place at the bottom of the existing layout
              const maxY = Math.max(...existingLayout.map(item => item.y + item.h));
              y = maxY;
            }

            newLayouts[breakpoint as keyof Layouts] = [
              ...existingLayout,
              {
                i: widget.id,
                x,
                y,
                w: definition.defaultSize.w,
                h: definition.defaultSize.h,
                minW: definition.minSize?.w || definition.defaultSize.w,
                minH: definition.minSize?.h || definition.defaultSize.h,
              },
            ];
          });

          return {
            widgets: [...state.widgets, widget],
            layouts: newLayouts,
          };
        }),

      removeWidget: (widgetId: string) =>
        set(state => ({
          widgets: state.widgets.filter(widget => widget.id !== widgetId),
          layouts: Object.fromEntries(
            Object.entries(state.layouts).map(([breakpoint, layout]) => [
              breakpoint,
              layout.filter(item => item.i !== widgetId),
            ])
          ) as Layouts,
        })),

      setHiddenAlertSources: (sources: AlertSource[]) => set({ hiddenAlertSources: sources }),

      toggleAlertSource: (source: AlertSource) =>
        set(state => {
          const isHidden = state.hiddenAlertSources.includes(source);
          if (isHidden) {
            return { hiddenAlertSources: state.hiddenAlertSources.filter(s => s !== source) };
          }
          return { hiddenAlertSources: [...state.hiddenAlertSources, source] };
        }),

      showAllAlertSources: () => set({ hiddenAlertSources: [] }),
    }),
    {
      name: 'charlotte-dashboard-storage',
      version: 4,
      migrate: (persisted: unknown, fromVersion: number) => {
        if (fromVersion < 3 && persisted != null && typeof persisted === 'object') {
          const p = persisted as Record<string, unknown>;
          return {
            ...p,
            layouts: DEFAULT_LAYOUTS,
            widgets: DEFAULT_WIDGET_CONFIGS,
          };
        }
        if (fromVersion < 4 && persisted != null && typeof persisted === 'object') {
          // Version 3 -> 4: Added 'news' widget. Reset to defaults to include it.
          const p = persisted as Record<string, unknown>;
          return {
            ...p,
            layouts: DEFAULT_LAYOUTS,
            widgets: DEFAULT_WIDGET_CONFIGS,
          };
        }
        return persisted as Record<string, unknown>;
      },
    }
  )
);
