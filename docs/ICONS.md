# Icons

Icons live in `src/assets/icons/`. Use existing SVGs as-is; do not create or modify SVG files unless the user explicitly instructs you to.

## Usage

Import icons as URLs and use them with `<img>`:

```tsx
import playIcon from '../../assets/icons/play.svg';
import pauseIcon from '../../assets/icons/pause.svg';

<img src={playIcon} alt="" aria-hidden />
```

**When the icon is decorative** (e.g. inside a button or link that already has an accessible name): use `alt=""` and `aria-hidden` on the `<img>` so screen readers do not announce the image. The **control** (button, link) must provide the accessible name: use `aria-label` (e.g. `aria-label="Play"`) or visible text. Do not rely on the icon alone for the control's name.

**When the icon conveys meaning on its own** (e.g. standalone informative image): provide a text alternative. Use a descriptive `alt` on the `<img>`, or wrap in an element with `aria-label` and use `alt=""` and `aria-hidden` on the image so the wrapper's label is announced instead. Do not use `aria-hidden` on the image if it is the only way the meaning is conveyed.

## Theme-aware treatment

Icons are often neutral (e.g. fill `#e3e3e3`). To adapt to light/dark theme:

- **Icons on neutral backgrounds** (e.g. map recenter, info trigger): use a CSS filter in dark mode so the icon stays visible. Example (styled-component):

  ```ts
  filter: ${props => (props.theme.name === 'dark' ? 'invert(1) brightness(0.9)' : 'none')};
  ```

- **Icons on primary/colored buttons** (e.g. play/pause on primary): use a filter so the icon renders white for contrast in both themes:

  ```ts
  filter: brightness(0) invert(1);
  ```

See `MapRecenterButton.styles.ts` (neutral) and `WeatherWidget.styles.ts` (`RadarPlayButtonIcon`, primary button) for examples.

## Adding or changing icons

Do **not** create or edit `.svg` files in `src/assets/icons/` unless the user explicitly asks you to. If a new icon is needed, ask the user or suggest they add one. This keeps icon assets under human control and avoids accidental style/accessibility regressions.

## No emojis

Do not use emoji characters in the UI. Use SVG icons or plain text (e.g. "Play", "Pause") instead. See [AGENTS.md](../AGENTS.md) critical rules.
