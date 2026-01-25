import { useContext } from 'react';
import { WidgetMetadataContext } from './context';

export function useWidgetMetadata() {
  const context = useContext(WidgetMetadataContext);
  if (!context) {
    throw new Error('useWidgetMetadata must be used within a WidgetMetadataProvider');
  }
  return context;
}

export function useWidgetMetadataValue() {
  const context = useContext(WidgetMetadataContext);
  return {
    lastUpdated: context?.metadata.lastUpdated ?? null,
    getPausedReason: context?.getPausedReason ?? (() => null),
  };
}
