# Widget Development Guide

Widgets are self-contained dashboard components in `src/components/widgets/`.

## Creating a New Widget

1. Create `src/components/widgets/YourWidget.tsx`
2. Create `src/components/widgets/YourWidget.styles.ts` (if needed)
3. Export from `src/components/widgets/index.ts`
4. Create API client in `src/utils/yourApi.ts`
5. Add query key to `src/utils/queryKeys.ts`
6. Add to dashboard in `src/components/Dashboard/Dashboard.tsx`
7. **CSP:** If the widget loads from a new external origin (API, image/tile host, or script), add it to `public/_headers`. **Ask the user before editing** `public/_headers`. See [CSP and security headers](./CSP_AND_HEADERS.md).

## Widget Template

```tsx
import { useQuery } from '@tanstack/react-query';
import type { WidgetProps } from '../../types';
import { useWidgetMetadata } from '../Widget';
import { queryKeys } from '../../utils/queryKeys';
import { fetchYourData } from '../../utils/yourApi';

export function YourWidget(_props: WidgetProps) {
  const { setLastUpdated } = useWidgetMetadata();

  const { data, isLoading, isError, error, dataUpdatedAt } = useQuery({
    queryKey: queryKeys.yourDomain.all(),
    queryFn: fetchYourData,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10, // 10 minutes
  });

  // Sync timestamp to widget header (setLastUpdated is memoized, safe to call during render)
  setLastUpdated(dataUpdatedAt || null);

  // Handle states
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} />;
  if (!data) return <EmptyState />;

  return <YourContent data={data} />;
}
```

## Widget Requirements

- **Accept `WidgetProps`** — Standard interface for all widgets
- **Use `useWidgetMetadata()`** — Provides `setLastUpdated` for the timestamp display
- **Handle all states** — Loading, error, and empty states must be handled
- **Use visibility observer** — For expensive widgets, use `useIntersectionObserver()` to pause when off-screen

## Visibility-Based Loading

For widgets that poll frequently (like flight tracker), pause when not visible:

```tsx
const containerRef = useRef<HTMLDivElement>(null);
const isVisible = useIntersectionObserver(containerRef, { threshold: 0.1 });

const { data } = useQuery({
  queryKey: queryKeys.flight.aircraft(airport),
  queryFn: () => fetchAircraft(airport),
  refetchInterval: isVisible ? 15000 : false, // Only poll when visible
  enabled: isVisible,
});
```
