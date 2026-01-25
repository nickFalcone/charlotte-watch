import type { GenericAlert } from '../../types/alerts';
import type { AlertSourceDefinition } from '../registry';
import { fetchCMPDTrafficEvents } from '../../utils/cmpdApi';
import { convertCMPDEventsToGeneric } from '../converters';

export const cmpdSource: AlertSourceDefinition = {
  id: 'cmpd',
  label: 'CMPD',
  fetch: async (signal?: AbortSignal): Promise<GenericAlert[]> => {
    const events = await fetchCMPDTrafficEvents(signal);
    return convertCMPDEventsToGeneric(events);
  },
  staleTime: 1000 * 60 * 2, // 2 minutes
};
