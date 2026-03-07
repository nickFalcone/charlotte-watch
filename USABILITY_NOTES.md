# Charlotte Watch — Usability Notes

Testing conducted March 7, 2026 using an automated Playwright browser at 1600×900. The app was loaded at `http://localhost:5173/`. All 6 available widgets were exercised (Alerts, News, LYNX Transit, Weather, Flight Tracker, Stocks). Widget dragging, resizing, hiding, and the Manage Widgets panel were all tested.

---

## What's Happening in Charlotte Right Now

*(Answering this as a user of the dashboard.)*

**Severe weather is expected this weekend** — storms and heavy rain forecast for the Charlotte area.

**Silfab Solar is under investigation** — Officials confirmed they will continue halting operations through the weekend while local, state, and federal authorities investigate two alleged chemical spills earlier this week.

**Two fatal road crashes overnight:**
- A crash on I-77 in Mooresville killed one person and closed all northbound lanes for two hours Saturday morning.
- A crash on I-85 South in Cabarrus County killed two people and injured two others, near the Concord Mills Boulevard exit.

**Two shootings in west Charlotte** — Two people were injured in related incidents Saturday morning (MEDIC).

**CMPD is investigating a homicide** in north Charlotte from Friday afternoon.

**Active traffic incidents:**
- Night time construction on NC-49 S (moderate: up to 1 of 2 lanes closed, heading south, until March 10 at 6 AM)
- Road work on I-77 northbound — 4 incidents from mile marker 30.4 to 11, until March 13
- Vehicle disabled in roadway at CINDY LN & BEATTIES FORD RD (just occurred)
- Road blockage at DAVIS LAKE PY & W W T HARRIS BV (just occurred)

**CATS / LYNX Transit:** The elevator at the I-485 station is out-of-service. Shuttle service is being provided from Sharon Road West station for customers needing assistance.

**Weather:** Currently 67°F, peaking at 80°F by 4 PM. Dry conditions expected for the next 12 hours. Winds up to 12 mph.

**Flights:** 263 aircraft currently visible in the KCLT radar area.

---

## Usability Problems

### 1. Three of six widgets are hidden by default with no indication

**Severity: High**

On first load, only Alerts, News, and LYNX Transit are visible. Weather, Stocks, and Flight Tracker are hidden. There is no onboarding message, badge, or empty-state hint telling users that more widgets are available. The "Widgets" button in the nav is the only entry point, and its label does not suggest that hidden widgets exist.

A first-time user seeing three panels would reasonably conclude that the dashboard only covers alerts, news, and transit — missing the weather, stocks, and flight tracking features entirely.

**Suggestion:** Show a brief indicator (e.g., "3 more widgets available") or default all widgets to visible.

---

### 2. Keyboard focus enters Leaflet map and does not escape cleanly

**Severity: High** (accessibility)

When pressing `Tab` to navigate the page, focus enters the Leaflet map component in the LYNX Transit widget and cycles through internal map elements: the `tabpanel` div, its children, several `<path>` SVG elements, `<div role="button">` zoom controls, and Leaflet's `Zoom in`/`Zoom out` anchors. There is no way to Tab out without passing through all of these elements.

Additionally, raw SVG `<path>` elements are receiving keyboard focus — these are map geometry shapes (route lines, pins), not interactive controls. They should not be focusable. This produces meaningless focus stops during keyboard navigation.

---

### 3. Enabling a widget from the Manage Widgets panel does not show a visible result

**Severity: Medium**

When the Manage Widgets panel is open and a hidden widget is enabled, the new widget is added to the bottom of the dashboard grid — but it is below the viewport and not visible while the panel is open (the panel occupies the right portion of the screen, the overlay dims the rest). Users get no confirmation that anything happened other than the badge changing from "Hidden" to "Visible".

**Suggestion:** After enabling a widget, either scroll the grid to reveal the new widget, or close the panel automatically so users see the result.

---

### 4. Alert source filter row wraps onto two lines

**Severity: Low**

The nine filter buttons (NWS, FAA, Duke, NCDOT, CATS, CMPD, CMS, CFD, Traffic) wrap onto two rows when the Alerts widget is at its default width. This takes up significant vertical space and pushes the alerts list lower. Condensing these into a horizontally scrollable single row, or using a dropdown filter, would recover vertical space for alert content.

---

### 5. `tablist` and tab elements for Alerts (Incidents / Map) lack `aria-label`

**Severity: Medium** (accessibility)

The Alerts widget contains a two-tab interface (Incidents / Map) rendered with `role="tab"` buttons inside a `role="tablist"` container. Neither the `tablist` nor the individual `tab` elements have an `aria-label`. Screen readers cannot determine what set of content these tabs control. The tablist should have `aria-label="Alerts view"` (or similar), and each tab should have a descriptive label.

---

### 6. Weather widget AI summary tab shows "Generating summary..." on load

**Severity: Low**

The Weather widget defaults to the Summary tab, which shows "Generating summary..." for several seconds on load while the AI summary is being generated. During this time, the tab appears empty. This is not clearly communicating the loading state — a spinner or skeleton text would better signal that content is on its way.

---

### 7. One console error on load (ERR_CONNECTION_REFUSED)

**Severity: Low**

One resource failed to load with `net::ERR_CONNECTION_REFUSED` in the browser console. This did not visibly affect any widget content, but it suggests a dependency (likely a local dev proxy or optional integration) is not running in the dev environment. This should be identified and either removed from the dev config or handled gracefully.

---

