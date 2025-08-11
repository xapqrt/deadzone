import { Animated, Easing, Platform } from 'react-native';
import { focusManagement } from './accessibility';

// Motion principles: "Slow is okay" - calm, purposeful animations
export const motionPrinciples = {
  // Core timing values (slightly slower for calm feel)
  fast: 200,
  normal: 350,
  slow: 500,
  
  // Easing curves optimized for calm motion
  easing: {
    // Gentle ease for most animations
    calm: Easing.bezier(0.25, 0.1, 0.25, 1),
    // Subtle bounce for feedback
    bounce: Easing.bezier(0.68, -0.55, 0.265, 1.55),
    // Linear for progress indicators
    linear: Easing.linear,
    // Smooth deceleration
    decelerate: Easing.out(Easing.quad),
    // Gentle acceleration
    accelerate: Easing.in(Easing.quad),
  },
} as const;

// Device performance categories
export const devicePerformance = {
  // Detect device performance level
  getPerformanceLevel: (): 'high' | 'medium' => {
    // Use platform and available memory as indicators
    if (Platform.OS === 'ios') {
      return 'high'; // iOS generally has good performance
    }
    
    // For Android, assume medium performance as default
    // In a real app, you could use DeviceInfo to get more details
    return 'medium';
  },
  
  // Animation timing based on device performance
  getTimingForDevice: () => {
    const level = devicePerformance.getPerformanceLevel();
    
    switch (level) {
      case 'high':
        return {
          fast: motionPrinciples.fast,
          normal: motionPrinciples.normal,
          slow: motionPrinciples.slow,
        };
      case 'medium':
        return {
          fast: motionPrinciples.fast * 0.8, // Slightly faster for smoother feel
          normal: motionPrinciples.normal * 0.9,
          slow: motionPrinciples.slow * 0.9,
        };
      default:
        return {
          fast: motionPrinciples.fast,
          normal: motionPrinciples.normal,
          slow: motionPrinciples.slow,
        };
    }
  },
};

// Accessibility-aware animation factory
export const createCalmAnimation = async (
  animatedValue: Animated.Value,
  toValue: number,
  duration?: number,
  easing = motionPrinciples.easing.calm
) => {
  // Check if user prefers reduced motion
  const reduceMotion = await focusManagement.isReduceMotionEnabled();
  
  if (reduceMotion) {
    // Instant animation for reduced motion
    animatedValue.setValue(toValue);
    return Promise.resolve();
  }
  
  // Use device-appropriate timing
  const timing = devicePerformance.getTimingForDevice();
  const animationDuration = duration || timing.normal;
  
  return new Promise<void>((resolve) => {
    Animated.timing(animatedValue, {
      toValue,
      duration: animationDuration,
      easing,
      useNativeDriver: true,
    }).start(() => resolve());
  });
};

// Pre-built calm animations
export const calmAnimations = {
  // Fade in animation
  fadeIn: (animatedValue: Animated.Value, duration?: number) => 
    createCalmAnimation(animatedValue, 1, duration),
  
  // Fade out animation
  fadeOut: (animatedValue: Animated.Value, duration?: number) => 
    createCalmAnimation(animatedValue, 0, duration),
  
  // Slide up animation
  slideUp: (animatedValue: Animated.Value, fromValue = 50, duration?: number) => {
    animatedValue.setValue(fromValue);
    return createCalmAnimation(animatedValue, 0, duration);
  },
  
  // Slide down animation  
  slideDown: (animatedValue: Animated.Value, toValue = 50, duration?: number) =>
    createCalmAnimation(animatedValue, toValue, duration),
  
  // Scale in animation (gentle zoom)
  scaleIn: (animatedValue: Animated.Value, duration?: number) => {
    animatedValue.setValue(0.95);
    return createCalmAnimation(
      animatedValue, 
      1, 
      duration, 
      motionPrinciples.easing.bounce
    );
  },
  
  // Scale out animation
  scaleOut: (animatedValue: Animated.Value, duration?: number) =>
    createCalmAnimation(animatedValue, 0.95, duration),
  
  // Gentle bounce for feedback
  bounce: (animatedValue: Animated.Value) => {
    return Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.05,
        duration: devicePerformance.getTimingForDevice().fast,
        easing: motionPrinciples.easing.accelerate,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: devicePerformance.getTimingForDevice().fast,
        easing: motionPrinciples.easing.decelerate,
        useNativeDriver: true,
      }),
    ]);
  },
  
  // Typing indicator animation
  typingPulse: (animatedValue: Animated.Value) => {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.5,
          duration: devicePerformance.getTimingForDevice().slow,
          easing: motionPrinciples.easing.calm,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: devicePerformance.getTimingForDevice().slow,
          easing: motionPrinciples.easing.calm,
          useNativeDriver: true,
        }),
      ])
    );
  },
};

