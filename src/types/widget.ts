import type { ComponentType } from 'react';

export type WidgetType = 'weather' | 'flight-tracker' | 'alerts' | 'stocks' | 'news';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  visible: boolean;
  locked?: boolean;
  settings?: Record<string, unknown>;
}

export interface WidgetProps {
  config: WidgetConfig;
  onSettingsChange?: (settings: Record<string, unknown>) => void;
}

export interface WidgetDefinition {
  type: WidgetType;
  component: ComponentType<WidgetProps>;
  defaultTitle: string;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  icon: string;
  color: string;
}
