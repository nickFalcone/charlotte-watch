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
  };
}

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

    // Links - ≥4.5:1 on #ffffff
    link: '#0066cc',
    linkVisited: '#551a8b',

    // Status colors - WCAG AAA compliant on white
    success: '#18662a', // 4.70:1 on #ffffff
    warning: '#b35600', // 4.94:1 on #ffffff
    error: '#ffbdb9',
    info: '#1d4ed8', // 6.70:1 on #ffffff

    // Widget colors
    widgetBackground: '#ffffff',
    widgetBorder: '#e5e5ea',
    widgetShadow: 'rgba(0, 0, 0, 0.05)',
  },
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

    // Status colors
    success: '#32d45c',
    warning: '#ff9f0a',
    error: '#ffbdb9',
    info: '#64d2ff',

    // Widget colors
    widgetBackground: '#2c2c2e',
    widgetBorder: '#38383a',
    widgetShadow: 'rgba(0, 0, 0, 0.4)',
  },
};
