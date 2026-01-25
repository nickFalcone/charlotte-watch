import { useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { WidgetMetadataContext, type WidgetMetadata, type PausedReasonFn } from './context';

export function WidgetMetadataProvider({ children }: { children: ReactNode }) {
  const [metadata, setMetadata] = useState<WidgetMetadata>({ lastUpdated: null });
  const pausedReasonFnRef = useRef<PausedReasonFn | null>(null);

  const setLastUpdated = useCallback((timestamp: number | null) => {
    setMetadata(prev => ({ ...prev, lastUpdated: timestamp }));
  }, []);

  const setPausedReasonFn = useCallback((fn: PausedReasonFn | null) => {
    pausedReasonFnRef.current = fn;
  }, []);

  const getPausedReason = useCallback(() => {
    return pausedReasonFnRef.current?.() ?? null;
  }, []);

  const value = useMemo(
    () => ({ metadata, setLastUpdated, getPausedReason, setPausedReasonFn }),
    [metadata, setLastUpdated, getPausedReason, setPausedReasonFn]
  );

  return <WidgetMetadataContext.Provider value={value}>{children}</WidgetMetadataContext.Provider>;
}
