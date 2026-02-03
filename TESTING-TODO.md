# Testing TODO

High-value testing opportunities for the Charlotte Monitor dashboard, prioritized by criticality and complexity.

**Current Test Coverage: 18%** (4 files with tests, 18 files without)

---

## Critical Priority - Alert Converters (Complex Business Logic)

### 1. CMPD Traffic Converter
**File:** `src/alerts/converters/cmpd.ts`

**Why it matters:** Time-sensitive filtering logic with different thresholds for event types

**Key logic to test:**
- `shouldFilterEvent()` - Filters property-damage accidents and old events
  - Property damage only: exclude after 3 hours
  - Injury/fatality: exclude after 12 hours
  - Edge cases: null dates, invalid dates, missing fields
- `convertCMPDEventToGeneric()` - Transforms raw CMPD data
  - Severity mapping (injury/fatality → critical, crash → moderate, traffic stop → minor)
  - Location parsing and formatting
  - Instruction generation from event type
  - Time formatting with fallbacks
- `convertCMPDEventsToGeneric()` - Batch conversion with filtering

**Test scenarios:**
- Recent property damage event (< 3h) - should include
- Old property damage event (> 3h) - should exclude
- Recent injury event (< 12h) - should include
- Old injury event (> 12h) - should exclude
- Event with invalid/null date - should exclude
- Multiple event types and severity levels
- Missing optional fields (instructions, location)

---

### 2. NCDOT Incidents Converter
**File:** `src/alerts/converters/ncdot.ts`

**Why it matters:** Most complex converter with nighttime-aware filtering, consolidation, and WKT parsing

**Key logic to test:**
- `shouldFilterIncident()` - Nighttime-aware filtering with lane closure thresholds
  - Daytime (6am-10pm): > 50% lanes closed
  - Nighttime (10pm-6am): > 66% lanes closed
  - Test across different hours and lane closure percentages
- `parseNCDOTPolyline()` - WKT LINESTRING parsing
  - Valid LINESTRING format
  - Invalid format handling (returns empty array)
  - NaN-safe coordinate parsing
- `convertNCDOTIncidentToGeneric()` - Data transformation
  - Handles consolidated incidents (multiple IDs)
  - Lane closure formatting
  - Detour information
  - End time formatting
- Consolidation logic (complex, partially tested)
  - Grouping by road, direction, project number
  - Mile marker range calculations
  - Time range merging

**Test scenarios:**
- Daytime incident with 60% lanes closed - should include
- Daytime incident with 40% lanes closed - should exclude
- Nighttime incident with 70% lanes closed - should include
- Nighttime incident with 60% lanes closed - should exclude
- Valid WKT LINESTRING parsing
- Invalid WKT format handling
- Consolidated incident with multiple IDs
- Single incident (not consolidated)

---

### 3. HERE Traffic Flow Converter
**File:** `src/alerts/converters/here.ts`

**Why it matters:** Math-heavy operations with NaN-safe wrappers, congestion calculations

**Key logic to test:**
- `num()` - NaN/Infinity safety wrapper
  - Valid numbers pass through
  - NaN returns 0
  - Infinity returns 0
- `getCongestionDescription()` - Speed and jam factor calculation
  - High jam factor (JF ≥ 8) → "Stop and go"
  - Medium jam factor (JF ≥ 4) → "Slow moving"
  - Low jam factor → "Heavy traffic"
  - Speed difference percentage calculation
- `getCongestionSummary()` - Summary text generation
- `convertHereFlowToGeneric()` - Threshold checking
  - >= 90% congestion → include
  - < 90% congestion → exclude
- `convertHereFlowsToGeneric()` - Sorting by segment count

**Test scenarios:**
- High congestion (>= 90%) - should include
- Medium congestion (< 90%) - should exclude
- Various jam factor levels (0, 4, 8, 10)
- NaN/Infinity in speed values
- Multiple flows sorted by segment count
- Empty flows array

---

## High Priority - Text Parsing & Data Transformation

### 4. NWS Alert Converter
**File:** `src/alerts/converters/nws.ts`

**Key logic to test:**
- `isNoaaRadioMaintenanceAlert()` - Regex pattern matching
  - "noaa weather radio" + ("transmitter"|"broadcasting") + ("off the air"|"maintenance"|"out of service")
  - True positives: maintenance announcements
  - False negatives: actual weather alerts mentioning NOAA
