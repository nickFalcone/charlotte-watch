import type { WidgetType } from '../../types';

// Widget colors and icons - defined separately to avoid circular dependencies
export const WIDGET_COLORS: Record<WidgetType, string> = {
  weather: '#3b82f6',
  'flight-tracker': '#8b5cf6',
  alerts: '#f59e0b',
  stocks: '#22c55e',
};

export const WIDGET_ICONS: Record<WidgetType, string> = {
  weather: '🌤️',
  'flight-tracker': '✈️',
  alerts: '🔔',
  stocks: '📈',
};
