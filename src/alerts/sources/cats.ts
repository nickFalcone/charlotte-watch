import type { GenericAlert } from '../../types/alerts';
import type { AlertSourceDefinition } from '../registry';
import { fetchCATSAlerts, fetchCATSTwitter } from '../../utils/catsApi';
import { convertCATSAlertsToGeneric, convertCATSTweetsToGeneric } from '../converters';

export const catsSource: AlertSourceDefinition = {
  id: 'cats',
  label: 'CATS',
  fetch: async (signal?: AbortSignal): Promise<GenericAlert[]> => {
    const [gtfsAlerts, tweets] = await Promise.all([
      fetchCATSAlerts(signal),
      fetchCATSTwitter(signal),
    ]);
    const fromGtfs = convertCATSAlertsToGeneric(gtfsAlerts);
    const fromTwitter = convertCATSTweetsToGeneric(tweets);
    return [...fromGtfs, ...fromTwitter];
  },
  staleTime: 1000 * 60 * 2, // 2 minutes
};
