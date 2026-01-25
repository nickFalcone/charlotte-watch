import type { GenericAlert } from '../../types/alerts';
import type { AlertSourceDefinition } from '../registry';
import { fetchNCDOTIncidents } from '../../utils/ncdotApi';
import { convertNCDOTIncidentsToGeneric } from '../converters';

export const ncdotSource: AlertSourceDefinition = {
  id: 'ncdot',
  label: 'NCDOT',
  icon: '🚧',
  fetch: async (signal?: AbortSignal): Promise<GenericAlert[]> => {
    const incidents = await fetchNCDOTIncidents(signal);
    return convertNCDOTIncidentsToGeneric(incidents);
  },
  staleTime: 1000 * 60 * 2, // 2 minutes
};
