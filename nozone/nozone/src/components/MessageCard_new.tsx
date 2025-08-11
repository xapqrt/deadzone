import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { Message } from '../types';
import { theme } from '../utils/theme';
import { formatDateTime, getTimeUntilDelivery, isMessageDue } from '../utils/helpers';

export interface MessageCardProps {
  message: Message;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
}

export const MessageCard: React.FC<MessageCardProps> = ({
  message,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const cardScale = useSharedValue(1);
  const expandRotation = useSharedValue(0);

  const handlePress = () => {
    setIsExpanded(!isExpanded);
    expandRotation.value = withTiming(isExpanded ? 0 : 180, { duration: 300 });
  };

  const handleEditPress = () => {
    cardScale.value = withSpring(0.95, { duration: 100 }, () => {
      cardScale.value = withSpring(1);
    });
    onEdit?.(message);
  };

  const handleDeletePress = () => {
    cardScale.value = withSpring(0.95, { duration: 100 }, () => {
      cardScale.value = withSpring(1);
    });
    onDelete?.(message);
  };

  const getStatusColor = () => {
    switch (message.status) {
      case 'sent':
        return theme.colors.success;
      case 'failed':
        return theme.colors.error;
      case 'pending':
        return theme.colors.warning;
      default:
        return theme.colors.textMuted;
    }
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sent':
        return 'check-circle';
      case 'failed':
        return 'x-circle';
      case 'pending':
        return 'clock';
      default:
        return 'help-circle';
    }
  };

  const getStatusText = () => {
    switch (message.status) {
      case 'sent':
        return 'Sent';
      case 'failed':
        return 'Failed';
      case 'pending':
        return isMessageDue(message.deliverAfter) ? 'Due' : 'Scheduled';
      default:
        return 'Unknown';
    }
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const expandIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${expandRotation.value}deg` }],
  }));

  const truncateText = (text: string, maxLength: number = 60) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <Animated.View style={[styles.container, cardAnimatedStyle]}>
      {/* Main Card Content */}
      <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
        <View style={styles.header}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
              <Feather 
                name={getStatusIcon() as any} 
                size={12} 
                color={getStatusColor()} 
              />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
          </View>
          
          <Animated.View style={expandIconStyle}>
            <Feather 
              name="chevron-down" 
              size={16} 
              color={theme.colors.textSecondary} 
            />
          </Animated.View>
        </View>

        <View style={styles.content}>
          <Text style={styles.messageText} numberOfLines={isExpanded ? undefined : 2}>
            {isExpanded ? message.text : truncateText(message.text)}
          </Text>
          
          <View style={styles.timeContainer}>
            <Feather name="calendar" size={12} color={theme.colors.textMuted} />
            <Text style={styles.timeText}>
              {formatDateTime(message.deliverAfter)}
            </Text>
          </View>

          {message.status === 'pending' && !isMessageDue(message.deliverAfter) && (
            <View style={styles.countdownContainer}>
              <Feather name="clock" size={12} color={theme.colors.warning} />
              <Text style={styles.countdownText}>
                {getTimeUntilDelivery(message.deliverAfter)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded Actions */}
      {isExpanded && (
        <Animated.View 
          style={styles.actions}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
        >
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleEditPress}
          >
            <Feather name="edit-3" size={16} color={theme.colors.primary} />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          
          <View style={styles.actionDivider} />
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleDeletePress}
          >
            <Feather name="trash-2" size={16} color={theme.colors.error} />
            <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statusContainer: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.round,
  },
  statusText: {
    fontSize: theme.fontSizes.xs,
    fontFamily: theme.fonts.medium,
    marginLeft: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
  },
  messageText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.onSurface,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  timeText: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textMuted,
    marginLeft: theme.spacing.xs,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
    color: theme.colors.warning,
    marginLeft: theme.spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.xs,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
  },
  actionButtonText: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
  },
  actionDivider: {
    width: 1,
    backgroundColor: theme.colors.divider,
  },
});
