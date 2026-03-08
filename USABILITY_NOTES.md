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

### 1. Keyboard focus enters Leaflet map and does not escape cleanly

**Severity: High** (accessibility)

When pressing `Tab` to navigate the page, focus enters the Leaflet map component in the LYNX Transit widget and cycles through internal map elements: the `tabpanel` div, its children, several `<path>` SVG elements, `<div role="button">` zoom controls, and Leaflet's `Zoom in`/`Zoom out` anchors. There is no way to Tab out without passing through all of these elements.

Additionally, raw SVG `<path>` elements are receiving keyboard focus — these are map geometry shapes (route lines, pins), not interactive controls. They should not be focusable. This produces meaningless focus stops during keyboard navigation.

---

### 2. Enabling a widget from the Manage Widgets panel does not show a visible result

**Severity: Medium**

When the Manage Widgets panel is open and a hidden widget is enabled, the new widget is added to the bottom of the dashboard grid — but it is below the viewport and not visible while the panel is open (the panel occupies the right portion of the screen, the overlay dims the rest). Users get no confirmation that anything happened other than the badge changing from "Hidden" to "Visible".

**Suggestion:** After enabling a widget, either scroll the grid to reveal the new widget, or close the panel automatically so users see the result.

---

### 3. One console error on load (ERR_CONNECTION_REFUSED)

**Severity: Low**

One resource failed to load with `net::ERR_CONNECTION_REFUSED` in the browser console. This did not visibly affect any widget content, but it suggests a dependency (likely a local dev proxy or optional integration) is not running in the dev environment. This should be identified and either removed from the dev config or handled gracefully.

---

