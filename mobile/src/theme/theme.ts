import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563eb', // Royal Blue
    secondary: '#64748b', // Slate
    background: '#f8fafc',
    surface: '#ffffff',
    error: '#ef4444',
    text: '#0f172a',
    onSurface: '#0f172a',
    disabled: 'rgba(0, 0, 0, 0.26)',
    placeholder: 'rgba(0, 0, 0, 0.54)',
    accent: '#3b82f6',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#3b82f6', // Premium blue for dark mode
    secondary: '#94a3b8',
    background: '#060912', // Dark blue background
    surface: '#0a0f1d', // Glass panel surface
    error: '#ef4444',
    text: '#ffffff',
    onSurface: '#f8fafc',
    disabled: 'rgba(255, 255, 255, 0.3)',
    placeholder: 'rgba(255, 255, 255, 0.54)',
    accent: '#60a5fa',
  },
};
