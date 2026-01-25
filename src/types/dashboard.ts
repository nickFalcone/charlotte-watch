import type { Layout, Layouts } from 'react-grid-layout';
import type { WidgetConfig } from './widget';
import type { AlertSource } from './alerts';

export interface DashboardState {
  layouts: Layouts;
  widgets: WidgetConfig[];
  /** Sources hidden from alerts view. Empty = all visible. Stored as negative list so new sources are visible by default. */
  hiddenAlertSources: AlertSource[];
}

export interface DashboardStore extends DashboardState {
  setLayouts: (layouts: Layouts) => void;
  updateLayout: (breakpoint: string, layout: Layout[]) => void;
  toggleWidgetVisibility: (widgetId: string) => void;
  toggleWidgetLock: (widgetId: string) => void;
  updateWidgetSettings: (widgetId: string, settings: Record<string, unknown>) => void;
  updateWidgetTitle: (widgetId: string, title: string) => void;
  resetLayout: () => void;
  addWidget: (widget: WidgetConfig) => void;
  removeWidget: (widgetId: string) => void;
  setHiddenAlertSources: (sources: AlertSource[]) => void;
  toggleAlertSource: (source: AlertSource) => void;
  showAllAlertSources: () => void;
}

export type Breakpoint = 'lg' | 'md' | 'sm' | 'xs' | 'xxs';

export interface BreakpointConfig {
  breakpoint: Breakpoint;
  cols: number;
  width: number;
}
