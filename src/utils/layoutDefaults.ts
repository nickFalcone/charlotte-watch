import type { Layouts } from 'react-grid-layout';
import type { WidgetConfig } from '../types';

export const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
export const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
export const ROW_HEIGHT = 100;
export const MARGIN: [number, number] = [12, 12];

export const DEFAULT_WIDGET_CONFIGS: WidgetConfig[] = [
  { id: 'alerts-1', type: 'alerts', title: 'Alerts', visible: false }, // testing revert
  { id: 'news-1', type: 'news', title: 'News', visible: true },
  { id: 'flights-1', type: 'flight-tracker', title: 'Flight Tracker', visible: false },
  { id: 'stocks-1', type: 'stocks', title: 'Stocks', visible: false },
  { id: 'weather-1', type: 'weather', title: 'Weather', visible: false },
];

export const DEFAULT_LAYOUTS: Layouts = {
  lg: [
    { i: 'alerts-1', x: 0, y: 0, w: 4, h: 5, minW: 4, minH: 2 },
    { i: 'news-1', x: 4, y: 0, w: 4, h: 5, minW: 3, minH: 2 },
    { i: 'flights-1', x: 8, y: 0, w: 4, h: 5, minW: 5, minH: 5 },
    { i: 'stocks-1', x: 0, y: 5, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'weather-1', x: 6, y: 5, w: 6, h: 5, minW: 2, minH: 2 },
  ],
  md: [
    { i: 'alerts-1', x: 0, y: 0, w: 5, h: 4, minW: 4, minH: 2 },
    { i: 'news-1', x: 5, y: 0, w: 5, h: 4, minW: 3, minH: 2 },
    { i: 'flights-1', x: 0, y: 4, w: 5, h: 5, minW: 5, minH: 5 },
    { i: 'stocks-1', x: 5, y: 4, w: 5, h: 4, minW: 3, minH: 3 },
    { i: 'weather-1', x: 0, y: 9, w: 10, h: 4, minW: 2, minH: 2 },
  ],
  sm: [
    { i: 'alerts-1', x: 0, y: 0, w: 3, h: 4, minW: 3, minH: 2 },
    { i: 'news-1', x: 3, y: 0, w: 3, h: 4, minW: 3, minH: 2 },
    { i: 'flights-1', x: 0, y: 4, w: 6, h: 5, minW: 3, minH: 4 },
    { i: 'stocks-1', x: 0, y: 9, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'weather-1', x: 0, y: 13, w: 6, h: 4, minW: 2, minH: 2 },
  ],
  xs: [
    { i: 'alerts-1', x: 0, y: 0, w: 4, h: 6, minW: 4, minH: 4 },
    { i: 'news-1', x: 0, y: 6, w: 4, h: 6, minW: 3, minH: 4 },
    { i: 'flights-1', x: 0, y: 12, w: 4, h: 6, minW: 3, minH: 4 },
    { i: 'stocks-1', x: 0, y: 18, w: 4, h: 6, minW: 3, minH: 4 },
    { i: 'weather-1', x: 0, y: 24, w: 4, h: 6, minW: 2, minH: 4 },
  ],
  xxs: [
    { i: 'alerts-1', x: 0, y: 0, w: 2, h: 6, minW: 2, minH: 4 },
    { i: 'news-1', x: 0, y: 6, w: 2, h: 6, minW: 2, minH: 4 },
    { i: 'flights-1', x: 0, y: 12, w: 2, h: 6, minW: 2, minH: 4 },
    { i: 'stocks-1', x: 0, y: 18, w: 2, h: 6, minW: 2, minH: 4 },
    { i: 'weather-1', x: 0, y: 24, w: 2, h: 6, minW: 2, minH: 4 },
  ],
};
