# Icons

Custom SVG and PNG icons for Charlotte Watch.

## Usage

```tsx
// Import as URL (for <img> src)
import alertIcon from './alert-warning.svg';
<img src={alertIcon} alt="Alert" />

// Import as React component (for inline SVG with styling)
import { ReactComponent as AlertIcon } from './alert-warning.svg';
<AlertIcon className="icon" />
```

## Organization

- Alert severity icons: `alert-{severity}.svg`
- Widget icons: `widget-{name}.svg`
- UI icons: `{name}.svg`
