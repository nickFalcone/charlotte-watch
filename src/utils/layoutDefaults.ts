import type { Layouts } from 'react-grid-layout';
import type { WidgetConfig } from '../types';

export const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
export const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
export const ROW_HEIGHT = 100;
export const MARGIN: [number, number] = [12, 12];

export const DEFAULT_WIDGET_CONFIGS: WidgetConfig[] = [
  { id: 'weather-1', type: 'weather', title: 'Weather', visible: false },
  { id: 'flights-1', type: 'flight-tracker', title: 'Flight Tracker', visible: false },
  { id: 'alerts-1', type: 'alerts', title: 'Alerts', visible: true },
  { id: 'stocks-1', type: 'stocks', title: 'Stocks', visible: false },
];

export const DEFAULT_LAYOUTS: Layouts = {
  lg: [
    { i: 'weather-1', x: 0, y: 5, w: 12, h: 5, minW: 2, minH: 2 },
    { i: 'flights-1', x: 4, y: 0, w: 4, h: 5, minW: 5, minH: 5 },
    { i: 'alerts-1', x: 0, y: 0, w: 4, h: 5, minW: 4, minH: 2 },
    { i: 'stocks-1', x: 8, y: 0, w: 4, h: 5, minW: 3, minH: 3 },
  ],
  md: [
    { i: 'weather-1', x: 0, y: 4, w: 5, h: 4, minW: 2, minH: 2 },
    { i: 'flights-1', x: 5, y: 0, w: 5, h: 4, minW: 5, minH: 5 },
    { i: 'alerts-1', x: 0, y: 0, w: 5, h: 4, minW: 4, minH: 2 },
    { i: 'stocks-1', x: 5, y: 4, w: 5, h: 4, minW: 3, minH: 3 },
  ],
  sm: [
    { i: 'weather-1', x: 0, y: 4, w: 3, h: 3, minW: 2, minH: 2 },
    { i: 'flights-1', x: 0, y: 7, w: 6, h: 4, minW: 4, minH: 4 },
    { i: 'alerts-1', x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 2 },
    { i: 'stocks-1', x: 3, y: 4, w: 3, h: 3, minW: 3, minH: 3 },
  ],
  xs: [
    { i: 'weather-1', x: 0, y: 4, w: 4, h: 4, minW: 2, minH: 2 },
    { i: 'flights-1', x: 0, y: 8, w: 4, h: 5, minW: 3, minH: 3 },
    { i: 'alerts-1', x: 0, y: 0, w: 4, h: 4, minW: 4, minH: 2 },
    { i: 'stocks-1', x: 0, y: 13, w: 4, h: 4, minW: 3, minH: 3 },
  ],
  xxs: [
    { i: 'weather-1', x: 0, y: 3, w: 2, h: 3, minW: 2, minH: 2 },
    { i: 'flights-1', x: 0, y: 6, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'alerts-1', x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
    { i: 'stocks-1', x: 0, y: 10, w: 3, h: 4, minW: 2, minH: 2 },
  ],
};
