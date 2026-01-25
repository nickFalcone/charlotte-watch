import type { GenericAlert } from '../../types/alerts';
import type { AlertSourceDefinition } from '../registry';
import { fetchAlertsForLocation, DEFAULT_LOCATION } from '../../utils/weatherApi';
import { convertNWSAlertsToGeneric } from '../converters';

export const nwsSource: AlertSourceDefinition = {
  id: 'nws',
  label: 'NWS',
  fetch: async (signal?: AbortSignal): Promise<GenericAlert[]> => {
    const response = await fetchAlertsForLocation(DEFAULT_LOCATION, signal);
    return convertNWSAlertsToGeneric(response);
  },
  staleTime: 1000 * 60 * 2, // 2 minutes
};
