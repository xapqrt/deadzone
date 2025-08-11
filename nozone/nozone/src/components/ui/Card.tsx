import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme, typography } from '../../utils/theme';
import { useResponsive } from '../../utils/responsive';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export interface CardProps {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  description?: string;
  image?: ImageSourcePropType;
  imageHeight?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'filled' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  descriptionStyle?: TextStyle;
  headerActions?: React.ReactNode;
  footerActions?: React.ReactNode;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  badge?: string | number;
  badgeColor?: string;
  pressable?: boolean;
  hapticFeedback?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  description,
  image,
  imageHeight = 200,
  onPress,
  onLongPress,
  variant = 'elevated',
  size = 'md',
  style,
  titleStyle,
  subtitleStyle,
  descriptionStyle,
  headerActions,
  footerActions,
  leftIcon,
  rightIcon,
  onRightIconPress,
  disabled = false,
  loading = false,
  badge,
  badgeColor,
  pressable = Boolean(onPress || onLongPress),
  hapticFeedback = true,
}) => {
  const { spacing, fontSize } = useResponsive();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = () => {
    if (pressable && !disabled) {
      if (hapticFeedback) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(0.9, { duration: 150 });
    }
  };

  const handlePressOut = () => {
    if (pressable && !disabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 150 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const sizeStyles = getSizeStyles(size, spacing);
  const textSizeStyles = getSizeTextStyles(size, fontSize);
  const variantStyles = getVariantStyles(variant);

  const hasHeader = title || subtitle || leftIcon || rightIcon || headerActions;
  const hasImage = Boolean(image);
  const hasContent = Boolean(children || description);
  const hasFooter = Boolean(footerActions);

  const CardContainer = pressable ? AnimatedTouchableOpacity : Animated.View;

  return (
    <CardContainer
      style={[
        styles.container,
        variantStyles,
        sizeStyles,
        disabled && styles.disabled,
        style,
        pressable && animatedStyle,
      ]}
      onPress={pressable ? onPress : undefined}
      onLongPress={pressable ? onLongPress : undefined}
      onPressIn={pressable ? handlePressIn : undefined}
      onPressOut={pressable ? handlePressOut : undefined}
      disabled={disabled || loading}
      activeOpacity={pressable ? 0.9 : 1}
      accessibilityRole={pressable ? 'button' : 'none'}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {/* Badge */}
      {badge && (
        <View style={[styles.badge, { backgroundColor: badgeColor || theme.colors.primary }]}>
          <Text style={[styles.badgeText, textSizeStyles.badge]}>
            {badge}
          </Text>
        </View>
      )}

      {/* Image */}
      {hasImage && (
        <View style={styles.imageContainer}>
          <Image
            source={image!}
            style={[styles.image, { height: imageHeight }]}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Header */}
      {hasHeader && (
        <View style={[styles.header, sizeStyles.header]}>
          <View style={styles.headerContent}>
            {leftIcon && (
              <Feather
                name={leftIcon as any}
                size={getIconSize(size)}
                color={theme.colors.onBackground}
                style={[styles.leftIcon, { marginRight: spacing.sm }]}
              />
            )}

            <View style={styles.headerText}>
              {title && (
                <Text style={[
                  styles.title,
                  textSizeStyles.title,
                  titleStyle
                ]} numberOfLines={2}>
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text style={[
                  styles.subtitle,
                  textSizeStyles.subtitle,
                  subtitleStyle
                ]} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.headerActions}>
            {headerActions}
            
            {rightIcon && (
              <TouchableOpacity
                onPress={onRightIconPress}
                style={styles.rightIconButton}
                disabled={!onRightIconPress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather
                  name={rightIcon as any}
                  size={getIconSize(size)}
                  color={theme.colors.onBackground}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Content */}
      {hasContent && (
        <View style={[styles.content, sizeStyles.content]}>
          {description && (
            <Text style={[
              styles.description,
              textSizeStyles.description,
              descriptionStyle
            ]}>
              {description}
            </Text>
          )}
          {children}
        </View>
      )}

      {/* Footer */}
      {hasFooter && (
        <View style={[styles.footer, sizeStyles.footer]}>
          {footerActions}
        </View>
      )}

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            {/* You can add ActivityIndicator here if needed */}
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      )}
    </CardContainer>
  );
};

// Helper functions
const getSizeStyles = (size: string, spacing: any) => {
  const styles = {
    sm: {
      padding: spacing.sm,
      header: { paddingBottom: spacing.xs },
      content: { paddingVertical: spacing.xs },
      footer: { paddingTop: spacing.xs },
    },
    md: {
      padding: spacing.md,
      header: { paddingBottom: spacing.sm },
      content: { paddingVertical: spacing.sm },
      footer: { paddingTop: spacing.sm },
    },
    lg: {
      padding: spacing.lg,
      header: { paddingBottom: spacing.md },
      content: { paddingVertical: spacing.md },
      footer: { paddingTop: spacing.md },
    },
  };
  return styles[size as keyof typeof styles] || styles.md;
};

const getSizeTextStyles = (size: string, fontSize: any) => {
  const styles = {
    sm: {
      title: { fontSize: fontSize.md },
      subtitle: { fontSize: fontSize.sm },
      description: { fontSize: fontSize.sm },
      badge: { fontSize: fontSize.xs },
    },
    md: {
      title: { fontSize: fontSize.lg },
      subtitle: { fontSize: fontSize.md },
      description: { fontSize: fontSize.md },
      badge: { fontSize: fontSize.sm },
    },
    lg: {
      title: { fontSize: fontSize.xl },
      subtitle: { fontSize: fontSize.lg },
      description: { fontSize: fontSize.lg },
      badge: { fontSize: fontSize.md },
    },
  };
  return styles[size as keyof typeof styles] || styles.md;
};

const getVariantStyles = (variant: string) => {
  return {
    elevated: {
      backgroundColor: theme.colors.surface,
      ...theme.shadows.md,
    },
    outlined: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filled: {
      backgroundColor: theme.colors.surfaceVariant,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
  }[variant] || {};
};

const getIconSize = (size: string) => {
  const sizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };
  return sizes[size as keyof typeof sizes] || sizes.md;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    zIndex: 10,
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
  },
  badgeText: {
    fontFamily: typography.fonts.bold,
    color: theme.colors.onPrimary,
  },
  imageContainer: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  leftIcon: {
    marginTop: 2, // Slight adjustment for optical alignment
  },
  rightIconButton: {
    padding: theme.spacing.xs,
    marginRight: -theme.spacing.xs, // Compensate for button padding
  },
  title: {
    fontFamily: typography.fonts.bold,
    color: theme.colors.onBackground,
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: typography.fonts.medium,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs / 2,
    lineHeight: 20,
  },
  content: {
    // Styles applied dynamically
  },
  description: {
    fontFamily: typography.fonts.regular,
    color: theme.colors.onBackground,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  loadingText: {
    fontFamily: typography.fonts.medium,
    color: theme.colors.onBackground,
    fontSize: 14,
  },
  disabled: {
    opacity: 0.6,
  },
});
