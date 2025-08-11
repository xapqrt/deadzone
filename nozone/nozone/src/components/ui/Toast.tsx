import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme, typography } from '../../utils/theme';
import { useResponsive } from '../../utils/responsive';

const { width: screenWidth } = Dimensions.get('window');

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onHide?: () => void;
  position?: 'top' | 'bottom';
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  visible?: boolean;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onHide,
  position = 'top',
  icon,
  style,
  textStyle,
  visible = true,
}) => {
  const { spacing, fontSize } = useResponsive();
  const translateY = useSharedValue(position === 'top' ? -100 : 100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const show = () => {
    // Haptic feedback
    if (type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (type === 'warning') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Animate in
    translateY.value = withSpring(0, {
      damping: 15,
      stiffness: 300,
    });
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });

    // Auto hide
    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        hide();
      }, duration);
    }
  };

  const hide = () => {
    translateY.value = withSpring(position === 'top' ? -100 : 100, {
      damping: 15,
      stiffness: 300,
    });
    opacity.value = withTiming(0, { duration: 300 });
    scale.value = withTiming(0.8, { duration: 300 }, (finished) => {
      if (finished && onHide) {
        runOnJS(onHide)();
      }
    });
  };

  useEffect(() => {
    if (visible) {
      show();
    } else {
      hide();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const toastIcon = icon || getTypeIcon(type);
  const toastColors = getTypeColors(type);

  return (
    <Animated.View
      style={[
        styles.container,
        styles[position],
        {
          backgroundColor: toastColors.background,
          borderLeftColor: toastColors.accent,
        },
        style,
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <View style={styles.content}>
        {toastIcon && (
          <Feather
            name={toastIcon as any}
            size={20}
            color={toastColors.icon}
            style={[styles.icon, { marginRight: spacing.sm }]}
          />
        )}
        
        <Text
          style={[
            styles.message,
            { color: toastColors.text, fontSize: fontSize.md },
            textStyle,
          ]}
          numberOfLines={3}
        >
          {message}
        </Text>
      </View>

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <Animated.View
          style={[
            styles.progress,
            { backgroundColor: toastColors.accent },
          ]}
        />
      </View>
    </Animated.View>
  );
};

// Toast Manager Component
interface ToastManagerState {
  toasts: Array<{
    id: string;
    message: string;
    type: ToastProps['type'];
    duration?: number;
    icon?: string;
  }>;
}

class ToastManager {
  private listeners: Array<(toasts: ToastManagerState['toasts']) => void> = [];
  private toasts: ToastManagerState['toasts'] = [];

  subscribe(listener: (toasts: ToastManagerState['toasts']) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  show(toast: Omit<ToastManagerState['toasts'][0], 'id'>) {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    
    this.toasts.push(newToast);
    this.notifyListeners();

    // Auto remove
    setTimeout(() => {
      this.hide(id);
    }, toast.duration || 3000);

    return id;
  }

  hide(id: string) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notifyListeners();
  }

  clear() {
    this.toasts = [];
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }
}

export const toastManager = new ToastManager();

// Toast Container Component
export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = React.useState<ToastManagerState['toasts']>([]);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToasts);
    return unsubscribe;
  }, []);

  return (
    <View style={styles.toastContainer} pointerEvents="box-none">
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={0} // Managed by ToastManager
          icon={toast.icon}
          onHide={() => toastManager.hide(toast.id)}
          style={{
            top: 50 + (index * 80), // Stack toasts
            zIndex: 1000 + index,
          }}
        />
      ))}
    </View>
  );
};

// Convenience functions
export const showToast = {
  success: (message: string, duration?: number) => 
    toastManager.show({ message, type: 'success', duration }),
  
  error: (message: string, duration?: number) => 
    toastManager.show({ message, type: 'error', duration }),
  
  warning: (message: string, duration?: number) => 
    toastManager.show({ message, type: 'warning', duration }),
  
  info: (message: string, duration?: number) => 
    toastManager.show({ message, type: 'info', duration }),
};

// Helper functions
const getTypeIcon = (type: string) => {
  return {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'alert-triangle',
    info: 'info',
  }[type] || 'info';
};

const getTypeColors = (type: string) => {
  const colors = {
    success: {
      background: theme.colors.success + '15',
      accent: theme.colors.success,
      icon: theme.colors.success,
      text: theme.colors.onBackground,
    },
    error: {
      background: theme.colors.error + '15',
      accent: theme.colors.error,
      icon: theme.colors.error,
      text: theme.colors.onBackground,
    },
    warning: {
      background: '#F59E0B15',
      accent: '#F59E0B',
      icon: '#F59E0B',
      text: theme.colors.onBackground,
    },
    info: {
      background: theme.colors.primary + '15',
      accent: theme.colors.primary,
      icon: theme.colors.primary,
      text: theme.colors.onBackground,
    },
  };
  
  return colors[type as keyof typeof colors] || colors.info;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderLeftWidth: 4,
    ...theme.shadows.md,
    elevation: 8,
  },
  top: {
    top: 50,
  },
  bottom: {
    bottom: 50,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.md,
  },
  icon: {
    marginTop: 2, // Slight adjustment for optical alignment
  },
  message: {
    flex: 1,
    fontFamily: typography.fonts.medium,
    lineHeight: 22,
  },
  progressContainer: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    width: '100%',
  },
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
