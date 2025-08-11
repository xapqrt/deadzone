import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { theme } from '../utils/theme';
import { useResponsive } from '../utils/responsive';
import { KeyboardAwareWrapper } from '../components/KeyboardAwareWrapper';

interface Contact {
  id: string;
  name: string;
  phone: string;
  isSelected: boolean;
}

interface DirectComposeScreenEnhancedProps {
  onBack: () => void;
  onSend: (recipients: Contact[], message: string) => void;
}

export const DirectComposeScreenEnhanced: React.FC<DirectComposeScreenEnhancedProps> = ({
  onBack,
  onSend,
}) => {
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  
  const responsive = useResponsive();
  const styles = createResponsiveStyles(responsive);
  
  // Animation refs
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.95)).current;
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  
  // Input refs
  const phoneInputRef = useRef<TextInput>(null);
  const messageInputRef = useRef<TextInput>(null);

  // Mock contacts for demonstration
  const [contacts] = useState<Contact[]>([
    { id: '1', name: 'John Doe', phone: '+1234567890', isSelected: false },
    { id: '2', name: 'Sarah Wilson', phone: '+1987654321', isSelected: false },
    { id: '3', name: 'Mike Johnson', phone: '+1122334455', isSelected: false },
    { id: '4', name: 'Emily Davis', phone: '+1555666777', isSelected: false },
    { id: '5', name: 'Alex Brown', phone: '+1999888777', isSelected: false },
  ]);

  useEffect(() => {
    // Animate screen in
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(contentScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleContactSelect = (contact: Contact) => {
    Haptics.selectionAsync();
    
    const isAlreadySelected = selectedContacts.some(c => c.id === contact.id);
    
    if (isAlreadySelected) {
      setSelectedContacts(prev => prev.filter(c => c.id !== contact.id));
    } else {
      setSelectedContacts(prev => [...prev, contact]);
    }
    
    setSearchQuery('');
    setShowContacts(false);
  };

  const removeContact = (contactId: string) => {
    Haptics.selectionAsync();
    setSelectedContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const addPhoneNumber = (phone: string) => {
    if (!phone.trim()) return;
    
    const phoneContact: Contact = {
      id: `phone_${Date.now()}`,
      name: phone.trim(),
      phone: phone.trim(),
      isSelected: true,
    };
    
    setSelectedContacts(prev => [...prev, phoneContact]);
    setSearchQuery('');
    setShowContacts(false);
  };

  const handleSend = async () => {
    if (selectedContacts.length === 0) {
      Alert.alert('Error', 'Please select at least one recipient');
      return;
    }
    
    if (!messageText.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setIsSending(true);
    
    // Button animation
    Animated.sequence([
      Animated.timing(sendButtonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(sendButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onSend(selectedContacts, messageText);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery)
  );

  const renderContactChip = (contact: Contact) => (
    <View key={contact.id} style={styles.contactChip}>
      <Text style={styles.contactChipText} numberOfLines={1}>
        {contact.name}
      </Text>
      <TouchableOpacity
        onPress={() => removeContact(contact.id)}
        style={styles.removeButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons 
          name="close" 
          size={responsive.fontSize.sm} 
          color={theme.colors.textSecondary} 
        />
      </TouchableOpacity>
    </View>
  );

  const renderContactSuggestion = (contact: Contact) => (
    <TouchableOpacity
      key={contact.id}
      style={styles.contactSuggestion}
      onPress={() => handleContactSelect(contact)}
    >
      <View style={styles.contactAvatar}>
        <Ionicons 
          name="person" 
          size={responsive.fontSize.md} 
          color={theme.colors.textSecondary} 
        />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.name}</Text>
        <Text style={styles.contactPhone}>{contact.phone}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareWrapper offset={40} style={styles.container}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons 
              name="arrow-back" 
              size={responsive.fontSize.xl} 
              color={theme.colors.text} 
            />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>New Message</Text>
          
          <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
            <TouchableOpacity
              style={[
                styles.sendHeaderButton,
                (!messageText.trim() || selectedContacts.length === 0 || isSending) && 
                styles.sendHeaderButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!messageText.trim() || selectedContacts.length === 0 || isSending}
            >
              <Text
                style={[
                  styles.sendHeaderButtonText,
                  (!messageText.trim() || selectedContacts.length === 0 || isSending) && 
                  styles.sendHeaderButtonTextDisabled,
                ]}
              >
                {isSending ? 'Sending...' : 'Send'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* Content */}
        <Animated.View style={[styles.content, { transform: [{ scale: contentScale }] }]}>
          {/* Recipients Section */}
          <View style={styles.recipientsSection}>
            <Text style={styles.sectionLabel}>To:</Text>
            
            <View style={styles.recipientsContainer}>
              {/* Selected Contacts */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.selectedContactsScroll}
                contentContainerStyle={styles.selectedContactsContent}
              >
                {selectedContacts.map(renderContactChip)}
              </ScrollView>
              
              {/* Input */}
              <TextInput
                ref={phoneInputRef}
                style={styles.recipientInput}
                placeholder="Enter phone number or search contacts"
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setShowContacts(text.length > 0);
                }}
                onFocus={() => setShowContacts(searchQuery.length > 0)}
                onSubmitEditing={() => {
                  if (searchQuery.includes('+') || /^\d+$/.test(searchQuery)) {
                    addPhoneNumber(searchQuery);
                  }
                }}
                returnKeyType="done"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Contact Suggestions */}
          {showContacts && (
            <View style={styles.suggestionsContainer}>
              <ScrollView 
                style={styles.suggestionsList}
                showsVerticalScrollIndicator={false}
              >
                {searchQuery.length > 0 && (searchQuery.includes('+') || /^\d+$/.test(searchQuery)) && (
                  <TouchableOpacity
                    style={styles.addPhoneButton}
                    onPress={() => addPhoneNumber(searchQuery)}
                  >
                    <Ionicons 
                      name="add-circle-outline" 
                      size={responsive.fontSize.lg} 
                      color={theme.colors.primary} 
                    />
                    <Text style={styles.addPhoneText}>Add "{searchQuery}"</Text>
                  </TouchableOpacity>
                )}
                
                {filteredContacts.map(renderContactSuggestion)}
              </ScrollView>
            </View>
          )}

          {/* Message Section */}
          <View style={styles.messageSection}>
            <Text style={styles.sectionLabel}>Message:</Text>
            
            <View style={styles.messageContainer}>
              <TextInput
                ref={messageInputRef}
                style={styles.messageInput}
                placeholder="Type your message..."
                placeholderTextColor={theme.colors.textMuted}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />
              
              <View style={styles.messageFooter}>
                <Text style={styles.characterCount}>
                  {messageText.length}/1000
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Send Button */}
        {!showContacts && (
          <View style={styles.sendButtonContainer}>
            <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!messageText.trim() || selectedContacts.length === 0 || isSending) && 
                  styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!messageText.trim() || selectedContacts.length === 0 || isSending}
              >
                <Ionicons
                  name={isSending ? 'hourglass-outline' : 'send'}
                  size={responsive.fontSize.lg}
                  color={theme.colors.background}
                  style={styles.sendButtonIcon}
                />
                <Text style={styles.sendButtonText}>
                  {isSending ? 'Sending...' : 'Send Message'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </KeyboardAwareWrapper>
    </SafeAreaView>
  );
};

const createResponsiveStyles = (responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsive.spacing.md,
    paddingVertical: responsive.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    height: responsive.layout.headerHeight,
  },
  
  backButton: {
    padding: responsive.spacing.xs,
    marginRight: responsive.spacing.sm,
    minWidth: responsive.layout.minTouchTarget,
    minHeight: responsive.layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  headerTitle: {
    flex: 1,
    fontSize: responsive.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  
  sendHeaderButton: {
    paddingHorizontal: responsive.spacing.md,
    paddingVertical: responsive.spacing.sm,
    borderRadius: responsive.spacing.md,
    backgroundColor: theme.colors.primary,
  },
  
  sendHeaderButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  
  sendHeaderButtonText: {
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
    color: theme.colors.background,
  },
  
  sendHeaderButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
  
  content: {
    flex: 1,
    padding: responsive.spacing.md,
  },
  
  recipientsSection: {
    marginBottom: responsive.spacing.lg,
  },
  
  sectionLabel: {
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: responsive.spacing.sm,
  },
  
  recipientsContainer: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: responsive.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: responsive.spacing.sm,
    minHeight: responsive.layout.inputHeight,
  },
  
  selectedContactsScroll: {
    maxHeight: responsive.isSmallPhone ? 60 : 80,
  },
  
  selectedContactsContent: {
    paddingBottom: responsive.spacing.xs,
  },
  
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryAlpha,
    borderRadius: responsive.spacing.lg,
    paddingHorizontal: responsive.spacing.sm,
    paddingVertical: responsive.spacing.xs,
    marginRight: responsive.spacing.xs,
    marginBottom: responsive.spacing.xs,
    maxWidth: responsive.wp(60),
  },
  
  contactChipText: {
    fontSize: responsive.fontSize.sm,
    color: theme.colors.primary,
    marginRight: responsive.spacing.xs,
  },
  
  removeButton: {
    padding: 2,
  },
  
  recipientInput: {
    fontSize: responsive.fontSize.md,
    color: theme.colors.text,
    padding: 0,
    minHeight: responsive.fontSize.md * 1.5,
  },
  
  suggestionsContainer: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: responsive.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: responsive.spacing.lg,
    maxHeight: responsive.hp(30),
  },
  
  suggestionsList: {
    padding: responsive.spacing.sm,
  },
  
  addPhoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsive.spacing.sm,
    paddingHorizontal: responsive.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  
  addPhoneText: {
    fontSize: responsive.fontSize.md,
    color: theme.colors.primary,
    marginLeft: responsive.spacing.sm,
  },
  
  contactSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsive.spacing.sm,
    paddingHorizontal: responsive.spacing.sm,
  },
  
  contactAvatar: {
    width: responsive.isSmallPhone ? 32 : 36,
    height: responsive.isSmallPhone ? 32 : 36,
    borderRadius: responsive.isSmallPhone ? 16 : 18,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: responsive.spacing.sm,
  },
  
  contactInfo: {
    flex: 1,
  },
  
  contactName: {
    fontSize: responsive.fontSize.md,
    fontWeight: '500',
    color: theme.colors.text,
  },
  
  contactPhone: {
    fontSize: responsive.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  
  messageSection: {
    flex: 1,
  },
  
  messageContainer: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: responsive.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: responsive.spacing.md,
    minHeight: responsive.hp(20),
  },
  
  messageInput: {
    flex: 1,
    fontSize: responsive.fontSize.md,
    color: theme.colors.text,
    textAlignVertical: 'top',
    lineHeight: responsive.fontSize.md * 1.4,
  },
  
  messageFooter: {
    alignItems: 'flex-end',
    marginTop: responsive.spacing.sm,
  },
  
  characterCount: {
    fontSize: responsive.fontSize.xs,
    color: theme.colors.textMuted,
  },
  
  sendButtonContainer: {
    padding: responsive.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: responsive.spacing.lg,
    paddingVertical: responsive.spacing.md,
    paddingHorizontal: responsive.spacing.lg,
    minHeight: responsive.layout.buttonHeight,
    elevation: 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  
  sendButtonDisabled: {
    backgroundColor: theme.colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  
  sendButtonIcon: {
    marginRight: responsive.spacing.sm,
  },
  
  sendButtonText: {
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
    color: theme.colors.background,
  },
});
