import { useColorScheme } from 'react-native';

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const colors = {
    primary: '#3b82f6',
    primaryForeground: '#ffffff',
    secondary: '#64748b',
    secondaryForeground: '#ffffff',
    background: isDark ? '#0f172a' : '#ffffff',
    foreground: isDark ? '#f8fafc' : '#0f172a',
    card: isDark ? '#1e293b' : '#ffffff',
    cardForeground: isDark ? '#f8fafc' : '#0f172a',
    input: isDark ? '#334155' : '#f1f5f9',
    inputForeground: isDark ? '#f8fafc' : '#0f172a',
    border: isDark ? '#475569' : '#e2e8f0',
    muted: isDark ? '#64748b' : '#64748b',
    destructive: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
    shadow: '#000000',
  };

  const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  };

  const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  };

  const fontSize = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
  };

  return {
    colors,
    spacing,
    borderRadius,
    fontSize,
    isDark,
  };
};