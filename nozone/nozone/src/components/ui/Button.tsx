import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme, typography } from '../../utils/theme';
import { useResponsive } from '../../utils/responsive';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export interface ButtonProps {
  title?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right' | 'only';
  rounded?: boolean;
  elevated?: boolean;
  hapticFeedback?: boolean;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  rounded = false,
  elevated = false,
  hapticFeedback = true,
  children,
}) => {
  const { spacing, fontSize, touchTarget } = useResponsive();
  const scale = useSharedValue(1);
  const colorValue = useSharedValue(0);
  const isDisabled = disabled || loading;

  const handlePressIn = () => {
    if (!isDisabled) {
      if (hapticFeedback) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
      colorValue.value = withTiming(1, { duration: 150 });
    }
  };

  const handlePressOut = () => {
    if (!isDisabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      colorValue.value = withTiming(0, { duration: 150 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorValue.value,
      [0, 1],
      [getBackgroundColor(variant, false), getBackgroundColor(variant, true)]
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
    };
  });

  const iconSize = getIconSize(size);
  const showIcon = icon && !loading;
  const showTitle = title && iconPosition !== 'only';

  const buttonStyle = [
    styles.base,
    getSizeStyles(size, spacing, fontSize, touchTarget),
    getVariantStyles(variant),
    fullWidth && styles.fullWidth,
    rounded && styles.rounded,
    elevated && styles.elevated,
    isDisabled && styles.disabled,
    style,
  ];

  const titleStyle = [
    styles.text,
    getSizeTextStyles(size, fontSize),
    getVariantTextStyles(variant),
    isDisabled && styles.disabledText,
    textStyle,
  ];

  return (
    <AnimatedTouchableOpacity
      style={[buttonStyle, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      accessibilityLabel={title}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size={size === 'xs' || size === 'sm' ? 'small' : 'small'}
            color={getTextColor(variant)}
            style={styles.loader}
          />
        ) : (
          <>
            {showIcon && iconPosition === 'left' && (
              <Feather
                name={icon as any}
                size={iconSize}
                color={getTextColor(variant)}
                style={[styles.icon, showTitle && { marginRight: spacing.xs }]}
              />
            )}
            
            {showTitle && (
              <Text style={titleStyle} numberOfLines={1}>
                {title}
              </Text>
            )}

            {children}
            
            {showIcon && iconPosition === 'right' && (
              <Feather
                name={icon as any}
                size={iconSize}
                color={getTextColor(variant)}
                style={[styles.icon, showTitle && { marginLeft: spacing.xs }]}
              />
            )}

            {showIcon && iconPosition === 'only' && (
              <Feather
                name={icon as any}
                size={iconSize}
                color={getTextColor(variant)}
                style={styles.icon}
              />
            )}
          </>
        )}
      </View>
    </AnimatedTouchableOpacity>
  );
};

// Helper functions
const getBackgroundColor = (variant: string, pressed: boolean) => {
  const colors = {
    primary: pressed ? theme.colors.primaryVariant : theme.colors.primary,
    secondary: pressed ? theme.colors.secondaryVariant : theme.colors.secondary,
    outline: pressed ? theme.colors.surfaceVariant : 'transparent',
    ghost: pressed ? theme.colors.surfaceVariant : 'transparent',
    destructive: pressed ? '#DC2626' : theme.colors.error,
    success: pressed ? '#059669' : theme.colors.success,
  };
  return colors[variant as keyof typeof colors] || colors.primary;
};

const getTextColor = (variant: string) => {
  const colors = {
    primary: theme.colors.onPrimary,
    secondary: theme.colors.onSecondary,
    outline: theme.colors.primary,
    ghost: theme.colors.onBackground,
    destructive: theme.colors.onPrimary,
    success: theme.colors.onPrimary,
  };
  return colors[variant as keyof typeof colors] || colors.primary;
};

const getSizeStyles = (size: string, spacing: any, fontSize: any, touchTarget: any) => {
  const styles = {
    xs: {
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs / 2,
      minHeight: 28,
    },
    sm: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      minHeight: 36,
    },
    md: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: touchTarget.minHeight,
    },
    lg: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      minHeight: 52,
    },
    xl: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      minHeight: 60,
    },
  };
  return styles[size as keyof typeof styles] || styles.md;
};

const getSizeTextStyles = (size: string, fontSize: any) => {
  const styles = {
    xs: { fontSize: fontSize.xs },
    sm: { fontSize: fontSize.sm },
    md: { fontSize: fontSize.md },
    lg: { fontSize: fontSize.lg },
    xl: { fontSize: fontSize.xl },
  };
  return styles[size as keyof typeof styles] || styles.md;
};

const getVariantStyles = (variant: string) => {
  return {
    outline: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    ghost: {
      borderWidth: 0,
    },
  }[variant] || {};
};

const getVariantTextStyles = (variant: string) => {
  return {};
};

const getIconSize = (size: string) => {
  const sizes = {
    xs: 12,
    sm: 14,
    md: 18,
    lg: 20,
    xl: 24,
  };
  return sizes[size as keyof typeof sizes] || sizes.md;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: typography.fonts.medium,
    textAlign: 'center',
    includeFontPadding: false,
  },
  icon: {
    // No default styles needed
  },
  loader: {
    // No default styles needed
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: theme.colors.textMuted,
  },
  fullWidth: {
    width: '100%',
  },
  rounded: {
    borderRadius: theme.borderRadius.round,
  },
  elevated: {
    ...theme.shadows.md,
  },
});
