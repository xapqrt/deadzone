import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { theme, typography } from '../utils/theme';
import { useResponsive } from '../utils/responsive';

const { width: screenWidth } = Dimensions.get('window');

interface MessageStatusBadgeProps {
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
}

interface PriorityBadgeProps {
  priority: 'high' | 'medium' | 'low';
  size?: 'small' | 'medium';
}

interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  backgroundColor?: string;
  height?: number;
  animated?: boolean;
  showPercentage?: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color?: string;
  onPress?: () => void;
  loading?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  actionText?: string;
  onAction?: () => void;
  illustration?: React.ReactNode;
}

interface NotificationBannerProps {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  visible: boolean;
  onDismiss: () => void;
  autoHide?: boolean;
  duration?: number;
}

// Message Status Badge Component
export const MessageStatusBadge: React.FC<MessageStatusBadgeProps> = ({
  status,
  showText = false,
  size = 'medium',
}) => {
  const { fontSize } = useResponsive();

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: 'clock',
          color: theme.colors.warning,
          text: 'Pending',
          backgroundColor: theme.colors.warningAlpha,
        };
      case 'sent':
        return {
          icon: 'check',
          color: theme.colors.success,
          text: 'Sent',
          backgroundColor: theme.colors.successAlpha,
        };
      case 'delivered':
        return {
          icon: 'check-circle',
          color: theme.colors.success,
          text: 'Delivered',
          backgroundColor: theme.colors.successAlpha,
        };
      case 'read':
        return {
          icon: 'eye',
          color: theme.colors.info,
          text: 'Read',
          backgroundColor: theme.colors.primaryAlpha,
        };
      case 'failed':
        return {
          icon: 'x-circle',
          color: theme.colors.error,
          text: 'Failed',
          backgroundColor: theme.colors.errorAlpha,
        };
      default:
        return {
          icon: 'help-circle',
          color: theme.colors.textMuted,
          text: 'Unknown',
          backgroundColor: theme.colors.surfaceVariant,
        };
    }
  };

  const config = getStatusConfig();
  const iconSize = size === 'small' ? 12 : size === 'medium' ? 16 : 20;
  const textSize = size === 'small' ? fontSize.xs : fontSize.sm;

  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      style={[
        styles.statusBadge,
        {
          backgroundColor: config.backgroundColor,
          paddingHorizontal: showText ? theme.spacing.sm : theme.spacing.xs,
          paddingVertical: theme.spacing.xs,
        }
      ]}
    >
      <Feather name={config.icon as any} size={iconSize} color={config.color} />
      {showText && (
        <Text style={[
          styles.statusText,
          { 
            color: config.color,
            fontSize: textSize,
            marginLeft: theme.spacing.xs,
          }
        ]}>
          {config.text}
        </Text>
      )}
    </Animated.View>
  );
};

// Priority Badge Component
export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'medium',
}) => {
  const { fontSize } = useResponsive();

  const getPriorityConfig = () => {
    switch (priority) {
      case 'high':
        return {
          color: theme.colors.error,
          backgroundColor: theme.colors.errorAlpha,
          text: 'High',
          icon: 'arrow-up',
        };
      case 'medium':
        return {
          color: theme.colors.warning,
          backgroundColor: theme.colors.warningAlpha,
          text: 'Medium',
          icon: 'minus',
        };
      case 'low':
        return {
          color: theme.colors.success,
          backgroundColor: theme.colors.successAlpha,
          text: 'Low',
          icon: 'arrow-down',
        };
    }
  };

  const config = getPriorityConfig();
  const iconSize = size === 'small' ? 10 : 12;
  const textSize = size === 'small' ? fontSize.xs : fontSize.sm;

  return (
    <View style={[
      styles.priorityBadge,
      {
        backgroundColor: config.backgroundColor,
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: 2,
      }
    ]}>
      <Feather name={config.icon as any} size={iconSize} color={config.color} />
      <Text style={[
        styles.priorityText,
        { 
          color: config.color,
          fontSize: textSize,
          marginLeft: 2,
        }
      ]}>
        {config.text}
      </Text>
    </View>
  );
};

