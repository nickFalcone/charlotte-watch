# Accessibility

This project targets **WCAG 2.2 Level AAA** where feasible. All new or changed UI must respect these guidelines so the dashboard remains usable with assistive technologies and keyboard-only input.

**References:**

- [WCAG 2.2 (W3C Recommendation)](https://www.w3.org/TR/WCAG22/) — normative success criteria and definitions
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/) — filterable checklist
- [WCAG GitHub repo](https://github.com/w3c/wcag) — techniques, understanding docs, and errata
- [ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/) — patterns for widgets and components

## Rules for implementers (including AI agents)

When adding or changing UI, ensure:

1. **Text alternatives (1.1.1)**  
   Non-text content has a text alternative: use `alt` on `<img>` (or `alt=""` + `aria-hidden` when decorative), and ensure controls and regions have accessible names (`aria-label`, `aria-labelledby`, or visible label text).

2. **Control names and labels (2.4.6, 4.1.2)**  
   Every interactive control has a clear, descriptive name (e.g. `aria-label="Play"`, `aria-label="Select radar time frame"`). Use [ICONS.md](./ICONS.md) for when to use `aria-label` on the control vs `alt` on an icon.

3. **Keyboard access (2.1.1)**  
   All functionality is available via keyboard (no mouse-only actions). Ensure focus order is logical and no keyboard trap (2.1.2).

4. **Focus visible (2.4.7)**  
   Keyboard focus is visible (e.g. `:focus-visible` outline). Do not remove focus outlines without providing a visible alternative.

5. **Target size (2.5.8)**  
   Touch/click targets are at least 24×24 CSS pixels (AAA: consider 44×44 where possible). Spacing or equivalent control can satisfy this.

6. **Status and live updates (4.1.3)**  
   Dynamic content that conveys important information (e.g. radar time, aircraft count) is announced to screen readers via `aria-live` regions where appropriate.

7. **No emojis in UI**  
   Use SVG icons or plain text instead. See [AGENTS.md](../AGENTS.md) and [ICONS.md](./ICONS.md).

Do not introduce UI that relies only on color, shape, or position to convey information (1.3.3, 1.4.1). Prefer semantic HTML and ARIA only when semantics are missing.

## Maps

Interactive maps (WeatherRadarMap, FlightTrackerWidget) follow the same WCAG 2.2 AAA intent and the rules above. In addition:

### Map containers and descriptions

- Map containers have an `aria-label` that describes purpose and scope (e.g. "NEXRAD weather radar map for Charlotte region, past 4 hours").
- A visually hidden description (e.g. using a `VisuallyHidden` styled component) gives screen reader users a short summary of what the map shows and how to use it (controls, meaning of overlays).

### Non-text content on maps

- **Base map tiles**: Tiles are decorative; they provide visual context that is redundant with the map’s accessible name and description. Mark tile images with `alt=""` and `role="presentation"` (e.g. via a `TileAccessibilityHandler` that runs on Leaflet tile load).
- **Informative overlays** (e.g. radar image, aircraft markers): Provide a text alternative (e.g. `alt` on the radar image, `role="img"` and `aria-label` on marker icons). Essential information is also conveyed via live regions or labels as needed.

### Live announcements

- Use `aria-live="polite"` regions to announce meaningful changes (e.g. selected radar time, number of aircraft visible). Keep announcements concise and avoid spamming (e.g. atomic updates, only on value change).

### Controls and targets

- All map-related controls (play/pause, slider, recenter, etc.) have accessible names (`aria-label` or equivalent) and are keyboard operable.
- Touch targets (e.g. airport icon, buttons) meet minimum size (e.g. 24×24 CSS px; 28px where feasible for AAA).

### Implementation details

- **VisuallyHidden**: Use a styled span with clip/position so content is read by screen readers but not visible (see WeatherWidget.styles.ts / FlightTrackerWidget.styles.ts).
- **Tile accessibility**: A Leaflet effect that, on tile load, sets `alt=""` and `role="presentation"` on tile `<img>` elements ensures decorative tiles are ignored by assistive tech.

For full implementation notes, success criteria mapping, and testing suggestions for the current map components, see the sections below (retained from the previous map-specific doc).

### WeatherRadarMap

- Visually hidden description of map and controls.
- Map container: `aria-label="NEXRAD weather radar map for Charlotte region, past 4 hours"`.
- Radar overlay: `alt` and `role="img"` for the precipitation layer.
- Live region: `aria-live="polite"` for time changes.
- Play/pause and slider: `aria-label` (and Radix Slider with `aria-label="Select radar time frame"`).

### FlightTrackerWidget

- Visually hidden description of map, aircraft, and controls.
- Map container: `aria-label="Flight radar map for Charlotte Douglas International Airport showing nearby aircraft"`.
- Aircraft/airport markers: `role="img"` and `aria-label` with meaningful names.
- Live region: `aria-live="polite"` for aircraft count changes.
- Touch target size: airport icon at least 28px.

### Base map tiles (code reference)

Both components rely on marking base map tile images as decorative. Leaflet creates tile `<img>` elements at runtime, so a handler (e.g. on `tileload`) sets `alt=""` and `role="presentation"` on those images. Geographic context is provided by the map’s `aria-label`, visually hidden description, and interactive features, so the tiles themselves are not the sole source of information.

### WCAG 2.2 criteria addressed by map work

- **1.1.1 Non-text Content (A)**: Informative images have text alternatives; decorative tiles use `role="presentation"` and `alt=""`.
- **2.5.8 Target Size (AA)** / AAA: Interactive elements meet minimum target size (e.g. 28px for airport icon).
- **4.1.3 Status Messages (AA)**: Dynamic updates announced via `aria-live` regions.
- **2.4.6 Headings and Labels (AA)**: Descriptive labels on map and controls.
- **1.3.1 Info and Relationships (A)**: Structure and ARIA roles used correctly.

### Testing

- Test with screen readers (e.g. NVDA, JAWS, VoiceOver).
- Confirm live announcements for radar time and aircraft count where implemented.
- Verify all controls are keyboard accessible and focus is visible.
- Use axe DevTools (or similar) to check ARIA and alternatives.
- Confirm visually hidden text is exposed to assistive tech and not visible on screen.

## References

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM: Invisible Content for Screen Readers](https://webaim.org/techniques/css/invisiblecontent/)
