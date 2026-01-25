import { createContext } from 'react';

export interface WidgetMetadata {
  lastUpdated: number | null;
}

export type PausedReasonFn = () => string | null;

export interface WidgetMetadataContextValue {
  metadata: WidgetMetadata;
  setLastUpdated: (timestamp: number | null) => void;
  getPausedReason: () => string | null;
  setPausedReasonFn: (fn: PausedReasonFn | null) => void;
}

export const WidgetMetadataContext = createContext<WidgetMetadataContextValue | null>(null);
