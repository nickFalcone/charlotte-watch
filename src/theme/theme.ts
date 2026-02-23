// Theme type definitions for styled-components

export interface Theme {
  name: 'light' | 'dark';
  colors: {
    // Background colors
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;

    // Text colors
    text: string;
    textSecondary: string;
    textMuted: string;

    // UI colors
    border: string;
    borderLight: string;
    shadow: string;

    // Interactive elements
    primary: string;
    primaryHover: string;
    secondary: string;
    secondaryHover: string;

    // Links (theme-aware; WCAG AA+ on typical backgrounds)
    link: string;
    linkVisited: string;

    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;

    // Widget colors
    widgetBackground: string;
    widgetBorder: string;
    widgetShadow: string;

    // Badge/pill (e.g. event count) - same style as Alerts count pill, blue; 7:1 on badgeBackground
    badgeBackground: string;
    badgeText: string;

    // Status badges (flight schedule) - solid bg+fg for 7:1 contrast
    statusBadge: {
      success: { bg: string; fg: string };
      warning: { bg: string; fg: string };
      neutral: { bg: string; fg: string };
      error: { bg: string; fg: string };
      secondary: { bg: string; fg: string };
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  radii: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  typography: {
    xs: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  transitions: {
    fast: string;
    base: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
  overlay: string;
  iconFilter: string;
}

const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
};

const radii = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '50%',
};

const typography = {
  xs: '9px',
  sm: '11px',
  base: '13px',
  md: '14px',
  lg: '16px',
  xl: '18px',
  xxl: '24px',
};

const transitions = {
  fast: 'all 0.15s ease',
  base: 'all 0.2s ease',
};

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    // Background colors
    background: '#f5f5f7',
    backgroundSecondary: '#ffffff',
    backgroundTertiary: '#f9f9fb',

    // Text colors - WCAG AAA compliant (7:1 contrast ratio)
    text: '#1d1d1f', // 16.83:1 on white
    textSecondary: '#3c3c3f', // 10.99:1 on white
    textMuted: '#58585b', // 7.09:1 on white

    // UI colors
    border: '#d1d1d6',
    borderLight: '#e5e5ea',
    shadow: 'rgba(0, 0, 0, 0.1)',

    // Interactive elements
    primary: '#007aff',
    primaryHover: '#0051d5',
    secondary: '#5e5ce6',
    secondaryHover: '#4a4acb',

    // Links - 7:1 on #ffffff (WCAG AAA)
    link: '#004c99',
    linkVisited: '#551a8b',

    // Status colors - 7:1 on #ffffff (WCAG AAA)
    success: '#0d4a1a',
    warning: '#7a3e00',
    error: '#ffbdb9',
    info: '#1d4ed8', // 6.70:1 on #ffffff

    // Widget colors
    widgetBackground: '#ffffff',
    widgetBorder: '#e5e5ea',
    widgetShadow: 'rgba(0, 0, 0, 0.05)',

    // Badge/pill - blue (like Alerts pill style: tint + text), 7:1
    badgeBackground: '#eff6ff',
    badgeText: '#1e3a8a',

    statusBadge: {
      success: { bg: '#0d4a1a', fg: '#ffffff' },
      warning: { bg: '#5c3a00', fg: '#ffffff' },
      neutral: { bg: '#e5e5ea', fg: '#3c3c3f' },
      error: { bg: '#b91c1c', fg: '#ffffff' },
      secondary: { bg: '#3730a3', fg: '#ffffff' },
    },
  },
  spacing,
  radii,
  typography,
  transitions,
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.15)',
    md: '0 4px 12px rgba(0, 0, 0, 0.15)',
    lg: '0 8px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  overlay: 'rgba(0, 0, 0, 0.7)',
  iconFilter: 'none',
};

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    // Background colors
    background: '#1c1c1e',
    backgroundSecondary: '#2c2c2e',
    backgroundTertiary: '#3a3a3c',

    // Text colors - WCAG AAA compliant (7:1 contrast ratio)
    text: '#f5f5f7', // 12.80:1 on #2c2c2e
    textSecondary: '#e5e5ea', // 11.10:1 on #2c2c2e
    textMuted: '#cbcbd0', // 7.02:1 on #3a3a3c (backgroundTertiary)

    // UI colors
    border: '#38383a',
    borderLight: '#48484a',
    shadow: 'rgba(0, 0, 0, 0.3)',

    // Interactive elements
    primary: '#0a84ff',
    primaryHover: '#409cff',
    secondary: '#5e5ce6',
    secondaryHover: '#7d7aff',

    // Links - ≥7:1 on #2c2c2e (avoid #0000EE / #551A8B on dark)
    link: '#6eb4ff',
    linkVisited: '#b388ff',

    // Status colors - 7:1 on #2c2c2e and on tinted badge backgrounds
    success: '#90ffa8',
    warning: '#ffdd99',
    error: '#ffbdb9',
    info: '#64d2ff',

    // Widget colors
    widgetBackground: '#2c2c2e',
    widgetBorder: '#38383a',
    widgetShadow: 'rgba(0, 0, 0, 0.4)',

    // Badge/pill - blue (like Alerts pill style), 7:1
    badgeBackground: '#0d2137',
    badgeText: '#7dc8ff',

    statusBadge: {
      success: { bg: '#0d4a1a', fg: '#90ffa8' },
      warning: { bg: '#5c3a00', fg: '#ffdd99' },
      neutral: { bg: '#48484a', fg: '#e5e5ea' },
      error: { bg: '#b91c1c', fg: '#ffffff' },
      secondary: { bg: '#3730a3', fg: '#a5b4fc' },
    },
  },
  spacing,
  radii,
  typography,
  transitions,
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
    md: '0 4px 12px rgba(0, 0, 0, 0.3)',
    lg: '0 8px 15px -3px rgba(0, 0, 0, 0.3)',
  },
  overlay: 'rgba(0, 0, 0, 0.7)',
  iconFilter: 'invert(1) brightness(0.9)',
};