// Layout animation presets
export const layoutAnimations = {
  // Gentle layout changes
  gentle: {
    duration: devicePerformance.getTimingForDevice().normal,
    create: {
      type: 'easeInEaseOut' as const,
      property: 'opacity' as const,
    },
    update: {
      type: 'easeInEaseOut' as const,
    },
    delete: {
      type: 'easeInEaseOut' as const,
      property: 'opacity' as const,
    },
  },
  
  // List item animations
  listItem: {
    duration: devicePerformance.getTimingForDevice().fast,
    create: {
      type: 'linear' as const,
      property: 'scaleY' as const,
    },
    update: {
      type: 'easeInEaseOut' as const,
    },
    delete: {
      type: 'linear' as const,
      property: 'scaleY' as const,
    },
  },
};

// Spring animations for natural motion
export const springAnimations = {
  // Gentle spring for UI feedback
  gentle: {
    damping: 15,
    mass: 1,
    stiffness: 150,
    restDisplacementThreshold: 0.001,
    restSpeedThreshold: 0.001,
  },
  
  // Bouncy spring for interactions
  bouncy: {
    damping: 8,
    mass: 1,
    stiffness: 100,
    restDisplacementThreshold: 0.001,
    restSpeedThreshold: 0.001,
  },
  
  // Smooth spring for scrolling
  smooth: {
    damping: 20,
    mass: 1,
    stiffness: 200,
    restDisplacementThreshold: 0.001,
    restSpeedThreshold: 0.001,
  },
};

// Animation sequences for complex interactions
export const animationSequences = {
  // Message send animation
  messageSend: async (
    messageScale: Animated.Value,
    messageOpacity: Animated.Value,
    buttonScale: Animated.Value
  ) => {
    // 1. Scale down message slightly
    await createCalmAnimation(messageScale, 0.98, devicePerformance.getTimingForDevice().fast);
    
    // 2. Bounce send button
    calmAnimations.bounce(buttonScale).start();
    
    // 3. Fade out message
    await createCalmAnimation(messageOpacity, 0.7);
    
    // 4. Scale back to normal
    await createCalmAnimation(messageScale, 1);
    
    // 5. Fade back in
    await createCalmAnimation(messageOpacity, 1);
  },
  
  // New message arrival
  messageReceive: async (
    containerTranslateY: Animated.Value,
    containerOpacity: Animated.Value
  ) => {
    // Start from below and invisible
    containerTranslateY.setValue(20);
    containerOpacity.setValue(0);
    
    // Animate in gently
    await Promise.all([
      createCalmAnimation(containerTranslateY, 0),
      createCalmAnimation(containerOpacity, 1),
    ]);
  },
  
  // Screen transition
  screenTransition: async (
    outgoingOpacity: Animated.Value,
    incomingOpacity: Animated.Value,
    incomingTranslateX: Animated.Value
  ) => {
    // Setup incoming screen
    incomingOpacity.setValue(0);
    incomingTranslateX.setValue(20);
    
    // Parallel transition
    await Promise.all([
      createCalmAnimation(outgoingOpacity, 0),
      createCalmAnimation(incomingOpacity, 1),
      createCalmAnimation(incomingTranslateX, 0),
    ]);
  },
  
  // Loading state animation
  loadingPulse: (opacity: Animated.Value) => {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: devicePerformance.getTimingForDevice().slow,
          easing: motionPrinciples.easing.calm,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: devicePerformance.getTimingForDevice().slow,
          easing: motionPrinciples.easing.calm,
          useNativeDriver: true,
        }),
      ])
    );
  },
};

// Interaction feedback animations
export const feedbackAnimations = {
  // Button press feedback
  buttonPress: (scale: Animated.Value) => {
    return Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.96,
        duration: 100,
        easing: motionPrinciples.easing.accelerate,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 150,
        easing: motionPrinciples.easing.decelerate,
        useNativeDriver: true,
      }),
    ]);
  },
  
  // Success animation
  success: (scale: Animated.Value, opacity: Animated.Value) => {
    return Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.1,
          duration: devicePerformance.getTimingForDevice().fast,
          easing: motionPrinciples.easing.bounce,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: devicePerformance.getTimingForDevice().normal,
          easing: motionPrinciples.easing.decelerate,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: devicePerformance.getTimingForDevice().fast,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
        Animated.timing(opacity, {
          toValue: 0,
          duration: devicePerformance.getTimingForDevice().normal,
          useNativeDriver: true,
        }),
      ]),
    ]);
  },
  
  // Error shake animation
  errorShake: (translateX: Animated.Value) => {
    return Animated.sequence([
      Animated.timing(translateX, {
        toValue: -10,
        duration: 100,
        easing: motionPrinciples.easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 10,
        duration: 100,
        easing: motionPrinciples.easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: -5,
        duration: 100,
        easing: motionPrinciples.easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 100,
        easing: motionPrinciples.easing.decelerate,
        useNativeDriver: true,
      }),
    ]);
  },
};
