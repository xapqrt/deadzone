import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { theme } from '../utils/theme';

export interface Contact {
  name: string;
  lastMessageTime?: Date;
  messageCount: number;
}

export interface ContactSelectorProps {
  contacts: Contact[];
  onSelectContact: (contactName: string) => void;
  onAddNewContact: (contactName: string) => void;
  onBack: () => void;
}

export const ContactSelector: React.FC<ContactSelectorProps> = ({
  contacts,
  onSelectContact,
  onAddNewContact,
  onBack,
}) => {
  const [searchText, setSearchText] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>(contacts);
  const [showAddNew, setShowAddNew] = useState(false);

  const searchInputScale = useSharedValue(1);

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredContacts(contacts);
      setShowAddNew(false);
    } else {
      const filtered = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredContacts(filtered);
      setShowAddNew(filtered.length === 0 || !filtered.some(c => c.name.toLowerCase() === searchText.toLowerCase()));
    }
  }, [searchText, contacts]);

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
        <View style={styles.contactAvatar}>
          <Text style={styles.contactInitial}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactSubtitle}>
            {item.messageCount} message{item.messageCount !== 1 ? 's' : ''}
            {item.lastMessageTime && ` • ${formatRelativeTime(item.lastMessageTime)}`}
          </Text>
        </View>
        
        <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Contact</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.View style={[styles.searchContainer, searchInputAnimatedStyle]}>
        <Feather name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search or add new contact..."
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
      </Animated.View>

      {showAddNew && searchText.trim() && (
        <Animated.View entering={SlideInDown} style={styles.addNewContainer}>
          <TouchableOpacity style={styles.addNewButton} onPress={handleAddNewContact}>
            <Feather name="plus" size={20} color={theme.colors.primary} />
            <Text style={styles.addNewText}>
              Add "{searchText.trim()}" as new contact
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <FlatList
        data={filteredContacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.name}
        style={styles.contactsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contactsListContent}
      />

      {filteredContacts.length === 0 && !showAddNew && (
        <Animated.View entering={FadeIn} style={styles.emptyState}>
          <Feather name="users" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>No Contacts Found</Text>
          <Text style={styles.emptyStateSubtitle}>
            {searchText ? 'Try a different search term' : 'Start by adding a new contact above'}
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onBackground,
    marginLeft: 12,
  },
  headerSpacer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: theme.colors.onBackground,
  },
  addNewContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryAlpha,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  addNewText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '500',
    marginLeft: 12,
  },
  contactsList: {
    flex: 1,
  },
  contactsListContent: {
    paddingHorizontal: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onBackground,
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onBackground,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
