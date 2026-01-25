import type { AlertSource, GenericAlert } from '../types/alerts';
import {
  nwsSource,
  faaSource,
  dukeSource,
  ncdotSource,
  catsSource,
  cmpdSource,
  hereFlowSource,
} from './sources';

export interface AlertSourceDefinition {
  id: AlertSource;
  label: string;
  fetch: (signal?: AbortSignal) => Promise<GenericAlert[]>;
  staleTime?: number;
}

export interface AlertSourceStatus {
  success: boolean;
  error?: string;
}

export type AlertSourcesStatus = Record<AlertSource, AlertSourceStatus>;

export interface AlertsResult {
  alerts: GenericAlert[];
  sources: AlertSourcesStatus;
  fetchedAt: Date;
}

// Registry of all alert sources
export const alertSources: AlertSourceDefinition[] = [
  nwsSource,
  faaSource,
  dukeSource,
  ncdotSource,
  catsSource,
  cmpdSource,
  hereFlowSource,
];

// Fetch all alerts from registered sources in parallel
export async function fetchAllAlertsWithStatus(signal?: AbortSignal): Promise<AlertsResult> {
  const alerts: GenericAlert[] = [];
  const sources: Partial<AlertSourcesStatus> = {};

  // Initialize all sources as not successful
  for (const source of alertSources) {
    sources[source.id] = { success: false };
  }

  // Fetch all sources in parallel using Promise.allSettled
  const results = await Promise.allSettled(
    alertSources.map(async source => ({
      sourceId: source.id,
      alerts: await source.fetch(signal),
    }))
  );

  // Process results
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const sourceId = alertSources[i].id;

    if (result.status === 'fulfilled') {
      alerts.push(...result.value.alerts);
      sources[sourceId] = { success: true };
    } else {
      sources[sourceId] = {
        success: false,
        error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
      };
    }
  }

  return {
    alerts,
    sources: sources as AlertSourcesStatus,
    fetchedAt: new Date(),
  };
}
