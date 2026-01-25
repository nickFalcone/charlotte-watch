# Icon Usage Guide

## Theme-Aware Icons

All icons automatically adapt to light/dark mode by inheriting the text color from their parent component.

### How it works:

1. **SVG icons** use `currentColor` via the `ThemedIcon` component
2. **Color inheritance** - Icons get their color from the parent's `color` CSS property
3. **No manual theme switching needed** - Works automatically with styled-components theme

### Using icons in components:

```tsx
import { AlertIcon } from '../AlertIcon';

// Basic usage - inherits color from parent
<AlertIcon source="cmpd" size={20} />

// Custom color (overrides theme)
<ThemedIcon as={PoliceIcon} size={24} $color="#ff0000" />
```

### Adding new icons:

1. **Add SVG file** to this directory
2. **Import in AlertIcon.tsx**:
   ```tsx
   import NewIcon from '../assets/icons/new-icon.svg?react';
   ```
3. **Map to source/category**:
   ```tsx
   const SOURCE_ICON_MAP = {
     // ...
     newsource: NewIcon,
   };
   ```

### Preparing SVG files for theme compatibility:

- **Remove hardcoded fill/stroke colors** - Let `currentColor` handle it
- **Optimize SVGs** - Use tools like SVGO to reduce file size
- **Test in both themes** - Verify visibility in light and dark modes

## Light/Dark Mode Testing

To test your icons in both modes:
1. Run `npm run dev`
2. Toggle theme using the theme switcher (moon/sun icon)
3. Verify icons are visible and properly colored in both themes
