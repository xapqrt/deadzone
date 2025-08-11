import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
} from 'react-native';
import { theme } from '../utils/theme';

export interface LoadingProps {
  size?: 'small' | 'large';
  text?: string;
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'large',
  text,
  fullScreen = false,
}) => {
  const containerStyle = [
    styles.container,
    fullScreen && styles.fullScreen,
  ];

  return (
    <View style={containerStyle}>
      <ActivityIndicator
        size={size}
        color={theme.colors.primary}
        style={styles.spinner}
      />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },

  fullScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  spinner: {
    marginBottom: theme.spacing.sm,
  },

  text: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
