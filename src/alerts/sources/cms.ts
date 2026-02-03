import type { GenericAlert } from '../../types/alerts';
import type { AlertSourceDefinition } from '../registry';
import { fetchCMSTwitter } from '../../utils/cmsApi';
import { convertCMSTweetsToGeneric } from '../converters';

export const cmsSource: AlertSourceDefinition = {
  id: 'cms',
  label: 'CMS',
  fetch: async (signal?: AbortSignal): Promise<GenericAlert[]> => {
    const tweets = await fetchCMSTwitter(signal);
    return convertCMSTweetsToGeneric(tweets);
  },
  staleTime: 1000 * 60 * 2, // 2 minutes
};
