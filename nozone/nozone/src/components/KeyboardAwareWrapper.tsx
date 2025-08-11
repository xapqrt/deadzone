import React, { useEffect, ReactNode } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Keyboard,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: screenHeight } = Dimensions.get('window');

interface KeyboardAwareWrapperProps {
  children: ReactNode;
  style?: any;
  offset?: number; // Additional offset from keyboard (default: 20)
  animationType?: 'spring' | 'timing';
  enabled?: boolean;
  maxShiftRatio?: number; // Max portion of available height to shift (default: 0.4)
}

export const KeyboardAwareWrapper: React.FC<KeyboardAwareWrapperProps> = ({
  children,
  style,
  offset = 20,
  animationType = 'spring',
  enabled = true,
  maxShiftRatio = 0.4,
}) => {
  const translateY = useSharedValue(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!enabled) return;

    const keyboardWillShow = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardWillHide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardShowListener = Keyboard.addListener(keyboardWillShow, (event) => {
      const keyboardHeight = event.endCoordinates.height;
      const availableHeight = screenHeight - insets.top - insets.bottom;
      
      // Calculate how much to move up to keep content just above keyboard
      const moveUpAmount = Math.min(
        keyboardHeight + offset - insets.bottom,
        availableHeight * maxShiftRatio // Limit shift by ratio
      );

      if (animationType === 'spring') {
        translateY.value = withSpring(-moveUpAmount, {
          damping: 20,
          stiffness: 300,
          mass: 0.8,
        });
      } else {
        translateY.value = withTiming(-moveUpAmount, {
          duration: event.duration || 250,
        });
      }
    });

    const keyboardHideListener = Keyboard.addListener(keyboardWillHide, (event) => {
      if (animationType === 'spring') {
        translateY.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
          mass: 0.8,
        });
      } else {
        translateY.value = withTiming(0, {
          duration: event?.duration || 250,
        });
      }
    });

    return () => {
      keyboardShowListener?.remove();
      keyboardHideListener?.remove();
    };
  }, [enabled, offset, animationType, insets]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
