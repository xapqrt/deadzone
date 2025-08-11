import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../utils/theme';

interface MessageSuccessProps {
  message: string;
  recipientName: string;
  isScheduled?: boolean;
  scheduledTime?: Date;
  onComplete: () => void;
}

export const MessageSuccess: React.FC<MessageSuccessProps> = ({ 
  message, 
  recipientName, 
  onComplete 
}) => {
  const checkScale = useSharedValue(0);
  const cardScale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const ringScale = useSharedValue(0);
  const sparkleRotate = useSharedValue(0);

  useEffect(() => {
    // Entry animation sequence
    opacity.value = withTiming(1, { duration: 300 });
    cardScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    
    // Check mark animation
    checkScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 400 }));
    
    // Success ring animation
    ringScale.value = withDelay(300, withSpring(1.2, { damping: 10 }, () => {
      ringScale.value = withSpring(1);
    }));
    
    // Sparkle rotation
    sparkleRotate.value = withDelay(500, withTiming(360, { duration: 1000 }));
    
    // Auto dismiss after animation
    setTimeout(() => {
      opacity.value = withTiming(0, { duration: 300 });
      cardScale.value = withTiming(0.8, { duration: 300 });
      setTimeout(onComplete, 300);
    }, 2500);
  }, []);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparkleRotate.value}deg` }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.card, cardAnimatedStyle]}>
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.1)', 'rgba(6, 182, 212, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        />
        
        <Animated.View style={[styles.successRing, ringAnimatedStyle]} />
        
        <View style={styles.iconContainer}>
          <Animated.View style={[styles.checkContainer, checkAnimatedStyle]}>
            <Text style={styles.checkIcon}>✓</Text>
          </Animated.View>
          
          <Animated.View style={[styles.sparkles, sparkleAnimatedStyle]}>
            <Text style={styles.sparkle}>✨</Text>
          </Animated.View>
        </View>
        
        <Text style={styles.title}>Message Queued!</Text>
        <Text style={styles.subtitle}>
          Will send to <Text style={styles.recipientName}>{recipientName}</Text> when you're back online
        </Text>
        
        <View style={styles.messagePreview}>
          <Text style={styles.messageText} numberOfLines={2}>
            "{message}"
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 24,
    zIndex: 1000,
  },

  card: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 24,
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

  successRing: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },

  iconContainer: {
    position: 'relative',
    marginBottom: 24,
  },

  checkContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },

  checkIcon: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  sparkles: {
    position: 'absolute',
    top: -10,
    right: -10,
  },

  sparkle: {
    fontSize: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.onBackground,
    marginBottom: 8,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },

  recipientName: {
    color: theme.colors.primary,
    fontWeight: '600',
  },

  messagePreview: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  messageText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
});