- `convertNWSAlertToGeneric()` - Data transformation
  - Area name extraction
  - Severity mapping
  - Time parsing

**Test scenarios:**
- NOAA transmitter maintenance alert - should filter out
- Weather alert mentioning NOAA - should keep
- Various area name formats
- Missing optional fields

---

### 5. CATS Transit Converter
**File:** `src/alerts/converters/cats.ts`

**Key logic to test:**
- `severityFromTweetText()` - Text analysis for severity
  - "suspend", "no service", "suspended" → critical
  - "detour", "delay", "road closed" → moderate
  - Default → minor
- `convertCATSAlertToGeneric()` - GTFS alert conversion
  - LYNX route filtering
  - Effect/cause text translation
  - Active period parsing
- `convertCATSTweetToGeneric()` - Twitter conversion
  - Emoji stripping
  - Title truncation (80 chars)
  - Twitter URL generation

**Test scenarios:**
- Critical severity keywords
- Moderate severity keywords
- Minor/default severity
- LYNX route filtering (routes 901, 902)
- Emoji stripping in tweet text
- Long tweet title truncation

---

### 6. NCDOT API Consolidation (Partially Tested)
**File:** `src/utils/ncdotApi.ts`

**Additional tests needed:**
- `consolidateSimilarIncidents()` - Complex grouping logic
  - Incidents with same project number
  - Incidents with same location/type but no project number
  - Time range merging (earliest start, latest end)
  - Mile marker range expansion
  - Lane closure maximums
- `getConsolidationKey()` - Key generation
  - Construction with project number
  - Maintenance without project number
  - Regular incidents with date

**Test scenarios:**
- Multiple incidents same project → single consolidated alert
- Incidents same location/type → consolidated
- Unrelated incidents → remain separate
- Mile marker range calculation
- Time range merging

---

### 7. CMPD API Transformation
**File:** `src/utils/cmpdApi.ts`

**Key logic to test:**
- `normalizeEvent()` - PascalCase to camelCase conversion
  - Handles EventNo, EventId, EventDateTime, etc.
  - Fallbacks when camelCase fields missing
- `extractEventArray()` - Handles 5 API response formats
  - Direct array: `[{...}, {...}]`
  - .value: `{ value: [{...}] }`
  - .results: `{ results: [{...}] }`
  - .data: `{ data: [{...}] }`
  - .incidents: `{ incidents: [{...}] }`
  - Invalid/empty responses
- `filterCharlotteBoundsEvents()` - Geographic filtering
  - Events within Charlotte bounds
  - Events outside bounds
- Error handling and deduplication

**Test scenarios:**
- Each of the 5 API response format variations
- PascalCase property normalization
- Geographic boundary filtering
- Empty/invalid responses
- Duplicate events

---

## Medium Priority - Utilities & Edge Cases

### 8. Text Filtering Utilities

**Files:**
- `src/utils/cmsFilters.ts`
- `src/utils/catsFilters.ts`
- `src/utils/twitterFilters.ts`

**Key logic to test:**

**CMS Filters:**
- `isHolidayClosure()` - Holiday pattern matching
  - Holiday names (MLK, Christmas, Thanksgiving, etc.)
  - Date patterns (Dec 22-26, Jan 1-2, etc.)
  - Closure pattern + holiday name combinations
- `isCMSAlertTweet()` - Alert keyword detection
  - Alert keywords: emergency, active shooter, lockdown, closed, canceled, delay, remote
  - Holiday exclusions
  - Combination logic

**CATS Filters:**
- `isServiceAlertTweet()` - Service term vs exclusion term matching
  - Service terms: suspend, delays, Blue Line, detour, etc.
  - Exclusion terms: live now, meeting, fare study, etc.
  - Combined logic

**Twitter Filters:**
- `isWithinLast12Hours()` - Time-based filtering
  - Recent tweets (within 12h)
  - Old tweets (> 12h)
  - Invalid dates

**Test scenarios:**
- Various holiday patterns (by name, by date, combined)
- CMS alert keywords (critical, moderate, minor)
- Holiday closures that should be filtered
- CATS service alerts vs promotional content
- Time-based filtering edge cases

---

### 9. Date Formatting Utilities
**File:** `src/utils/dateFormatting.ts`

