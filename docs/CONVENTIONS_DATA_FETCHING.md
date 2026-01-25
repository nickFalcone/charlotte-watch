# Data Fetching Patterns

## Query Keys

**All query keys must use the centralized factory at `src/utils/queryKeys.ts`.**

```typescript
// ✅ Correct
import { queryKeys } from '../../utils/queryKeys';

useQuery({
  queryKey: queryKeys.weather.current(lat, lng),
  queryFn: () => fetchWeather(lat, lng),
});

// ❌ Never use inline string arrays
useQuery({
  queryKey: ['weather', lat, lng],
  queryFn: () => fetchWeather(lat, lng),
});
```

### Adding New Query Keys

Follow the namespaced pattern in `src/utils/queryKeys.ts`:

```typescript
export const queryKeys = {
  yourDomain: {
    all: () => ['yourDomain', 'all'] as const,
    detail: (id: string) => ['yourDomain', 'detail', id] as const,
  },
} as const;
```

## API Client Pattern

API functions live in `src/utils/*Api.ts` and follow these rules:

1. **Pure functions** — No React hooks, just async functions returning promises
2. **Throw on errors** — Don't catch errors; let TanStack Query handle them
3. **Return typed data** — Use TypeScript interfaces from `src/types/`

```typescript
// src/utils/weatherApi.ts
export async function fetchWeather(location: WeatherLocation): Promise<WeatherData> {
  const response = await fetch(`${API_URL}?lat=${location.lat}&lng=${location.lng}`);
  
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }
  
  return response.json();
}
```

## Parallel Fetching

For independent requests, use `Promise.allSettled()` to fetch in parallel:

```typescript
const results = await Promise.allSettled([
  fetchWeather(location),
  fetchAlerts(location),
  fetchTraffic(location),
]);

// Process results, handling both fulfilled and rejected
```

See `src/alerts/registry.ts` for a complete example.
