import type { GenericAlert } from '../../types/alerts';
import type { AlertSourceDefinition } from '../registry';
import { fetchFAAStatus } from '../../utils/flightApi';
import { convertFAAStatusToAlerts } from '../../utils/flightApi';
import { KCLT_AIRPORT } from '../../types/flight';

export const faaSource: AlertSourceDefinition = {
  id: 'faa',
  label: 'FAA',
  icon: '✈️',
  fetch: async (signal?: AbortSignal): Promise<GenericAlert[]> => {
    const status = await fetchFAAStatus(signal);
    return convertFAAStatusToAlerts(status, KCLT_AIRPORT.code);
  },
  staleTime: 1000 * 60 * 2, // 2 minutes
};