**Key logic to test:**
- `formatTimeDisplay()` - Handles ISO strings and descriptive text
  - Valid ISO string → formatted time (e.g., "3:45 PM")
  - Descriptive text (e.g., "Assessing") → returned as-is
  - Invalid date → returned as-is
  - undefined → undefined
- `formatEndTimeDisplay()` - Context-aware formatting
  - Same day → "Until 3:45 PM today"
  - Different day → "Until Mon, Jan 15 10:30 AM"
  - Invalid date → undefined
  - undefined → undefined

**Test scenarios:**
- Valid ISO date strings
- Invalid date strings
- Descriptive text ("Assessing", "Unknown")
- undefined/null inputs
- Same-day vs different-day end times
- Timezone handling
- Locale variations (if applicable)

---

### 10. CMS Tweet Converter
**File:** `src/alerts/converters/cms.ts`

**Key logic to test:**
- `severityFromTweetText()` - Emergency keyword detection
  - "emergency", "active shooter", "lockdown" → critical
  - "closed", "canceled", "delay" → moderate
  - "remote" → minor
  - Default → minor
- `convertCMSTweetToGeneric()` - Tweet conversion
  - Emoji stripping
  - Title truncation (80 chars)
  - Twitter URL generation
  - Severity assignment
  - Metadata population

**Test scenarios:**
- Critical keywords (emergency, active shooter, lockdown)
- Moderate keywords (closed, canceled, delay)
- Minor keywords (remote)
- Default/no keywords
- Tweets with emojis
- Very long tweets (> 80 chars)
- Twitter URL format validation

---

## Lower Priority - React Hooks

### 11. useAlertSummary
**File:** `src/hooks/useAlertSummary.ts`

**Key logic to test:**
- Hash-based caching
- Alert filtering logic
- Query key generation
- Enabled/disabled state

---

### 12. useWeatherSummary
**File:** `src/hooks/useWeatherSummary.ts`

**Key logic to test:**
- Hash computation
- Query key generation
- Data transformation before API call

---

### 13. useDashboardLayout
**File:** `src/hooks/useDashboardLayout.ts`

**Key logic to test:**
- Layout state management (if complex)
- Responsive breakpoint handling

---

### 14. useIntersectionObserver
**File:** `src/hooks/useIntersectionObserver.ts`

**Key logic to test:**
- Observer lifecycle
- Intersection detection
- Cleanup on unmount

---

## Additional Converters

### 15. Duke Outage Converter
**File:** `src/alerts/converters/duke.ts`

**Key logic to test:**
- Severity mapping by customer count
- Customer count formatting
- Time estimation formatting

---

## Test Coverage Goals

| Category | Current | Target | Priority |
|----------|---------|--------|----------|
| Alert Converters | 0% | 100% | Critical |
| API Clients | 43% | 90% | High |
| Filter/Parse Utils | 0% | 100% | High |
| Date/Format Utils | 33% | 100% | Medium |
| React Hooks | 0% | 80% | Low |
| **Overall** | **18%** | **85%+** | - |

---

## Testing Principles

1. **Focus on edge cases:** Invalid data, missing fields, boundary conditions
2. **Test business logic:** Filtering, severity mapping, consolidation
3. **Validate transformations:** Input → expected output for all code paths
4. **Cover error handling:** Null/undefined, malformed data, API failures
5. **Regression prevention:** Test known bugs, user-reported issues
6. **Keep tests fast:** Mock API calls, avoid integration tests where possible
7. **Maintain readability:** Clear test names, arrange-act-assert pattern

---

## Completed Tests

- [x] `src/utils/dedupe.test.ts` - Generic deduplication (13 tests)
- [x] `src/utils/hereApi.test.ts` - HERE API utilities (27 tests)
- [x] `src/utils/ncdotApi.test.ts` - NCDOT API utilities (20 tests)
- [x] `src/utils/flightApi.test.ts` - Flight API formatting (26 tests)
- [x] `src/utils/alertSummaryApi.test.ts` - Alert summary API (12 tests)
- [x] `src/utils/weatherSummaryApi.test.ts` - Weather summary API (9 tests)
- [x] `src/components/AlertIcon.test.tsx` - Alert icon component (7 tests)
- [x] `src/components/Widget/TimeUpdated.test.tsx` - Time updated component (6 tests)

**Total: 120 tests**
