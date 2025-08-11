import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { theme } from '../utils/theme';
import { useResponsive } from '../utils/responsive';

interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  isOnline: boolean;
  avatar?: string;
}

interface DirectInboxScreenEnhancedProps {
  onConversationPress: (conversation: Conversation) => void;
  onComposePress: () => void;
}

export const DirectInboxScreenEnhanced: React.FC<DirectInboxScreenEnhancedProps> = ({
  onConversationPress,
  onComposePress,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const responsive = useResponsive();
  const styles = createResponsiveStyles(responsive);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      // Mock data for demonstration
      const mockConversations: Conversation[] = [
        {
          id: '1',
          contactName: 'John Doe',
          contactPhone: '+1234567890',
          lastMessage: 'Hey, how are you doing?',
          timestamp: new Date(Date.now() - 30000),
          unreadCount: 2,
          isOnline: true,
        },
        {
          id: '2',
          contactName: 'Sarah Wilson',
          contactPhone: '+1987654321',
          lastMessage: 'See you tomorrow!',
          timestamp: new Date(Date.now() - 3600000),
          unreadCount: 0,
          isOnline: false,
        },
        {
          id: '3',
          contactName: 'Mike Johnson',
          contactPhone: '+1122334455',
          lastMessage: 'Thanks for the help',
          timestamp: new Date(Date.now() - 86400000),
          unreadCount: 1,
          isOnline: true,
        },
      ];
      
      setConversations(mockConversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
    
    return timestamp.toLocaleDateString();
  };

  const renderConversation = ({ item, index }: { item: Conversation; index: number }) => {
    const animatedValue = new Animated.Value(0);
    
    // Stagger animation
    setTimeout(() => {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }).start();
    }, 100);

    const handlePress = () => {
      Haptics.selectionAsync();
      onConversationPress(item);
    };

    return (
      <Animated.View
        style={[
          styles.conversationContainer,
          {
            opacity: animatedValue,
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.conversationItem} 
          onPress={handlePress}
          activeOpacity={0.7}
        >
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, item.isOnline && styles.onlineAvatar]}>
              <Ionicons 
                name="person" 
                size={responsive.fontSize.lg} 
                color={theme.colors.textSecondary} 
              />
            </View>
            {item.isOnline && <View style={styles.onlineIndicator} />}
          </View>

          {/* Content */}
          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Text style={styles.contactName} numberOfLines={1}>
                {item.contactName}
              </Text>
              <Text style={styles.timestamp}>
                {formatTimestamp(item.timestamp)}
              </Text>
            </View>
            
            <View style={styles.conversationFooter}>
              <Text 
                style={[
                  styles.lastMessage,
                  item.unreadCount > 0 && styles.unreadMessage,
                ]} 
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>
              
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Arrow */}
          <Ionicons 
            name="chevron-forward" 
            size={responsive.fontSize.md} 
            color={theme.colors.textMuted} 
            style={styles.arrow}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name="chatbubbles-outline" 
        size={responsive.fontSize.xxxl} 
        color={theme.colors.textSecondary} 
      />
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySubtitle}>
        Start a conversation by tapping the compose button
      </Text>
      <TouchableOpacity 
        style={styles.startButton} 
        onPress={onComposePress}
      >
        <Text style={styles.startButtonText}>Start Messaging</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>Messages</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={styles.headerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons 
            name="search" 
            size={responsive.fontSize.lg} 
            color={theme.colors.text} 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={onComposePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons 
            name="create-outline" 
            size={responsive.fontSize.lg} 
            color={theme.colors.primary} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          conversations.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onComposePress();
        }}
        activeOpacity={0.8}
      >
        <Ionicons 
          name="add" 
          size={responsive.fontSize.xl} 
          color={theme.colors.background} 
        />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const createResponsiveStyles = (responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: responsive.spacing.md,
    paddingVertical: responsive.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    height: responsive.layout.headerHeight,
  },
  
  headerTitle: {
    fontSize: responsive.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  headerButton: {
    padding: responsive.spacing.sm,
    marginLeft: responsive.spacing.xs,
    minWidth: responsive.layout.minTouchTarget,
    minHeight: responsive.layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: responsive.spacing.md,
  },
  
  listContent: {
    paddingVertical: responsive.spacing.sm,
  },
  
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  
  conversationContainer: {
    marginHorizontal: responsive.spacing.md,
  },
  
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsive.spacing.md,
    paddingHorizontal: responsive.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: responsive.spacing.lg,
    minHeight: responsive.isSmallPhone ? 70 : 80,
  },
  
  avatarContainer: {
    position: 'relative',
    marginRight: responsive.spacing.md,
  },
  
  avatar: {
    width: responsive.isSmallPhone ? 40 : 48,
    height: responsive.isSmallPhone ? 40 : 48,
    borderRadius: responsive.isSmallPhone ? 20 : 24,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  
  onlineAvatar: {
    borderColor: theme.colors.success,
  },
  
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: responsive.isSmallPhone ? 12 : 14,
    height: responsive.isSmallPhone ? 12 : 14,
    borderRadius: responsive.isSmallPhone ? 6 : 7,
    backgroundColor: theme.colors.success,
    borderWidth: 2,
    borderColor: theme.colors.backgroundSecondary,
  },
  
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: responsive.spacing.xs,
  },
  
  contactName: {
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    marginRight: responsive.spacing.sm,
  },
  
  timestamp: {
    fontSize: responsive.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  
  conversationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  lastMessage: {
    fontSize: responsive.fontSize.sm,
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: responsive.spacing.sm,
  },
  
  unreadMessage: {
    color: theme.colors.text,
    fontWeight: '500',
  },
  
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: responsive.spacing.lg,
    minWidth: responsive.isSmallPhone ? 18 : 20,
    height: responsive.isSmallPhone ? 18 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsive.spacing.xs,
  },
  
  unreadCount: {
    fontSize: responsive.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.background,
  },
  
  arrow: {
    marginLeft: responsive.spacing.sm,
  },
  
  separator: {
    height: responsive.spacing.sm,
  },
  
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: responsive.spacing.xl,
    paddingVertical: responsive.spacing.xxxl,
  },
  
  emptyTitle: {
    fontSize: responsive.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: responsive.spacing.lg,
    marginBottom: responsive.spacing.sm,
  },
  
  emptySubtitle: {
    fontSize: responsive.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: responsive.fontSize.md * 1.4,
    marginBottom: responsive.spacing.xl,
  },
  
  startButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: responsive.spacing.xl,
    paddingVertical: responsive.spacing.md,
    borderRadius: responsive.spacing.lg,
    elevation: 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  
  startButtonText: {
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
    color: theme.colors.background,
  },
  
  fab: {
    position: 'absolute',
    bottom: responsive.spacing.xl,
    right: responsive.spacing.md,
    width: responsive.isSmallPhone ? 52 : 56,
    height: responsive.isSmallPhone ? 52 : 56,
    borderRadius: responsive.isSmallPhone ? 26 : 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
