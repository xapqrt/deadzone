import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SupabaseService } from '../services/supabase';
import { NetworkService } from '../services/network';
import { theme, typography } from '../utils/theme';
import { Button } from '../components/ui/Button';
import { InboxConversation, User } from '../types';

interface DirectInboxScreenProps {
  user: User;
  onBack: () => void;
  onOpenChat: (conversationId: string, otherUser: { id: string; username: string; name: string }) => void;
  onStartNewChat: () => void;
}

export const DirectInboxScreen: React.FC<DirectInboxScreenProps> = ({
  user,
  onBack,
  onOpenChat,
  onStartNewChat,
}) => {
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const headerScale = useSharedValue(1);

  useEffect(() => {
    loadInbox();
    checkNetworkStatus();
  }, []);

  const checkNetworkStatus = async () => {
    const status = await NetworkService.getCurrentStatus();
    setIsOnline(status.isConnected);
  };

  const loadInbox = async () => {
    try {
      const inbox = await SupabaseService.getUserInbox(user.id);
      setConversations(inbox);
    } catch (error) {
      console.error('Failed to load inbox:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInbox();
    setRefreshing(false);
  }, []);

  const handleConversationPress = (conversation: InboxConversation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpenChat(conversation.conversationId, {
      id: conversation.otherUserId,
      username: conversation.otherUsername,
      name: conversation.otherName,
    });
  };

  const handleNewChatPress = () => {
    headerScale.value = withSpring(0.95, {}, () => {
      headerScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStartNewChat();
  };

  const formatLastMessageTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderEmptyState = () => (
    <Animated.View entering={FadeIn.delay(300)} style={styles.emptyState}>
      <Feather name="message-circle" size={64} color={theme.colors.textSecondary} />
      <Text style={styles.emptyTitle}>Nothing here yet.</Text>
      <Text style={styles.emptySubtitle}>
        Start something beautiful.
      </Text>
      <Button
        title="Start New Chat"
        onPress={handleNewChatPress}
        variant="primary"
        style={styles.startChatButton}
      />
    </Animated.View>
  );

  const renderConversation = ({ item, index }: { item: InboxConversation; index: number }) => (
    <Animated.View entering={SlideInRight.delay(index * 100)}>
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.otherName.charAt(0).toUpperCase()}
            </Text>
          </View>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {item.otherName}
            </Text>
            <Text style={styles.conversationTime}>
              {formatLastMessageTime(item.lastMessageAt)}
            </Text>
          </View>
          <View style={styles.conversationPreview}>
            <Text style={styles.conversationUsername}>@{item.otherUsername}</Text>
            <Text 
              style={[
                styles.lastMessage,
                item.unreadCount > 0 && styles.lastMessageUnread
              ]} 
              numberOfLines={1}
            >
              {item.lastMessageSenderId === user.id ? 'You: ' : ''}
              {item.lastMessageText}
            </Text>
          </View>
        </View>

        <Feather 
          name="chevron-right" 
          size={20} 
          color={theme.colors.textSecondary} 
        />
      </TouchableOpacity>
    </Animated.View>
  );

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Threads</Text>
        <TouchableOpacity onPress={handleNewChatPress} style={styles.newChatButton}>
          <Feather name="edit" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </Animated.View>

      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <Feather name="wifi-off" size={16} color={theme.colors.warning} />
          <Text style={styles.offlineText}>Offline - Messages will sync when online</Text>
        </View>
      )}

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.conversationId}
        renderItem={renderConversation}
        contentContainerStyle={[
          styles.listContainer,
          conversations.length === 0 && styles.emptyListContainer
        ]}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    ...typography.h2,
    color: theme.colors.onSurface,
    flex: 1,
    textAlign: 'center',
  },
  newChatButton: {
    padding: theme.spacing.xs,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.offlineBanner,
    gap: theme.spacing.xs,
  },
  offlineText: {
    ...typography.caption,
    color: theme.colors.warning,
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: theme.colors.onSurface,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.bodyLarge,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    lineHeight: 24,
  },
  startChatButton: {
    marginTop: theme.spacing.xl,
    minWidth: 200,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.h3,
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  unreadText: {
    ...typography.caption,
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationName: {
    ...typography.bodyLarge,
    color: theme.colors.onSurface,
    fontWeight: '600',
    flex: 1,
  },
  conversationTime: {
    ...typography.caption,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  conversationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  conversationUsername: {
    ...typography.caption,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  lastMessage: {
    ...typography.bodyMedium,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  lastMessageUnread: {
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
});
