import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../utils/theme';

interface MessageLoadingProps {
  message?: string;
}

export const MessageLoading: React.FC<MessageLoadingProps> = ({ 
  message = "Sending to the no-zone..." 
}) => {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    // Animated dots
    dot1.value = withRepeat(
      withTiming(1, { duration: 600 }),
      -1,
      true
    );
    
    dot2.value = withDelay(200, withRepeat(
      withTiming(1, { duration: 600 }),
      -1,
      true
    ));
    
    dot3.value = withDelay(400, withRepeat(
      withTiming(1, { duration: 600 }),
      -1,
      true
    ));

    // Shimmer effect
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1,
      false
    );
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: interpolate(dot1.value, [0, 1], [0.3, 1], Extrapolation.CLAMP),
    transform: [{
      scale: interpolate(dot1.value, [0, 1], [0.8, 1.2], Extrapolation.CLAMP)
    }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: interpolate(dot2.value, [0, 1], [0.3, 1], Extrapolation.CLAMP),
    transform: [{
      scale: interpolate(dot2.value, [0, 1], [0.8, 1.2], Extrapolation.CLAMP)
    }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: interpolate(dot3.value, [0, 1], [0.3, 1], Extrapolation.CLAMP),
    transform: [{
      scale: interpolate(dot3.value, [0, 1], [0.8, 1.2], Extrapolation.CLAMP)
    }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{
      translateX: interpolate(shimmer.value, [0, 1], [-200, 200], Extrapolation.CLAMP)
    }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.1)', 'rgba(6, 182, 212, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        />
        
        <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} />
        
        <Text style={styles.message}>{message}</Text>
        
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, dot1Style]} />
          <Animated.View style={[styles.dot, dot2Style]} />
          <Animated.View style={[styles.dot, dot3Style]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24,
  },

  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    overflow: 'hidden',
  },

  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: -200,
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ skewX: '-20deg' }],
  },

  message: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.onBackground,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.5,
  },

  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});
