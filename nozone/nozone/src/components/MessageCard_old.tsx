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
  const contentHeight = useSharedValue(0);

  const handlePress = () => {
    setIsExpanded(!isExpanded);
    contentHeight.value = withTiming(isExpanded ? 0 : 1, { duration: 300 });
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
        return 'checkmark-circle';
      case 'failed':
        return 'close-circle';
      case 'pending':
        return 'time';
      default:
        return 'help-circle';
    }
  };

  const isDue = isMessageDue(message.deliverAfter);
  const timeInfo = message.status === 'pending' 
    ? (isDue ? 'Due now' : getTimeUntilDelivery(message.deliverAfter))
    : formatDateTime(message.createdAt);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <Ionicons
            name={getStatusIcon() as any}
            size={16}
            color={getStatusColor()}
            style={styles.statusIcon}
          />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
          </Text>
        </View>
        
        <View style={styles.actions}>
          {message.status === 'pending' && onEdit && (
            <TouchableOpacity
              onPress={() => onEdit(message)}
              style={styles.actionButton}
            >
              <Ionicons name="pencil" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
          
          {onDelete && (
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.actionButton}
            >
              <Ionicons name="trash" size={16} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.messageText} numberOfLines={3}>
        {message.text}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.phoneText}>To: {message.phone}</Text>
        <Text style={[
          styles.timeText,
          isDue && message.status === 'pending' && styles.dueText
        ]}>
          {timeInfo}
        </Text>
      </View>

      {message.status === 'pending' && isDue && (
        <View style={styles.dueIndicator}>
          <Ionicons name="alert-circle" size={12} color={theme.colors.warning} />
          <Text style={styles.dueIndicatorText}>Ready to send</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },

  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusIcon: {
    marginRight: theme.spacing.xs,
  },

  statusText: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '600',
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  actionButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },

  messageText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.onSurface,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  phoneText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },

  timeText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },

  dueText: {
    color: theme.colors.warning,
    fontWeight: '600',
  },

  dueIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  dueIndicatorText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.warning,
    marginLeft: theme.spacing.xs,
    fontWeight: '600',
  },
});
