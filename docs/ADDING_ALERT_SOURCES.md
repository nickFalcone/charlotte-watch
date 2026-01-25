# Adding New Alert Sources

With the new alert source registry system, adding a new alert source is straightforward and requires minimal changes.

## Quick Start

### 1. Create Source File

Create a new file in `src/alerts/sources/yourSource.ts`:

```typescript
import type { GenericAlert } from '../../types/alerts';
import type { AlertSourceDefinition } from '../registry';
import { fetchYourData } from '../../utils/yourApi';
import { convertYourDataToGeneric } from '../../utils/alertsApi';

export const yourSource: AlertSourceDefinition = {
  id: 'yourSource', // Must match AlertSource type
  label: 'Your Source',
  icon: '🔔', // Pick an appropriate emoji
  fetch: async (): Promise<GenericAlert[]> => {
    const data = await fetchYourData();
    return convertYourDataToGeneric(data);
  },
  staleTime: 1000 * 60 * 2, // 2 minutes (adjust as needed)
};
```

### 2. Register Source

Add your source to `src/alerts/sources/index.ts`:

```typescript
export { yourSource } from './yourSource';
```

Add your source to `src/alerts/registry.ts`:

```typescript
import { nwsSource, faaSource, ..., yourSource } from './sources';

export const alertSources: AlertSourceDefinition[] = [
  nwsSource,
  faaSource,
  // ... other sources
  yourSource, // Add here
];
```

### 3. Update Types

Add your source to the `AlertSource` union type in `src/types/alerts.ts`:

```typescript
export type AlertSource = 
  | 'nws' 
  | 'faa' 
  | 'duke' 
  | 'ncdot' 
  | 'cats' 
  | 'cmpd' 
  | 'yourSource'; // Add here
```

Update the icon mapping:

```typescript
export const ALERT_SOURCE_ICONS: Record<AlertSource, string> = {
  nws: '🌤️',
  faa: '✈️',
  // ... other icons
  yourSource: '🔔', // Add here
};
```

### 4. Implement Data Conversion

Create a conversion function in `src/utils/alertsApi.ts`:

```typescript
// Define your source data type
interface YourSourceData {
  id: string;
  message: string;
  severity: string;
  // ... other fields
}

// Converter function
export function convertYourDataToGeneric(data: YourSourceData[]): GenericAlert[] {
  return data.map(item => ({
    id: `yourSource-${item.id}`,
    source: 'yourSource',
    category: 'other', // Choose appropriate category
    severity: mapYourSeverity(item.severity), // Implement mapper
    title: item.message,
    summary: item.message,
    updatedAt: new Date(),
    // ... map other fields
  }));
}
```

**CSP:** If your source's API is called directly by the client (not via a Pages Function), the origin must be in `connect-src` in `public/_headers`. **Ask the user before editing** `public/_headers`. See [CSP and security headers](./CSP_AND_HEADERS.md).

The UI will automatically:
- Display your source's status indicator
- Show alerts from your source
- Handle errors gracefully
- Fetch in parallel with other sources

## Architecture Benefits

Adding a source requires:
1. Create `src/alerts/sources/yourSource.ts`
2. Add to registry array
3. Update AlertSource union type
4. Add icon mapping

## Source Structure Best Practices

### Keep Sources Independent
Each source should:
- Be self-contained in its own file
- Handle its own data fetching
- Convert to GenericAlert format
- Not depend on other sources

### Use Deterministic IDs
Alert IDs should be stable across fetches:

```typescript
// ✅ Good - deterministic ID
id: `yourSource-${item.uniqueId}`

// ❌ Bad - changes every fetch
id: `yourSource-${Date.now()}`
```

### Handle Errors Gracefully
The registry handles errors automatically, but your fetch function should:
- Throw meaningful errors
- Not catch errors unless recovering
- Include context in error messages

```typescript
fetch: async () => {
  try {
    const response = await fetchYourData();
    if (!response.ok) {
      throw new Error(`Your API error: ${response.status}`);
    }
    return convertYourDataToGeneric(response.data);
  } catch (error) {
    // Let the error bubble up - registry will handle it
    throw error;
  }
}
```

### Choose Appropriate staleTime
- High-frequency updates (traffic, incidents): `1000 * 60 * 1` (1 min)
- Medium-frequency (weather, transit): `1000 * 60 * 2` (2 min)
- Low-frequency (power outages): `1000 * 60 * 5` (5 min)

## Testing Your Source

1. **TypeScript compilation**: `npm run build`
2. **Dev server**: `npm run dev`
3. **Check browser console** for fetch errors
4. **Verify UI**:
   - Status indicator shows correctly
   - Alerts display in the list
   - Modal opens with full details
   - Refetch maintains modal state

## Example: Real CMPD Source

See `src/alerts/sources/cmpd.ts` for a complete real-world example:

```typescript
export const cmpdSource: AlertSourceDefinition = {
  id: 'cmpd',
  label: 'CMPD',
  icon: '🚔',
  fetch: async (): Promise<GenericAlert[]> => {
    const events = await fetchCMPDTrafficEvents();
    return convertCMPDEventsToGeneric(events);
  },
  staleTime: 1000 * 60 * 2,
};
```
