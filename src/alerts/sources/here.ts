/**
 * HERE Traffic Flow Alert Source
 *
 * Fetches real-time traffic congestion; one alert per road with jam factor > 7.
 *
 * This file is part of the HERE integration feature and can be
 * safely deleted if the feature is removed.
 */

import type { GenericAlert } from '../../types/alerts';
import type { AlertSourceDefinition } from '../registry';
import { fetchAllRoutesFlow } from '../../utils/hereApi';
import { convertHereFlowsToGeneric } from '../converters/here';

export const hereFlowSource: AlertSourceDefinition = {
  id: 'here-flow',
  label: 'Traffic Flow',
  fetch: async (signal?: AbortSignal): Promise<GenericAlert[]> => {
    const flowData = await fetchAllRoutesFlow(signal);
    return convertHereFlowsToGeneric(flowData);
  },
  // 5 minutes - balance between freshness and API quota
  staleTime: 1000 * 60 * 5,
};
