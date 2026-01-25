# React Conventions

## useEffect Rules

**Avoid `useEffect` in almost all cases.** It's only needed for syncing with external systems.

### 🚨 Requirements

**MANDATORY:** Every `useEffect` MUST have a comment above it explaining:
1. **Why** it's a valid use case (which external system is being synced)
2. **What** the cleanup does (if applicable)
3. **Why** the dependency array is what it is

**No exceptions.** Code reviews will reject any `useEffect` without proper documentation.

**Dependencies:** Always carefully review the dependency array:
- Include ALL values from component scope that are used inside the effect
- Primitives and stable references (from `useCallback`/`useRef`) don't cause issues
- Add inline comments explaining empty `[]` deps or intentional omissions
- ESLint `exhaustive-deps` rule violations must be justified in comments

### ✅ Valid Uses (Rare)
- **Browser APIs** — `IntersectionObserver`, `setInterval`, `addEventListener`, etc.
- **Third-party imperative libraries** — Leaflet map event handlers, D3.js updates
- **Syncing state to context** — ONLY when calling during render would cause infinite loops

```tsx
// ✅ Correct: setInterval (browser API)
// Sync with system clock to update relative timestamps every 10 seconds
useEffect(() => {
  const interval = setInterval(() => forceUpdate(prev => prev + 1), 10000);
  return () => clearInterval(interval);
}, []); // Empty deps: only set up once on mount

// ✅ Correct: IntersectionObserver (browser API)
// Track element visibility to optimize rendering/fetching
useEffect(() => {
  const element = ref.current;
  if (!element) return;
  
  const observer = new IntersectionObserver(([entry]) => {
    setIsIntersecting(entry.isIntersecting);
  });
  
  observer.observe(element);
  return () => observer.unobserve(element);
}, []); // Empty deps: observer setup is stable, ref.current changes don't need new observer

// ✅ Correct: Leaflet map events (third-party library)
// Subscribe to Leaflet map tile errors for retry logic
useEffect(() => {
  const handleTileError = (event) => { /* ... */ };
  map.on('tileerror', handleTileError);
  return () => map.off('tileerror', handleTileError);
}, [map]); // Re-subscribe if map instance changes

// ✅ Correct: Syncing to context (prevents infinite render loops)
// Sync React Query's dataUpdatedAt timestamp to widget metadata context.
// MUST use useEffect - calling setLastUpdated during render causes infinite loops.
useEffect(() => {
  setLastUpdated(dataUpdatedAt || null);
}, [dataUpdatedAt, setLastUpdated]); // Re-run when timestamp or setter changes
```

### ❌ Invalid Uses (Common Mistakes)
- **Fetching data** — Use TanStack Query
- **Deriving state** — Compute during render
- **Syncing stable setters** — Only use useEffect if calling during render causes infinite loops

```tsx
// ❌ Wrong: fetching in useEffect
useEffect(() => {
  fetchItems().then(setData);
}, []);

// ✅ Correct: use TanStack Query
const { data } = useQuery({
  queryKey: queryKeys.items.all(),
  queryFn: fetchItems,
});

// ❌ Wrong: deriving state
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// ✅ Correct: compute during render
const fullName = `${firstName} ${lastName}`;

// ⚠️ IMPORTANT: Context updates
// Calling setState during render can cause infinite loops if it updates context that triggers re-render

// ❌ Wrong: calling context setter during render
const { setLastUpdated } = useWidgetMetadata();
setLastUpdated(dataUpdatedAt || null); // INFINITE LOOP!

// ✅ Correct: use useEffect to break the loop
useEffect(() => {
  setLastUpdated(dataUpdatedAt || null);
}, [dataUpdatedAt, setLastUpdated]);
```

## Conditional Rendering

Use early returns instead of nested ternaries:

```tsx
// ✅ Correct
if (isLoading) return <Spinner />;
if (error) return <ErrorMessage />;
return <Content />;

// ❌ Avoid
{isLoading ? <Spinner /> : error ? <ErrorMessage /> : <Content />}
```

## Context vs Props

Avoid passing props through multiple intermediate components ("prop drilling"). Use React Context for cross-cutting concerns like theme, auth, or widget metadata.

## Performance Hooks

Avoid `useMemo` and `useCallback` by default. Only add them when you've measured a real performance problem. Premature optimization adds complexity.

## Styling

- Use Styled Components (files named `*.styles.ts`)
- Avoid inline styles except for truly dynamic values (e.g., colors from API data)


