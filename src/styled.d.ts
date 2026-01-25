// Extend styled-components DefaultTheme with our custom theme
import 'styled-components';
import type { Theme } from './theme/theme';

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends Theme {}
}
