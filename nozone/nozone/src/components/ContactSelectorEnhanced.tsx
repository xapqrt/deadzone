import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInUp,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import { supabase } from '../services/supabase';
import { User } from '../types';

export interface ContactSelectorEnhancedProps {
  currentUser: User;
  onSelectContact: (user: User) => void;
  onBack: () => void;
}

export const ContactSelectorEnhanced: React.FC<ContactSelectorEnhancedProps> = ({
  currentUser,
  onSelectContact,
  onBack,
}) => {
  const [searchText, setSearchText] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const searchInputScale = useSharedValue(1);

  useEffect(() => {
    loadRegisteredUsers();
  }, []);

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredUsers(allUsers);
    } else {
      const filtered = allUsers.filter(user =>
        user.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (user.username && user.username.toLowerCase().includes(searchText.toLowerCase()))
      );
      setFilteredUsers(filtered);
    }
  }, [searchText, allUsers]);

  const loadRegisteredUsers = async () => {
    try {
      setLoading(true);

      // Use the get_active_users database function
      const { data, error } = await supabase
        .rpc('get_active_users', {
          p_exclude_user_id: currentUser.id,
          p_search_term: null,
          p_limit: 100
        });

      if (error) {
        console.error('Failed to load users:', error);
        Alert.alert('Error', 'Failed to load contacts. Please try again.');
        return;
      }

      const users: User[] = data.map((user: any) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        lastActive: user.last_active ? new Date(user.last_active) : undefined,
        isOnline: user.is_online,
        isVerified: true,
        createdAt: new Date() // Default since we don't have it from function
      }));

      setAllUsers(users);
      setFilteredUsers(users);
    } catch (error) {
      console.error('Failed to load users:', error);
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRegisteredUsers();
    setRefreshing(false);
  };

  const searchInputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchInputScale.value }],
  }));

  const formatLastSeen = (lastActive?: Date): string => {
    if (!lastActive) return 'No recent activity';
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60));

    if (diffInMinutes < 5) {
      return 'Online now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  };

  const renderUser = ({ item, index }: { item: User; index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 50)}>
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => onSelectContact(item)}
      >
        <View style={[styles.userAvatar, item.isOnline && styles.onlineAvatar]}>
          <Text style={styles.userInitial}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
          {item.isOnline && <View style={styles.onlineIndicator} />}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userUsername}>@{item.username}</Text>
          <Text style={[styles.userStatus, item.isOnline && styles.onlineStatus]}>
            {formatLastSeen(item.lastActive)}
          </Text>
        </View>
        
        <View style={styles.userActions}>
          {item.isOnline && (
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineBadgeText}>Online</Text>
            </View>
          )}
          <Feather name="message-circle" size={20} color={theme.colors.primary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEmpty = () => (
    <Animated.View entering={FadeIn} style={styles.emptyState}>
      <Feather name="users" size={48} color={theme.colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>
        {searchText ? 'No Users Found' : 'No Registered Users'}
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {searchText 
          ? `No users match "${searchText}"`
          : 'No other users have registered yet'
        }
      </Text>
      {!searchText && (
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefresh}
        >
          <Feather name="refresh-cw" size={16} color={theme.colors.primary} />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Contact</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshHeaderButton}>
          <Feather name="refresh-cw" size={20} color={theme.colors.onBackground} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {allUsers.length} registered user{allUsers.length !== 1 ? 's' : ''}
          {allUsers.filter(u => u.isOnline).length > 0 &&
            ` • ${allUsers.filter(u => u.isOnline).length} online`
          }
        </Text>
      </View>

      <Animated.View style={[styles.searchContainer, searchInputAnimatedStyle]}>
        <Feather name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or username..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchText}
          onChangeText={setSearchText}
          onFocus={() => {
            searchInputScale.value = withSpring(1.02);
          }}
          onBlur={() => {
            searchInputScale.value = withSpring(1);
          }}
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchText('')}
          >
            <Feather name="x" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          style={styles.usersList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.usersListContent}
          ListEmptyComponent={renderEmpty}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </View>
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  backButton: {
    padding: theme.spacing.xs,
  },

  refreshHeaderButton: {
    padding: theme.spacing.xs,
  },

  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onBackground,
    textAlign: 'center',
    marginHorizontal: theme.spacing.sm,
  },

  statsContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
  },

  statsText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  searchIcon: {
    marginLeft: theme.spacing.md,
  },

  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.onSurface,
  },

  clearButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.xs,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },

  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },

  usersList: {
    flex: 1,
  },

  usersListContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },

  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginVertical: theme.spacing.xs,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  onlineAvatar: {
    borderWidth: 2,
    borderColor: theme.colors.success,
  },

  userInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },

  onlineIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.success,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },

  userInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },

  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },

  userUsername: {
    fontSize: 14,
    color: theme.colors.primary,
    marginBottom: 2,
  },

  userStatus: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },

  onlineStatus: {
    color: theme.colors.success,
    fontWeight: '500',
  },

  userActions: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },

  onlineBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: 10,
  },

  onlineBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },

  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },

  emptyStateSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },

  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: theme.spacing.xs,
  },

  refreshButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
});
