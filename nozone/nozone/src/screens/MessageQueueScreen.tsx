import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { MessageCard } from '../components/MessageCard';
import { NetworkStatusBar } from '../components/NetworkStatusBar';
import { Loading } from '../components/Loading';
import { Message, User, NetworkStatus } from '../types';
import { StorageService } from '../services/storage';
import { SyncService } from '../services/sync';
import { NetworkService } from '../services/network';
import { theme } from '../utils/theme';

export interface MessageQueueScreenProps {
  user: User;
  onCompose: () => void;
  onEditMessage: (message: Message) => void;
  onSettings: () => void;
}

export const MessageQueueScreen: React.FC<MessageQueueScreenProps> = ({
  user,
  onCompose,
  onEditMessage,
  onSettings,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: false,
    isInternetReachable: null,
    type: null,
  });
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'failed'>('all');

  const loadMessages = useCallback(async () => {
    try {
      const loadedMessages = await StorageService.getMessages();
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    }
  }, []);

  const handleSync = useCallback(async () => {
    if (syncing || !NetworkService.isOnline()) {
      return;
    }

    setSyncing(true);
    try {
      const result = await SyncService.performSync(user);
      
      if (result.success) {
        await loadMessages();
        if (result.syncedCount > 0) {
          Alert.alert(
            'Sync Complete',
            `${result.syncedCount} message${result.syncedCount === 1 ? '' : 's'} sent successfully!`
          );
        }
      } else {
        Alert.alert('Sync Failed', result.error || 'Failed to sync messages');
      }
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Sync Error', 'An unexpected error occurred during sync');
    } finally {
      setSyncing(false);
    }
  }, [user, syncing, loadMessages]);

  const handleDeleteMessage = useCallback(async (message: Message) => {
    try {
      await StorageService.deleteMessage(message.id);
      await loadMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Error', 'Failed to delete message');
    }
  }, [loadMessages]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  }, [loadMessages]);

  useEffect(() => {
    loadMessages();
    
    // Set up network listener
    const unsubscribeNetwork = NetworkService.addListener(setNetworkStatus);
    
    // Start background sync
    SyncService.startBackgroundSync(user);
    
    return () => {
      unsubscribeNetwork();
      SyncService.stopBackgroundSync();
    };
  }, [loadMessages, user]);

  useEffect(() => {
    // Auto-sync when network comes back online
    if (networkStatus.isConnected && networkStatus.isInternetReachable !== false) {
      setTimeout(handleSync, 1000);
    }
  }, [networkStatus, handleSync]);

  const filteredMessages = messages.filter(message => {
    if (filter === 'all') return true;
    return message.status === filter;
  });

  const getFilterCount = (status: string) => {
    if (status === 'all') return messages.length;
    return messages.filter(msg => msg.status === status).length;
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageCard
      message={item}
      onEdit={onEditMessage}
      onDelete={handleDeleteMessage}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubble-outline" size={64} color={theme.colors.textMuted} />
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the + button to compose your first message
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>
          {getFilterCount(filter)} {filter === 'all' ? 'total' : filter}
        </Text>
      </View>
      
      <View style={styles.headerActions}>
        <TouchableOpacity
          onPress={handleSync}
          disabled={syncing || !NetworkService.isOnline()}
          style={[
            styles.syncButton,
            (!NetworkService.isOnline() || syncing) && styles.syncButtonDisabled
          ]}
        >
          <Ionicons
            name={syncing ? 'refresh' : 'sync'}
            size={20}
            color={
              !NetworkService.isOnline() || syncing 
                ? theme.colors.textMuted 
                : theme.colors.primary
            }
          />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onSettings} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilterTabs = () => (
    <View style={styles.filterTabs}>
      {[
        { key: 'all', label: 'All', count: getFilterCount('all') },
        { key: 'pending', label: 'Pending', count: getFilterCount('pending') },
        { key: 'sent', label: 'Sent', count: getFilterCount('sent') },
        { key: 'failed', label: 'Failed', count: getFilterCount('failed') },
      ].map(tab => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => setFilter(tab.key as any)}
          style={[
            styles.filterTab,
            filter === tab.key && styles.filterTabActive
          ]}
        >
          <Text style={[
            styles.filterTabText,
            filter === tab.key && styles.filterTabTextActive
          ]}>
            {tab.label}
          </Text>
          {tab.count > 0 && (
            <View style={[
              styles.filterBadge,
              filter === tab.key && styles.filterBadgeActive
            ]}>
              <Text style={[
                styles.filterBadgeText,
                filter === tab.key && styles.filterBadgeTextActive
              ]}>
                {tab.count}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return <Loading fullScreen text="Loading messages..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <NetworkStatusBar />
      
      {renderHeader()}
      {renderFilterTabs()}
      
      <FlatList
        data={filteredMessages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.messageList,
          filteredMessages.length === 0 && styles.messageListEmpty
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
      
      <TouchableOpacity style={styles.fab} onPress={onCompose}>
        <Ionicons name="add" size={28} color={theme.colors.onPrimary} />
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  titleContainer: {
    flex: 1,
  },

  title: {
    fontSize: theme.fontSizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.onBackground,
  },

  subtitle: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  syncButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.xs,
  },

  syncButtonDisabled: {
    opacity: 0.5,
  },

  settingsButton: {
    padding: theme.spacing.sm,
  },

  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
  },

  filterTabActive: {
    backgroundColor: theme.colors.primary,
  },

  filterTabText: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },

  filterTabTextActive: {
    color: theme.colors.onPrimary,
  },

  filterBadge: {
    backgroundColor: theme.colors.textMuted,
    borderRadius: theme.borderRadius.round,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.xs,
  },

  filterBadgeActive: {
    backgroundColor: theme.colors.onPrimary,
  },

  filterBadgeText: {
    fontSize: theme.fontSizes.xs,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },

  filterBadgeTextActive: {
    color: theme.colors.primary,
  },

  messageList: {
    padding: theme.spacing.lg,
  },

  messageListEmpty: {
    flex: 1,
    justifyContent: 'center',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },

  emptyTitle: {
    fontSize: theme.fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },

  emptySubtitle: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  fab: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    right: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
});
