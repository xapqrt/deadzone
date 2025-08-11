import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  interpolateColor 
} from 'react-native-reanimated';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { theme } from '../utils/theme';

interface NetworkStatusBarProps {
  style?: any;
}

export const NetworkStatusBar: React.FC<NetworkStatusBarProps> = ({ style }) => {
  const { isOnline, connectionType } = useOnlineStatus();
  const pulseAnimation = useSharedValue(0);
  
  useEffect(() => {
    if (isOnline) {
      pulseAnimation.value = withRepeat(
        withTiming(1, { duration: 2000 }),
        -1,
        true
      );
    } else {
      pulseAnimation.value = withTiming(0, { duration: 500 });
    }
  }, [isOnline, pulseAnimation]);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      pulseAnimation.value,
      [0, 1],
      [isOnline ? theme.colors.success : theme.colors.error, 
       isOnline ? theme.colors.successAlpha : theme.colors.errorAlpha]
    );

    return {
      backgroundColor,
    };
  });

  const dotAnimatedStyle = useAnimatedStyle(() => {
    const scale = 1 + pulseAnimation.value * 0.2;
    const opacity = 0.8 + pulseAnimation.value * 0.2;

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.statusDot, 
            { backgroundColor: isOnline ? theme.colors.success : theme.colors.error },
            dotAnimatedStyle
          ]} 
        />
        <Text style={styles.statusText}>
          {isOnline ? `Online${connectionType ? ` (${connectionType})` : ''}` : 'Offline'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.sm,
  },
  statusText: {
    color: theme.colors.onBackground,
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
  },
});
