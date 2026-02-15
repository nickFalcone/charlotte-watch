import { useMemo } from 'react';
import { useTheme } from 'styled-components';
import { getAlertSeverityConfig } from '../types/alerts';

export function useAlertSeverityConfig() {
  const theme = useTheme();
  return useMemo(() => getAlertSeverityConfig(theme), [theme]);
}
