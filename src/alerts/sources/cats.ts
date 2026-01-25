import type { GenericAlert } from '../../types/alerts';
import type { AlertSourceDefinition } from '../registry';
import { fetchCATSAlerts } from '../../utils/catsApi';
import { convertCATSAlertsToGeneric } from '../converters';

export const catsSource: AlertSourceDefinition = {
  id: 'cats',
  label: 'CATS',
  icon: '🚇',
  fetch: async (signal?: AbortSignal): Promise<GenericAlert[]> => {
    const alerts = await fetchCATSAlerts(signal);
    return convertCATSAlertsToGeneric(alerts);
  },
  staleTime: 1000 * 60 * 2, // 2 minutes
};
