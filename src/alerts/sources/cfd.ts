import type { GenericAlert } from '../../types/alerts';
import type { AlertSourceDefinition } from '../registry';
import { fetchCFDTwitter } from '../../utils/cfdApi';
import { convertCFDTweetsToGeneric } from '../converters';

export const cfdSource: AlertSourceDefinition = {
  id: 'cfd',
  label: 'CFD',
  fetch: async (signal?: AbortSignal): Promise<GenericAlert[]> => {
    const tweets = await fetchCFDTwitter(signal);
    return convertCFDTweetsToGeneric(tweets);
  },
  staleTime: 1000 * 60 * 2, // 2 minutes
};
