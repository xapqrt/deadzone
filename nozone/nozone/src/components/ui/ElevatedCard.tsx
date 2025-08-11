import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../utils/theme';

interface ElevatedCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  level?: 0 | 1 | 2 | 3 | 4;
  interactive?: boolean;
}

const shadowLevels = [theme.shadows.xs, theme.shadows.sm, theme.shadows.md, theme.shadows.lg, theme.shadows.xl];

export const ElevatedCard: React.FC<ElevatedCardProps> = ({ children, style, level = 1, interactive }) => {
  return (
    <View style={[styles.base, shadowLevels[level], interactive && styles.interactive, style]}> {children} </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.borderLight,
  },
  interactive: {
    shadowOpacity: 0.18,
  }
});
