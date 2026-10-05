import type { WidgetType } from '../../types';
import alertsIcon from '../../assets/icons/alerts.svg';
import catsIcon from '../../assets/icons/cats.svg';
import hurricaneIcon from '../../assets/icons/hurricane.svg';
import newsIcon from '../../assets/icons/news.svg';
import stocksIcon from '../../assets/icons/stocks.svg';

// Widget colors and icons - defined separately to avoid circular dependencies
export const WIDGET_COLORS: Record<WidgetType, string> = {
  weather: '#3b82f6',
  alerts: '#f59e0b',
  stocks: '#22c55e',
  news: '#6366f1',
  transit: '#0168b3',
};

export const WIDGET_ICONS: Record<WidgetType, string> = {
  weather: hurricaneIcon,
  alerts: alertsIcon,
  stocks: stocksIcon,
  news: newsIcon,
  transit: catsIcon,
};
