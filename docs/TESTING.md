# Testing

Testing conventions and philosophy for the Charlotte Monitor dashboard.

## Quick Reference

```bash
npm test             # Run all tests once
npm run test:watch   # Run tests in watch mode (re-runs on file changes)
```

## Philosophy

Guided by Kent C. Dodds' testing principles:

- **"Write tests. Not too many. Mostly integration."** -- Start with the highest-value tests and grow the suite incrementally.
- **Test behavior, not implementation details.** -- Tests should verify what the code does, not how it does it internally.
- **Think about use cases, not code coverage.** -- Ask "what use cases does this code support?" rather than "which lines are untested?"
- **80/20 rule.** -- Focus testing effort where bugs are most likely and most impactful: data transformation, parsing, and business logic.

### What to Test (Priority Order)

1. **Pure utility functions with complex logic** -- Regex parsing, unit conversions, data transformations, hash computations. These are the most bug-prone and easiest to test.
2. **Data processing pipelines** -- Functions that filter, group, normalize, or consolidate data. Bugs here silently corrupt what users see.
3. **Edge cases in API response handling** -- Missing fields, empty arrays, unexpected formats.
4. **Component behavior** -- User interactions and rendered output, not internal state.

### What NOT to Test

- **Type definitions** -- TypeScript handles this.
- **Simple pass-through functions** -- If a function just calls `fetch()` and returns JSON, the test would just be testing `fetch`.
- **Implementation details** -- Don't test private state, internal method calls, or component re-render counts.
- **Styling** -- Visual appearance is verified manually or with visual regression tools.
- **Constants and configuration** -- Static data that TypeScript already validates.

## Test Framework

- **Vitest** -- Integrated with Vite, fast, compatible with Jest API.
- **happy-dom** -- Lightweight DOM environment for tests that need browser APIs (e.g., `DOMParser`).
- **React Testing Library** -- `@testing-library/react` for rendering components, `@testing-library/user-event` for simulating interactions, `@testing-library/jest-dom` for DOM matchers (loaded automatically via `src/test/setup.ts`).

Configuration is in `vite.config.ts` under the `test` block. The setup file `src/test/setup.ts` registers jest-dom matchers (e.g., `toBeInTheDocument`, `toBeDisabled`) for all tests.

## Conventions

### File Location

Test files are **colocated** with their source files:

```
src/utils/
  flightApi.ts
  flightApi.test.ts      <-- tests live next to source
  hereApi.ts
  hereApi.test.ts
```

### File Naming

- `*.test.ts` for utility/logic tests
- `*.test.tsx` for component tests

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('handles the common case', () => {
    expect(myFunction('input')).toBe('expected');
  });

  it('handles edge case', () => {
    expect(myFunction('')).toBe('fallback');
  });
});
```

Use explicit imports (`describe`, `it`, `expect`) from `vitest` rather than globals.

### Naming Conventions

- `describe` blocks: name of the function or module under test
- `it` blocks: describe the behavior, not the implementation ("converts m/s to knots", not "calls Math.round")

### Test Data

- Build minimal test data inline. Prefer factory functions (e.g., `makeAlert()`) for types with many required fields.
- Use realistic values from actual API responses where possible.
- Avoid sharing mutable state between tests.

## Patterns

### Testing Pure Functions

Most of the initial test suite covers pure functions -- functions with no side effects that return deterministic output for a given input. These are the highest-value, lowest-effort tests.

```typescript
it('converts meters per second to knots', () => {
  expect(formatVelocity(100)).toBe('194 kts');
});
```

### Testing Hash Stability

Hash functions used for cache keys must be deterministic and order-independent:

```typescript
it('produces same hash regardless of input order', () => {
  const hash1 = computeAlertsHash([alert1, alert2]);
  const hash2 = computeAlertsHash([alert2, alert1]);
  expect(hash1).toBe(hash2);
});
```

### Exporting for Testability

Some private functions contain complex logic worth testing directly. These are exported and tested independently when:

- The function has complex regex or parsing logic
- Testing through the public API would require mocking network calls
- The function is a pure utility that could be reused

This is a pragmatic choice, not a blanket policy. Only export functions that genuinely benefit from direct testing.

## Component Testing (React Testing Library)

Follow these principles from Kent C. Dodds:

### Do

- Use `screen` for queries: `screen.getByRole('button', { name: /submit/i })`
- Use `userEvent` over `fireEvent` for realistic interactions
- Query by role, label, or text -- how users find elements
- Use `findBy*` for async elements (not `waitFor` + `getBy*`)
- Assert with `@testing-library/jest-dom` matchers: `expect(button).toBeDisabled()`

### Don't

- Don't use `getByTestId` as a first choice -- prefer accessible queries
- Don't wrap `render()` or `fireEvent` in `act()` -- they handle it internally
- Don't put side effects inside `waitFor` callbacks
- Don't use `container.querySelector()` -- use Testing Library queries
- Don't test internal component state -- test what the user sees
- Don't manually call `cleanup` -- it happens automatically

### Query Priority

1. `getByRole` -- matches how assistive technology sees the page
2. `getByLabelText` -- good for form fields
3. `getByPlaceholderText` -- fallback for unlabeled inputs
4. `getByText` -- for non-interactive elements
5. `getByTestId` -- last resort
