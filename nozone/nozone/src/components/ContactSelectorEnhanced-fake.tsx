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
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { theme, typography } from '../utils/theme';
import { SupabaseService } from '../services/supabase';
import { User } from '../types';

export interface Contact {
  name: string;
  phone?: string;
  isRegisteredUser?: boolean;
  lastMessageTime?: Date;
  messageCount: number;
}

export interface ContactSelectorProps {
  contacts: Contact[];
  onSelectContact: (contactName: string) => void;
  onAddNewContact: (contactName: string) => void;
  onBack: () => void;
  currentUserId: string;
}

export const ContactSelector: React.FC<ContactSelectorProps> = ({
  contacts,
  onSelectContact,
  onAddNewContact,
  onBack,
  currentUserId,
}) => {
  const [searchText, setSearchText] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNew, setShowAddNew] = useState(false);

  const searchInputScale = useSharedValue(1);

  useEffect(() => {
    loadRegisteredUsers();
  }, []);

  useEffect(() => {
    combineContactsAndUsers();
  }, [contacts, registeredUsers, searchText]);

  const loadRegisteredUsers = async () => {
    try {
      setLoading(true);
      // Since we don't have a direct "get all users" method, we'll simulate it
      // In a real app, you'd have a method to get all users or at least searchable users
      console.log('Loading registered users...');
      
      // For now, we'll create some sample registered users
      const sampleUsers: User[] = [
        {
          id: '1',
          name: 'Alice Johnson',
          phone: '+1234567890',
          isVerified: true,
          createdAt: new Date(),
        },
        {
          id: '2', 
          name: 'Bob Smith',
          phone: '+1234567891',
          isVerified: true,
          createdAt: new Date(),
        },
        {
          id: '3',
          name: 'Carol Davis',
          phone: '+1234567892',
          isVerified: true,
          createdAt: new Date(),
        },
        {
          id: '4',
          name: 'David Wilson',
          phone: '+1234567893',
          isVerified: true,
          createdAt: new Date(),
        },
        {
          id: '5',
          name: 'Emma Brown',
          phone: '+1234567894',
          isVerified: true,
          createdAt: new Date(),
        },
      ];
      
      // Filter out current user
      const filteredUsers = sampleUsers.filter(user => user.id !== currentUserId);
      setRegisteredUsers(filteredUsers);
    } catch (error) {
      console.error('Failed to load registered users:', error);
      Alert.alert('Error', 'Failed to load registered users');
    } finally {
      setLoading(false);
    }
  };

  const combineContactsAndUsers = () => {
    let combinedContacts: Contact[] = [];

    // Add registered users as contacts
    const userContacts: Contact[] = registeredUsers.map(user => {
      // Check if this user already has message history
      const existingContact = contacts.find(c => 
        c.name.toLowerCase() === user.name.toLowerCase()
      );

      return {
        name: user.name,
        phone: user.phone,
        isRegisteredUser: true,
        messageCount: existingContact?.messageCount || 0,
        lastMessageTime: existingContact?.lastMessageTime,
      };
    });

    // Add existing message contacts that aren't registered users
    const messageOnlyContacts = contacts.filter(contact => 
      !registeredUsers.some(user => 
        user.name.toLowerCase() === contact.name.toLowerCase()
      )
    );

    combinedContacts = [...userContacts, ...messageOnlyContacts];

    // Apply search filter
    if (searchText.trim() === '') {
      setFilteredContacts(combinedContacts);
      setShowAddNew(false);
    } else {
      const filtered = combinedContacts.filter(contact =>
        contact.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (contact.phone && contact.phone.includes(searchText))
      );
      setFilteredContacts(filtered);
      
      // Show "add new" if no exact match found
      const exactMatch = filtered.some(c => 
        c.name.toLowerCase() === searchText.toLowerCase()
      );
      setShowAddNew(!exactMatch && searchText.trim().length > 0);
    }
  };

  const handleAddNewContact = () => {
    if (searchText.trim()) {
      onAddNewContact(searchText.trim());
    }
  };

  const searchInputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchInputScale.value }],
  }));

  const renderContact = ({ item }: { item: Contact }) => (
    <Animated.View entering={FadeIn.delay(100)}>
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => onSelectContact(item.name)}
      >
        <View style={[
          styles.contactAvatar,
          item.isRegisteredUser && styles.registeredUserAvatar
        ]}>
          <Text style={[
            styles.contactInitial,
            item.isRegisteredUser && styles.registeredUserInitial
          ]}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
          {item.isRegisteredUser && (
            <View style={styles.verifiedBadge}>
              <Feather name="check" size={8} color={theme.colors.onPrimary} />
            </View>
          )}
        </View>
        
        <View style={styles.contactInfo}>
          <View style={styles.contactNameRow}>
            <Text style={styles.contactName}>{item.name}</Text>
            {item.isRegisteredUser && (
              <View style={styles.registeredBadge}>
                <Text style={styles.registeredBadgeText}>Registered</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.contactSubtitle}>
            {item.phone && `${item.phone} • `}
            {item.messageCount} message{item.messageCount !== 1 ? 's' : ''}
            {item.lastMessageTime && ` • ${formatRelativeTime(item.lastMessageTime)}`}
          </Text>
        </View>
        
        <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderAddNewContact = () => (
    <Animated.View entering={SlideInDown.delay(200)}>
      <TouchableOpacity
        style={styles.addNewContactItem}
        onPress={handleAddNewContact}
      >
        <View style={styles.addNewAvatar}>
          <Feather name="plus" size={20} color={theme.colors.primary} />
        </View>
        
        <View style={styles.contactInfo}>
          <Text style={styles.addNewContactText}>
            Add "{searchText}" as new contact
          </Text>
          <Text style={styles.addNewContactSubtitle}>
            Send message to someone not registered
          </Text>
        </View>
        
        <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );

  // Separate registered users and message-only contacts
  const registeredContacts = filteredContacts.filter(c => c.isRegisteredUser);
  const messageContacts = filteredContacts.filter(c => !c.isRegisteredUser);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.colors.onBackground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Contact</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Contact</Text>
      </View>

      <Animated.View style={[styles.searchContainer, searchInputAnimatedStyle]}>
        <Feather name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts or add new..."
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
            onPress={() => setSearchText('')}
            style={styles.clearButton}
          >
            <Feather name="x-circle" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </Animated.View>

      <FlatList
        style={styles.contactsList}
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={() => (
          <View>
            {registeredContacts.length > 0 && (
              <View>
                {renderSectionHeader('Registered Users', registeredContacts.length)}
                {registeredContacts.map((contact, index) => (
                  <View key={`registered-${index}`}>
                    {renderContact({ item: contact })}
                  </View>
                ))}
              </View>
            )}
            
            {messageContacts.length > 0 && (
              <View>
                {renderSectionHeader('Message History', messageContacts.length)}
                {messageContacts.map((contact, index) => (
                  <View key={`message-${index}`}>
                    {renderContact({ item: contact })}
                  </View>
                ))}
              </View>
            )}
            
            {showAddNew && renderAddNewContact()}
            
            {filteredContacts.length === 0 && !showAddNew && searchText.length > 0 && (
              <View style={styles.emptyState}>
                <Feather name="users" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyStateTitle}>No contacts found</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Try a different search term or add a new contact
                </Text>
              </View>
            )}
            
            {filteredContacts.length === 0 && searchText.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="message-circle" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyStateTitle}>No contacts yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Start typing to search for registered users or add a new contact
                </Text>
              </View>
            )}
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  backButton: {
    marginRight: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  headerTitle: {
    ...typography.h2,
    color: theme.colors.onBackground,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.md,
    ...typography.body,
    color: theme.colors.onSurface,
  },
  clearButton: {
    padding: theme.spacing.sm,
  },
  contactsList: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    color: theme.colors.onSurface,
  },
  sectionCount: {
    ...typography.caption,
    color: theme.colors.textSecondary,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    position: 'relative',
  },
  registeredUserAvatar: {
    backgroundColor: theme.colors.primaryVariant,
  },
  contactInitial: {
    ...typography.h3,
    color: theme.colors.onSurface,
  },
  registeredUserInitial: {
    color: theme.colors.onPrimary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  contactInfo: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  contactName: {
    ...typography.bodyMedium,
    color: theme.colors.onSurface,
    flex: 1,
  },
  registeredBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
  },
  registeredBadgeText: {
    ...typography.small,
    color: theme.colors.onPrimary,
    fontSize: 10,
  },
  contactSubtitle: {
    ...typography.caption,
    color: theme.colors.textSecondary,
  },
  addNewContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primaryVariant,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  addNewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  addNewContactText: {
    ...typography.bodyMedium,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.xs,
  },
  addNewContactSubtitle: {
    ...typography.small,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyStateTitle: {
    ...typography.h3,
    color: theme.colors.onSurface,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyStateSubtitle: {
    ...typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