// Progress Bar Component
export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = theme.colors.primary,
  backgroundColor = theme.colors.surfaceVariant,
  height = 6,
  animated = true,
  showPercentage = false,
}) => {
  const progressValue = useSharedValue(0);
  const { fontSize } = useResponsive();

  React.useEffect(() => {
    if (animated) {
      progressValue.value = withTiming(progress, { duration: 800 });
    } else {
      progressValue.value = progress;
    }
  }, [progress, animated]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progressValue.value, [0, 1], [0, 100])}%`,
  }));

  const percentage = Math.round(progress * 100);

  return (
    <View style={styles.progressContainer}>
      <View style={[
        styles.progressTrack,
        {
          backgroundColor,
          height,
          borderRadius: height / 2,
        }
      ]}>
        <Animated.View style={[
          styles.progressFill,
          progressStyle,
          {
            backgroundColor: color,
            height,
            borderRadius: height / 2,
          }
        ]} />
      </View>
      {showPercentage && (
        <Text style={[
          styles.progressText,
          { fontSize: fontSize.xs, marginLeft: theme.spacing.sm }
        ]}>
          {percentage}%
        </Text>
      )}
    </View>
  );
};

// Enhanced Stat Card Component
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = theme.colors.primary,
  onPress,
  loading = false,
  trend,
  trendValue,
}) => {
  const scale = useSharedValue(1);
  const { fontSize, spacing } = useResponsive();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.95);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1);
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return 'trending-up';
      case 'down': return 'trending-down';
      default: return 'minus';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return theme.colors.success;
      case 'down': return theme.colors.error;
      default: return theme.colors.textMuted;
    }
  };

  return (
    <Animated.View
      entering={SlideInDown.duration(400)}
      style={animatedStyle}
    >
      <TouchableOpacity
        style={[
          styles.statCard,
          {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.lg,
          }
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!onPress || loading}
        activeOpacity={0.8}
      >
        {icon && (
          <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
            <Feather name={icon as any} size={24} color={color} />
          </View>
        )}
        
        <View style={styles.statContent}>
          <Text style={[
            styles.statValue,
            { fontSize: fontSize.xxl, color: theme.colors.onBackground }
          ]}>
            {loading ? '...' : value}
          </Text>
          
          <Text style={[
            styles.statTitle,
            { fontSize: fontSize.sm, color: theme.colors.textSecondary }
          ]}>
            {title}
          </Text>
          
          {subtitle && (
            <Text style={[
              styles.statSubtitle,
              { fontSize: fontSize.xs, color: theme.colors.textMuted }
            ]}>
              {subtitle}
            </Text>
          )}
          
          {trend && trendValue && (
            <View style={styles.statTrend}>
              <Feather 
                name={getTrendIcon() as any} 
                size={12} 
                color={getTrendColor()} 
              />
              <Text style={[
                styles.statTrendText,
                { 
                  fontSize: fontSize.xs,
                  color: getTrendColor(),
                  marginLeft: 2,
                }
              ]}>
                {trendValue}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Empty State Component
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  actionText,
  onAction,
  illustration,
}) => {
  const { fontSize, spacing } = useResponsive();

  return (
    <Animated.View 
      entering={FadeIn.duration(600)}
      style={[
        styles.emptyState,
        { paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl }
      ]}
    >
      {illustration || (
        <View style={styles.emptyStateIcon}>
          <Feather 
            name={icon as any} 
            size={64} 
            color={theme.colors.textMuted} 
          />
        </View>
      )}
      
      <Text style={[
        styles.emptyStateTitle,
        { fontSize: fontSize.xl, marginTop: spacing.lg }
      ]}>
        {title}
      </Text>
      
      <Text style={[
        styles.emptyStateSubtitle,
        { fontSize: fontSize.md, marginTop: spacing.sm }
      ]}>
        {subtitle}
      </Text>
      
      {actionText && onAction && (
        <TouchableOpacity
          style={[
            styles.emptyStateAction,
            { marginTop: spacing.xl, paddingVertical: spacing.sm }
          ]}
          onPress={onAction}
        >
          <Text style={[
            styles.emptyStateActionText,
            { fontSize: fontSize.md }
          ]}>
            {actionText}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

// Notification Banner Component
export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  type,
  title,
  message,
  visible,
  onDismiss,
  autoHide = true,
  duration = 4000,
}) => {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const { fontSize, spacing } = useResponsive();

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: theme.colors.success,
          icon: 'check-circle',
          textColor: 'white',
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning,
          icon: 'alert-triangle',
          textColor: 'white',
        };
      case 'error':
        return {
          backgroundColor: theme.colors.error,
          icon: 'x-circle',
          textColor: 'white',
        };
      case 'info':
        return {
          backgroundColor: theme.colors.info,
          icon: 'info',
          textColor: 'white',
        };
    }
  };

  const config = getTypeConfig();

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0);
      opacity.value = withTiming(1);
      
      if (autoHide) {
        setTimeout(() => {
          onDismiss();
        }, duration);
      }
    } else {
      translateY.value = withTiming(-100);
      opacity.value = withTiming(0);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.notificationBanner, animatedStyle]}>
      <View style={[
        styles.notificationContent,
        {
          backgroundColor: config.backgroundColor,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }
      ]}>
        <Feather 
          name={config.icon as any} 
          size={20} 
          color={config.textColor} 
        />
        
        <View style={[styles.notificationText, { marginLeft: spacing.sm }]}>
          <Text style={[
            styles.notificationTitle,
            { 
              fontSize: fontSize.md,
              color: config.textColor,
            }
          ]}>
            {title}
          </Text>
          <Text style={[
            styles.notificationMessage,
            { 
              fontSize: fontSize.sm,
              color: config.textColor,
              opacity: 0.9,
            }
          ]}>
            {message}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.notificationDismiss, { padding: spacing.xs }]}
          onPress={onDismiss}
        >
          <Feather name="x" size={16} color={config.textColor} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Status Badge Styles
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontFamily: typography.fonts.medium,
  },

  // Priority Badge Styles
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  priorityText: {
    fontFamily: typography.fonts.medium,
  },

  // Progress Bar Styles
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    flex: 1,
    overflow: 'hidden',
  },
  progressFill: {},
  progressText: {
    fontFamily: typography.fonts.medium,
    color: theme.colors.textSecondary,
  },

  // Stat Card Styles
  statCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontFamily: typography.fonts.bold,
    marginBottom: 2,
  },
  statTitle: {
    fontFamily: typography.fonts.medium,
    marginBottom: 2,
  },
  statSubtitle: {
    fontFamily: typography.fonts.regular,
    marginBottom: theme.spacing.xs,
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statTrendText: {
    fontFamily: typography.fonts.medium,
  },

  // Empty State Styles
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 60,
  },
  emptyStateTitle: {
    fontFamily: typography.fonts.bold,
    color: theme.colors.onBackground,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontFamily: typography.fonts.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyStateAction: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
  },
  emptyStateActionText: {
    fontFamily: typography.fonts.medium,
    color: theme.colors.onPrimary,
  },

  // Notification Banner Styles
  notificationBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontFamily: typography.fonts.medium,
    marginBottom: 2,
  },
  notificationMessage: {
    fontFamily: typography.fonts.regular,
  },
  notificationDismiss: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
