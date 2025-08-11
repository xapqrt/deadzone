import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SupabaseService } from '../services/supabase';
import { NetworkService } from '../services/network';
import { theme, typography } from '../utils/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../utils/responsive';
import { accessibleProps, accessibilityLabels, focusManagement } from '../utils/accessibility';
import { calmAnimations, animationSequences } from '../utils/motion';
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

  const { device, spacing, fontSize, touchTarget, isSmall } = useResponsive();
  
  // Animation refs
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;
  const composeButtonScale = useRef(new Animated.Value(1)).current;
  
  // Screen reader focus ref
  const headerRef = useRef<View>(null);

  useEffect(() => {
    loadInbox();
    checkNetworkStatus();
    
    // Animate screen entrance
    animateScreenIn();
    
    // Set initial focus for screen readers
    setTimeout(() => {
      focusManagement.setFocus(headerRef);
    }, 300);
  }, []);

  const animateScreenIn = async () => {
    headerOpacity.setValue(0);
    listOpacity.setValue(0);
    
    await Promise.all([
      calmAnimations.fadeIn(headerOpacity, 400),
      calmAnimations.fadeIn(listOpacity, 600),
    ]);
  };

  const checkNetworkStatus = async () => {
    const status = await NetworkService.getCurrentStatus();
    setIsOnline(status.isConnected);
  };

  const loadInbox = async () => {
    try {
      const inbox = await SupabaseService.getUserInbox(user.id);
      setConversations(inbox);
      
      // Announce to screen reader if messages loaded
      if (inbox.length > 0) {
        focusManagement.announce(`${inbox.length} conversations loaded`);
      }
    } catch (error) {
      console.error('Failed to load inbox:', error);
      focusManagement.announce('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInbox();
    setRefreshing(false);
    focusManagement.announce('Conversations refreshed');
  }, []);

  const handleConversationPress = async (conversation: InboxConversation) => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Scale animation
    const scale = new Animated.Value(1);
    calmAnimations.scaleIn(scale).then(() => {
      onOpenChat(conversation.conversationId, {
        id: conversation.otherUserId,
        username: conversation.otherUsername,
        name: conversation.otherName,
      });
    });
  };

  const handleNewChatPress = async () => {
    // Button feedback animation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Bounce animation
    calmAnimations.bounce(composeButtonScale).start(() => {
      onStartNewChat();
    });
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
    return date.toLocaleDateString();
  };

  const ConversationItem = memo(({ item, index }: { item: InboxConversation; index: number }) => {
    const itemOpacityRef = useRef(new Animated.Value(0));

    useEffect(() => {
      const timeout = setTimeout(() => {
        calmAnimations.fadeIn(itemOpacityRef.current, 300);
      }, index * 50);
      return () => clearTimeout(timeout);
    }, [index]);

    return (
      <Animated.View style={{ opacity: itemOpacityRef.current }}>
        <TouchableOpacity
          style={[
            styles.conversationItem,
            {
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              minHeight: touchTarget.minHeight,
            }
          ]}
          onPress={() => handleConversationPress(item)}
          {...accessibleProps.conversation(
            item.otherName || item.otherUsername,
            item.lastMessageText || 'No messages yet',
            formatLastMessageTime(new Date(item.lastMessageAt)),
            item.unreadCount
          )}
        >
          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Text 
                style={[
                  styles.conversationName,
                  { fontSize: fontSize.md, lineHeight: fontSize.md * 1.4 }
                ]}
                numberOfLines={1}
              >
                {item.otherName || item.otherUsername}
              </Text>
              <Text 
                style={[
                  styles.conversationTime,
                  { fontSize: fontSize.sm }
                ]}
              >
                {formatLastMessageTime(new Date(item.lastMessageAt))}
              </Text>
            </View>
            
            <View style={styles.conversationPreview}>
              <Text 
                style={[
                  styles.conversationMessage,
                  { fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.3 }
                ]}
                numberOfLines={2}
              >
                {item.lastMessageText || 'No messages yet'}
              </Text>
              {item.unreadCount > 0 && (
                <View 
                  style={[
                    styles.unreadBadge,
                    { minWidth: touchTarget.minSize, minHeight: touchTarget.minSize }
                  ]}
                >
                  <Text 
                    style={[
                      styles.unreadCount,
                      { fontSize: fontSize.xs }
                    ]}
                  >
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  });

  const renderConversationItem = ({ item, index }: { item: InboxConversation; index: number }) => (
    <ConversationItem item={item} index={index} />
  );

  const renderEmptyState = () => (
    <View style={[styles.emptyState, { paddingHorizontal: spacing.lg }]}>
      <Feather 
        name="message-circle" 
        size={isSmall ? 48 : 64} 
        color={theme.colors.textSecondary} 
      />
      <Text 
        style={[
          styles.emptyTitle,
          { 
            fontSize: fontSize.lg,
            lineHeight: fontSize.lg * 1.4,
            marginTop: spacing.md,
            marginBottom: spacing.sm,
          }
        ]}
      >
        Nothing here yet
      </Text>
      <Text 
        style={[
          styles.emptySubtitle,
          { 
            fontSize: fontSize.md,
            lineHeight: fontSize.md * 1.5,
            marginBottom: spacing.lg,
          }
        ]}
      >
        Start something beautiful with your first message
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#F0FDF4', '#FFFFFF']}
        style={styles.gradientBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {/* Header */}
      <Animated.View 
        ref={headerRef}
        style={[
          styles.header,
          { 
            opacity: headerOpacity,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }
        ]}
        {...accessibleProps.header('Your Threads')}
      >
        <TouchableOpacity
          style={[
            styles.backButton,
            { 
              minWidth: touchTarget.minSize,
              minHeight: touchTarget.minSize,
            }
          ]}
          onPress={onBack}
          {...accessibleProps.button(accessibilityLabels.backButton)}
        >
          <Feather name="arrow-left" size={24} color={'#065F46'} />
        </TouchableOpacity>
        
        <Text 
          style={[
            styles.headerTitle,
            { fontSize: fontSize.xl, lineHeight: fontSize.xl * 1.2 }
          ]}
        >
          Your Threads
        </Text>
        
        <Animated.View style={{ transform: [{ scale: composeButtonScale }] }}>
          <TouchableOpacity
            style={[
              styles.composeButton,
              { 
                minWidth: touchTarget.minSize,
                minHeight: touchTarget.minSize,
              }
            ]}
            onPress={handleNewChatPress}
            {...accessibleProps.button(accessibilityLabels.composeButton)}
          >
            <Feather name="edit-3" size={20} color={'#16A34A'} />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Offline indicator */}
      {!isOnline && (
        <View 
          style={[styles.offlineBar, { paddingHorizontal: spacing.md }]}
          {...accessibleProps.status('Offline', 'You are currently offline. Messages will send when online.')}
        >
          <Feather name="wifi-off" size={16} color={'#CA8A04'} />
          <Text style={[styles.offlineText, { fontSize: fontSize.sm }]}>Working offline</Text>
        </View>
      )}

      {/* Conversations list */}
      <Animated.View style={[styles.listContainer, { opacity: listOpacity }]}>
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.conversationId}
          contentContainerStyle={[styles.listContent, { paddingBottom: spacing.xl }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={'#16A34A'}
              colors={['#16A34A']}
            />
          }
          ListEmptyComponent={!loading ? renderEmptyState : null}
          showsVerticalScrollIndicator={false}
          accessible={true}
          accessibilityLabel="Conversations list"
        />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradientBg: { ...StyleSheet.absoluteFillObject },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderColor: 'transparent',
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: typography.fonts.medium,
    color: '#065F46',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  composeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: '#FDE68A',
  },
  offlineText: {
    color: '#B45309',
    fontFamily: typography.fonts.medium,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  conversationItem: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 0,
    borderRadius: 16,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontFamily: typography.fonts.medium,
    color: '#065F46',
    flex: 1,
  },
  conversationTime: {
    fontFamily: typography.fonts.regular,
    color: '#64748B',
    marginLeft: 8,
  },
  conversationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conversationMessage: {
    fontFamily: typography.fonts.regular,
    color: '#475569',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
    minHeight: 24,
  },
  unreadCount: {
    color: 'white',
    fontFamily: typography.fonts.medium,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: typography.fonts.medium,
    color: '#065F46',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: typography.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
  },
});
