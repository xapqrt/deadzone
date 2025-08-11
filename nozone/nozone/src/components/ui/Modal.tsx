import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal as RNModal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ViewStyle,
  TextStyle,
  Dimensions,
  Platform,
  BackHandler,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme, typography } from '../../utils/theme';
import { useResponsive } from '../../utils/responsive';
import { Button, ButtonProps } from './Button';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface ModalAction {
  label: string;
  onPress: () => void;
  variant?: ButtonProps['variant'];
  loading?: boolean;
  disabled?: boolean;
  destructive?: boolean;
}

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  variant?: 'alert' | 'confirmation' | 'form' | 'fullscreen' | 'bottom-sheet';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
  actions?: ModalAction[];
  closeOnBackdrop?: boolean;
  closeOnBackButton?: boolean;
  showCloseButton?: boolean;
  animationType?: 'slide' | 'fade' | 'zoom';
  position?: 'center' | 'top' | 'bottom';
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  titleStyle?: TextStyle;
  descriptionStyle?: TextStyle;
  backdropColor?: string;
  backdropOpacity?: number;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  description,
  children,
  variant = 'alert',
  size = 'md',
  actions = [],
  closeOnBackdrop = true,
  closeOnBackButton = true,
  showCloseButton = true,
  animationType = 'fade',
  position = 'center',
  style,
  contentStyle,
  titleStyle,
  descriptionStyle,
  backdropColor = 'rgba(0, 0, 0, 0.5)',
  backdropOpacity = 1,
}) => {
  const { spacing, fontSize } = useResponsive();
  const modalScale = useSharedValue(0.8);
  const modalOpacity = useSharedValue(0);
  const backdropOpacityValue = useSharedValue(0);
  const slideOffset = useSharedValue(screenHeight);

  const show = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    backdropOpacityValue.value = withTiming(backdropOpacity, { duration: 300 });
    
    if (animationType === 'zoom') {
      modalScale.value = withSpring(1, { damping: 15, stiffness: 300 });
      modalOpacity.value = withTiming(1, { duration: 300 });
    } else if (animationType === 'slide') {
      slideOffset.value = withSpring(0, { damping: 15, stiffness: 300 });
      modalOpacity.value = withTiming(1, { duration: 300 });
    } else {
      modalOpacity.value = withTiming(1, { duration: 300 });
    }
  };

  const hide = () => {
    backdropOpacityValue.value = withTiming(0, { duration: 300 });
    
    if (animationType === 'zoom') {
      modalScale.value = withTiming(0.8, { duration: 300 });
      modalOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(onClose)();
        }
      });
    } else if (animationType === 'slide') {
      slideOffset.value = withTiming(
        position === 'bottom' ? screenHeight : -screenHeight,
        { duration: 300 }
      );
      modalOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(onClose)();
        }
      });
    } else {
      modalOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(onClose)();
        }
      });
    }
  };

  useEffect(() => {
    if (visible) {
      show();
    }
  }, [visible]);

  useEffect(() => {
    const handleBackButton = () => {
      if (visible && closeOnBackButton) {
        hide();
        return true;
      }
      return false;
    };

    if (Platform.OS === 'android') {
      const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackButton);
      return () => subscription.remove();
    }
  }, [visible, closeOnBackButton]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacityValue.value,
  }));

  const modalAnimatedStyle = useAnimatedStyle(() => {
    if (animationType === 'zoom') {
      return {
        transform: [{ scale: modalScale.value }],
        opacity: modalOpacity.value,
      };
    } else if (animationType === 'slide') {
      return {
        transform: [{ translateY: slideOffset.value }],
        opacity: modalOpacity.value,
      };
    } else {
      return {
        opacity: modalOpacity.value,
      };
    }
  });

  const modalSizeStyles = getSizeStyles(size);
  const positionStyles = getPositionStyles(position, variant);

  const handleBackdropPress = () => {
    if (closeOnBackdrop) {
      hide();
    }
  };

  const hasHeader = title || showCloseButton;
  const hasFooter = actions.length > 0;

  return (
    <RNModal
      transparent
      visible={visible}
      statusBarTranslucent
      animationType="none"
      onRequestClose={closeOnBackButton ? hide : undefined}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            { backgroundColor: backdropColor },
            backdropAnimatedStyle,
          ]}
        />
        
        {/* Backdrop Touch Handler */}
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <View style={styles.backdropTouchArea} />
        </TouchableWithoutFeedback>

        {/* Modal Content */}
        <View style={[styles.container, positionStyles]}>
          <Animated.View
            style={[
              styles.modal,
              modalSizeStyles,
              getVariantStyles(variant),
              style,
              modalAnimatedStyle,
            ]}
          >
            {/* Header */}
            {hasHeader && (
              <View style={[styles.header, { padding: spacing.lg }]}>
                <View style={styles.headerContent}>
                  {title && (
                    <Text style={[
                      styles.title,
                      { fontSize: fontSize.lg },
                      titleStyle
                    ]}>
                      {title}
                    </Text>
                  )}
                </View>
                
                {showCloseButton && (
                  <TouchableOpacity
                    onPress={hide}
                    style={styles.closeButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather
                      name="x"
                      size={24}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Content */}
            <View style={[
              styles.content,
              {
                paddingHorizontal: spacing.lg,
                paddingVertical: hasHeader || hasFooter ? 0 : spacing.lg,
              },
              contentStyle
            ]}>
              {description && (
                <Text style={[
                  styles.description,
                  { fontSize: fontSize.md, marginBottom: spacing.md },
                  descriptionStyle
                ]}>
                  {description}
                </Text>
              )}
              {children}
            </View>

            {/* Footer */}
            {hasFooter && (
              <View style={[styles.footer, { padding: spacing.lg }]}>
                <View style={styles.actions}>
                  {actions.map((action, index) => (
                    <Button
                      key={index}
                      title={action.label}
                      onPress={action.onPress}
                      variant={action.destructive ? 'destructive' : action.variant || 'primary'}
                      loading={action.loading}
                      disabled={action.disabled}
                      style={{
                        ...styles.actionButton,
                        ...(index < actions.length - 1 ? { marginRight: spacing.sm } : {})
                      }}
                    />
                  ))}
                </View>
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    </RNModal>
  );
};

// Convenience functions
export const showAlert = (
  title: string,
  description?: string,
  actions: ModalAction[] = [{ label: 'OK', onPress: () => {} }]
) => {
  // Implementation would require a global modal manager
  // This is a placeholder for the API
  console.log('showAlert:', { title, description, actions });
};

export const showConfirmation = (
  title: string,
  onConfirm: () => void,
  description?: string,
  onCancel?: () => void
) => {
  const actions: ModalAction[] = [
    {
      label: 'Cancel',
      onPress: onCancel || (() => {}),
      variant: 'outline',
    },
    {
      label: 'Confirm',
      onPress: onConfirm,
      variant: 'primary',
    },
  ];
  
  // Implementation would require a global modal manager
  console.log('showConfirmation:', { title, description, actions });
};

// Helper functions
const getSizeStyles = (size: string) => {
  const maxWidth = screenWidth - (theme.spacing.lg * 2);
  
  const styles = {
    sm: {
      maxWidth: Math.min(320, maxWidth),
      maxHeight: screenHeight * 0.6,
    },
    md: {
      maxWidth: Math.min(400, maxWidth),
      maxHeight: screenHeight * 0.7,
    },
    lg: {
      maxWidth: Math.min(500, maxWidth),
      maxHeight: screenHeight * 0.8,
    },
    xl: {
      maxWidth: Math.min(600, maxWidth),
      maxHeight: screenHeight * 0.9,
    },
    fullscreen: {
      width: screenWidth,
      height: screenHeight,
      maxWidth: undefined,
      maxHeight: undefined,
    },
  };
  
  return styles[size as keyof typeof styles] || styles.md;
};

const getPositionStyles = (position: string, variant: string): { 
  justifyContent: 'center' | 'flex-start' | 'flex-end'; 
  alignItems: 'center'; 
  paddingTop?: number; 
  paddingBottom?: number; 
} => {
  if (variant === 'fullscreen') {
    return {
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    };
  }

  const styles = {
    center: {
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    top: {
      justifyContent: 'flex-start' as const,
      alignItems: 'center' as const,
      paddingTop: 100,
    },
    bottom: {
      justifyContent: 'flex-end' as const,
      alignItems: 'center' as const,
      paddingBottom: 50,
    },
  };

  return styles[position as keyof typeof styles] || styles.center;
};

const getVariantStyles = (variant: string) => {
  const styles = {
    alert: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      ...theme.shadows.lg,
    },
    confirmation: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      ...theme.shadows.lg,
    },
    form: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      ...theme.shadows.lg,
    },
    fullscreen: {
      backgroundColor: theme.colors.background,
      borderRadius: 0,
    },
    'bottom-sheet': {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      ...theme.shadows.lg,
    },
  };

  return styles[variant as keyof typeof styles] || styles.alert;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: 'relative',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropTouchArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  modal: {
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerContent: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  title: {
    fontFamily: typography.fonts.bold,
    color: theme.colors.onBackground,
    lineHeight: 28,
  },
  closeButton: {
    padding: theme.spacing.xs,
    marginTop: -theme.spacing.xs,
    marginRight: -theme.spacing.xs,
  },
  content: {
    flex: 1,
  },
  description: {
    fontFamily: typography.fonts.regular,
    color: theme.colors.textMuted,
    lineHeight: 24,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionButton: {
    minWidth: 80,
  },
});
