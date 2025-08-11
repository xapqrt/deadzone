import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolateColor } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../utils/theme';

interface IconButtonProps {
  name: string;
  size?: number;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  variant?: 'plain' | 'filled' | 'outline' | 'ghost';
  color?: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const IconButton: React.FC<IconButtonProps> = ({
  name,
  size = 20,
  onPress,
  disabled,
  style,
  accessibilityLabel,
  variant = 'ghost',
  color,
}) => {
  const scale = useSharedValue(1);
  const hover = useSharedValue(0);

  const pressedBg = {
    plain: theme.colors.surfaceVariant,
    filled: theme.colors.primaryVariant,
    outline: theme.colors.surfaceVariant,
    ghost: theme.colors.surfaceVariant,
  }[variant];

  const baseBg = {
    plain: theme.colors.surface,
    filled: theme.colors.primary,
    outline: 'transparent',
    ghost: 'transparent',
  }[variant];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(hover.value, [0, 1], [baseBg, pressedBg]),
    opacity: disabled ? 0.5 : 1,
  }));

  return (
    <AnimatedTouchable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || name}
      activeOpacity={0.8}
      disabled={disabled}
      onPressIn={() => { if (!disabled) { scale.value = withSpring(0.92); hover.value = withTiming(1, { duration: 120 }); } }}
      onPressOut={() => { if (!disabled) { scale.value = withSpring(1); hover.value = withTiming(0, { duration: 160 }); } }}
      onPress={onPress}
      style={[styles.base, variant === 'outline' && styles.outline, variant === 'filled' && styles.filledShadow, style, animatedStyle]}
    >
      <Feather name={name as any} size={size} color={color || (variant === 'filled' ? theme.colors.onPrimary : theme.colors.text)} />
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filledShadow: {
    ...theme.shadows.sm,
  },
});
