import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme, typography } from '../utils/theme';
import { useResponsive } from '../utils/responsive';

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: any;
}

interface GlassCardProps {
  children: React.ReactNode;
  style?: any;
  blur?: boolean;
  opacity?: number;
}

interface GradientBackgroundProps {
  children: React.ReactNode;
  colors?: string[];
  direction?: 'vertical' | 'horizontal' | 'diagonal';
  style?: any;
}

interface AnimatedModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationType?: 'slide' | 'fade' | 'zoom';
  position?: 'center' | 'bottom' | 'top';
  title?: string;
  showCloseButton?: boolean;
}

interface PulseAnimationProps {
  children: React.ReactNode;
  duration?: number;
  minOpacity?: number;
  maxOpacity?: number;
  enabled?: boolean;
}

interface SlideInViewProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  delay?: number;
  distance?: number;
}

// Animated Button with smooth transitions
export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const { fontSize, spacing } = useResponsive();

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.border,
          textColor: theme.colors.textSecondary,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: theme.colors.primary,
          textColor: theme.colors.primary,
          borderWidth: 1,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: theme.colors.primary,
        };
      default: // primary
        return {
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.primary,
          textColor: theme.colors.onPrimary,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          fontSize: fontSize.sm,
          iconSize: 16,
        };
      case 'large':
        return {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          fontSize: fontSize.lg,
          iconSize: 24,
        };
      default: // medium
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          fontSize: fontSize.md,
          iconSize: 20,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      onPress();
    }
  };

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth && { width: '100%' },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.animatedButton,
          {
            backgroundColor: disabled ? theme.colors.surfaceVariant : variantStyles.backgroundColor,
            borderColor: disabled ? theme.colors.border : variantStyles.borderColor,
            borderWidth: variantStyles.borderWidth || 0,
            paddingVertical: sizeStyles.paddingVertical,
            paddingHorizontal: sizeStyles.paddingHorizontal,
          },
          style,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        {icon && iconPosition === 'left' && (
          <Feather
            name={icon as any}
            size={sizeStyles.iconSize}
            color={disabled ? theme.colors.textMuted : variantStyles.textColor}
            style={{ marginRight: spacing.xs }}
          />
        )}
        
        <Text
          style={[
            styles.animatedButtonText,
            {
              fontSize: sizeStyles.fontSize,
              color: disabled ? theme.colors.textMuted : variantStyles.textColor,
            },
          ]}
        >
          {loading ? 'Loading...' : title}
        </Text>
        
        {icon && iconPosition === 'right' && (
          <Feather
            name={icon as any}
            size={sizeStyles.iconSize}
            color={disabled ? theme.colors.textMuted : variantStyles.textColor}
            style={{ marginLeft: spacing.xs }}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Glass morphism card effect
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  blur = true,
  opacity = 0.1,
}) => {
  return (
    <View
      style={[
        styles.glassCard,
        {
          backgroundColor: `rgba(255, 255, 255, ${opacity})`,
          backdropFilter: blur ? 'blur(10px)' : 'none',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

// Gradient background component
export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  colors = [theme.colors.primary, theme.colors.secondary],
  direction = 'vertical',
  style,
}) => {
  // Note: React Native doesn't have native gradient support
  // This is a simplified version - you'd use react-native-linear-gradient in production
  const gradientStyle = {
    backgroundColor: colors[0], // Fallback to first color
  };

  return (
    <View style={[styles.gradientBackground, gradientStyle, style]}>
      {children}
    </View>
  );
};

// Enhanced animated modal
export const AnimatedModal: React.FC<AnimatedModalProps> = ({
  visible,
  onClose,
  children,
  animationType = 'slide',
  position = 'center',
  title,
  showCloseButton = true,
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(300)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const { fontSize, spacing } = useResponsive();

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getModalStyle = () => {
    const baseStyle = {
      opacity: fadeAnim,
    };

    switch (animationType) {
      case 'slide':
        return {
          ...baseStyle,
          transform: [{ translateY: slideAnim }],
        };
      case 'zoom':
        return {
          ...baseStyle,
          transform: [{ scale: scaleAnim }],
        };
      default:
        return baseStyle;
    }
  };

  const getPositionStyle = (): { justifyContent: 'flex-end' | 'flex-start' | 'center'; paddingTop?: number } => {
    switch (position) {
      case 'bottom':
        return { justifyContent: 'flex-end' };
      case 'top':
        return { justifyContent: 'flex-start', paddingTop: 50 };
      default:
        return { justifyContent: 'center' };
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, getPositionStyle()]}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        
        <Animated.View style={[styles.modalContent, getModalStyle()]}>
          {title && (
            <View style={[styles.modalHeader, { marginBottom: spacing.md }]}>
              <Text style={[
                styles.modalTitle,
                { fontSize: fontSize.lg }
              ]}>
                {title}
              </Text>
              {showCloseButton && (
                <TouchableOpacity
                  style={[styles.modalCloseButton, { padding: spacing.xs }]}
                  onPress={onClose}
                >
                  <Feather name="x" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          )}
          
          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Pulse animation component
export const PulseAnimation: React.FC<PulseAnimationProps> = ({
  children,
  duration = 1000,
  minOpacity = 0.3,
  maxOpacity = 1,
  enabled = true,
}) => {
  const pulseAnim = React.useRef(new Animated.Value(minOpacity)).current;

  React.useEffect(() => {
    if (enabled) {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: maxOpacity,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: minOpacity,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]).start(() => pulse());
      };
      pulse();
    } else {
      pulseAnim.setValue(maxOpacity);
    }
  }, [enabled, duration, minOpacity, maxOpacity]);

  return (
    <Animated.View style={{ opacity: pulseAnim }}>
      {children}
    </Animated.View>
  );
};

// Slide in animation component
export const SlideInView: React.FC<SlideInViewProps> = ({
  children,
  direction = 'right',
  duration = 500,
  delay = 0,
  distance = 100,
}) => {
  const slideAnim = React.useRef(new Animated.Value(distance)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const initialValue = direction === 'up' || direction === 'left' ? -distance : distance;
    slideAnim.setValue(initialValue);

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
  }, []);

  const getTransform = () => {
    switch (direction) {
      case 'left':
      case 'right':
        return [{ translateX: slideAnim }];
      case 'up':
      case 'down':
        return [{ translateY: slideAnim }];
      default:
        return [{ translateX: slideAnim }];
    }
  };

  return (
    <Animated.View
      style={{
        opacity: opacityAnim,
        transform: getTransform(),
      }}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Animated Button Styles
  animatedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  animatedButtonText: {
    fontFamily: typography.fonts.medium,
    textAlign: 'center',
  },

  // Glass Card Styles
  glassCard: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...theme.shadows.lg,
  },

  // Gradient Background Styles
  gradientBackground: {
    flex: 1,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: theme.spacing.md,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '80%',
    ...theme.shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.md,
  },
  modalTitle: {
    fontFamily: typography.fonts.bold,
    color: theme.colors.onSurface,
    flex: 1,
  },
  modalCloseButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flex: 1,
  },
});
