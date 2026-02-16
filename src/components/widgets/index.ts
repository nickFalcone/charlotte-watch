import { lazy } from 'react';
import type { WidgetDefinition, WidgetType } from '../../types';
import { NewsWidget } from './NewsWidget';
import { WIDGET_COLORS, WIDGET_ICONS } from './constants';

const WeatherWidget = lazy(() =>
  import('./WeatherWidget').then(m => ({ default: m.WeatherWidget }))
);
const FlightTrackerWidget = lazy(() =>
  import('./FlightTrackerWidget').then(m => ({ default: m.FlightTrackerWidget }))
);
const AlertsWidget = lazy(() => import('./AlertsWidget').then(m => ({ default: m.AlertsWidget })));
const StockWidget = lazy(() => import('./StockWidget').then(m => ({ default: m.StockWidget })));

export const widgetRegistry: Record<WidgetType, WidgetDefinition> = {
  weather: {
    type: 'weather',
    component: WeatherWidget,
    defaultTitle: 'Weather',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 2, h: 2 },
    icon: WIDGET_ICONS.weather,
    color: WIDGET_COLORS.weather,
  },
  'flight-tracker': {
    type: 'flight-tracker',
    component: FlightTrackerWidget,
    defaultTitle: 'Flight Tracker',
    defaultSize: { w: 5, h: 5 },
    minSize: { w: 3, h: 4 },
    icon: WIDGET_ICONS['flight-tracker'],
    color: WIDGET_COLORS['flight-tracker'],
  },
  alerts: {
    type: 'alerts',
    component: AlertsWidget,
    defaultTitle: 'Alerts',
    defaultSize: { w: 5, h: 3 },
    minSize: { w: 3, h: 2 },
    icon: WIDGET_ICONS.alerts,
    color: WIDGET_COLORS.alerts,
  },
  stocks: {
    type: 'stocks',
    component: StockWidget,
    defaultTitle: 'CLT Public Companies',
    defaultSize: { w: 5, h: 4 },
    minSize: { w: 3, h: 3 },
    icon: WIDGET_ICONS.stocks,
    color: WIDGET_COLORS.stocks,
  },
  news: {
    type: 'news',
    component: NewsWidget,
    defaultTitle: 'News',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 2 },
    icon: WIDGET_ICONS.news,
    color: WIDGET_COLORS.news,
  },
};

export function getWidgetDefinition(type: WidgetType): WidgetDefinition {
  return widgetRegistry[type];
}
