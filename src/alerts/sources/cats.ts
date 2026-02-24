import type { GenericAlert } from '../../types/alerts';
import type { AlertSourceDefinition } from '../registry';
import { fetchCATSTwitter } from '../../utils/catsApi';
import { convertCATSTweetsToGeneric } from '../converters';

export const catsSource: AlertSourceDefinition = {
  id: 'cats',
  label: 'CATS',
  fetch: async (signal?: AbortSignal): Promise<GenericAlert[]> => {
    const tweets = await fetchCATSTwitter(signal);
    return convertCATSTweetsToGeneric(tweets);
  },
  staleTime: 1000 * 60 * 2, // 2 minutes
};
