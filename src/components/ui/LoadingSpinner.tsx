import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color,
  message,
  style
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator
        size={size}
        color={color || theme.colors.primary}
      />
      {message && (
        <Text style={[styles.message, { color: theme.colors.muted }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
  retryText?: string;
  style?: ViewStyle;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  message,
  onRetry,
  retryText = 'Retry',
  style
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.errorText, { color: theme.colors.destructive }]}>
        {message}
      </Text>
      {onRetry && (
        <Text style={[styles.retryText, { color: theme.colors.primary }]} onPress={onRetry}>
          {retryText}
        </Text>
      )}
    </View>
  );
};

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon,
  action,
  style
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.title, { color: theme.colors.foreground }]}>{title}</Text>
      {message && (
        <Text style={[styles.message, { color: theme.colors.muted }]}>{message}</Text>
      )}
      {action && (
        <Text style={[styles.action, { color: theme.colors.primary }]} onPress={action.onPress}>
          {action.label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  message: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 16,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 16,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  icon: {
    marginBottom: 16,
  },
  action: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
});