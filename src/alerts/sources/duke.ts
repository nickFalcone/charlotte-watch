import type { GenericAlert } from '../../types/alerts';
import type { AlertSourceDefinition } from '../registry';
import { fetchDukeOutages } from '../../utils/dukeApi';
import { convertDukeOutagesToGeneric } from '../converters';

export const dukeSource: AlertSourceDefinition = {
  id: 'duke',
  label: 'Duke',
  fetch: async (signal?: AbortSignal): Promise<GenericAlert[]> => {
    const outages = await fetchDukeOutages(signal);
    return convertDukeOutagesToGeneric(outages);
  },
  staleTime: 1000 * 60 * 2, // 2 minutes
};
