import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SupabaseService } from '../services/supabase';
import { showError, showSuccess } from '../services/errorService';
import { ValidationService } from '../services/validationService';
import { useLoadingStates } from '../services/loadingService';
import { theme, typography } from '../utils/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAwareWrapper } from '../components/KeyboardAwareWrapper';
import { useResponsive } from '../utils/responsive';
import { accessibleProps, accessibilityLabels, focusManagement } from '../utils/accessibility';
import { calmAnimations, feedbackAnimations } from '../utils/motion';
import { User } from '../types';

interface DirectComposeScreenProps {
  user: User;
  onBack: () => void;
  onChatCreated: (conversationId: string, otherUser: { id: string; username: string; name: string }) => void;
  prefilledUsername?: string;
}

interface UserSearchResult {
  id: string;
  username: string;
  name: string;
  lastActive?: Date;
  isOnline?: boolean;
}

export const DirectComposeScreen: React.FC<DirectComposeScreenProps> = ({
  user,
  onBack,
  onChatCreated,
  prefilledUsername = '',
}) => {
  const [username, setUsername] = useState(prefilledUsername);
  const [message, setMessage] = useState('');
  const [userFound, setUserFound] = useState<User | null>(null);
  const [searchError, setSearchError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [messageError, setMessageError] = useState('');
  
  // User search/autocomplete state
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<UserSearchResult[]>([]);

  const { setLoading, isLoading } = useLoadingStates(['search', 'send']);
  const { device, spacing, fontSize, touchTarget, isSmall } = useResponsive();
  
  // Animation refs
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const errorShake = useRef(new Animated.Value(0)).current;
  const dropdownHeight = useRef(new Animated.Value(0)).current;
  
  // Input refs for focus management
  const usernameInputRef = useRef<TextInput>(null);
  const messageInputRef = useRef<TextInput>(null);
  const headerRef = useRef<View>(null);

  useEffect(() => {
    // Animate screen entrance
    animateScreenIn();
    
    // Load all users for autocomplete
    loadAllUsers();
    
    // Set focus to header for screen readers
    setTimeout(() => {
      focusManagement.setFocus(headerRef);
    }, 300);
    
    // Auto-focus username input after animations
    setTimeout(() => {
      usernameInputRef.current?.focus();
    }, 600);
  }, []);

  const loadAllUsers = async () => {
    try {
      const users = await SupabaseService.getActiveUsers(user.id, '', 100);
      const userResults: UserSearchResult[] = users.map(u => ({
        id: u.id,
        username: u.username || '',
        name: u.name,
        lastActive: u.lastActive,
        isOnline: u.isOnline,
      }));
      setAllUsers(userResults);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      Animated.spring(dropdownHeight, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
      return;
    }

    setSearchLoading(true);
    
    try {
      // Filter from all users for better performance and show dropdown immediately
      const filtered = allUsers.filter(u => 
        u.username.toLowerCase().includes(query.toLowerCase()) ||
        u.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8); // Limit to 8 results for UI purposes
      
      setSearchResults(filtered);
      setShowDropdown(filtered.length > 0);
      
      // Animate dropdown
      if (filtered.length > 0) {
        Animated.spring(dropdownHeight, {
          toValue: Math.min(filtered.length * 60, 240), // Max height for 4 items
          useNativeDriver: false,
          tension: 100,
          friction: 8,
        }).start();
      } else {
        Animated.spring(dropdownHeight, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectUser = (selectedUser: UserSearchResult) => {
    setUsername(selectedUser.username);
    setUserFound({
      id: selectedUser.id,
      username: selectedUser.username,
      name: selectedUser.name,
      createdAt: new Date(),
      lastActive: selectedUser.lastActive,
    });
    setShowDropdown(false);
    setSearchError('');
    setUsernameError('');
    
    // Animate dropdown close
    Animated.spring(dropdownHeight, {
      toValue: 0,
      useNativeDriver: false,
    }).start();
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Focus message input
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 200);
    
    focusManagement.announce(`Selected ${selectedUser.name || selectedUser.username}`);
  };

  const renderUserItem = ({ item }: { item: UserSearchResult }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => selectUser(item)}
      {...accessibleProps.button(
        `Select ${item.name || item.username}`,
        `Send message to ${item.name || item.username}`
      )}
    >
      <View style={styles.userInfo}>
        <View style={styles.userDetails}>
          <Text style={[styles.userName, { fontSize: fontSize.md }]}>
            {item.name}
          </Text>
          <Text style={[styles.userUsername, { fontSize: fontSize.sm }]}>
            @{item.username}
          </Text>
        </View>
        <View style={styles.userStatus}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: item.isOnline ? theme.colors.success : theme.colors.textSecondary }
            ]}
          />
          <Text style={[styles.statusText, { fontSize: fontSize.xs }]}>
            {item.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
      <Feather name="arrow-right" size={16} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  const animateScreenIn = async () => {
    screenOpacity.setValue(0);
    formTranslateY.setValue(30);
    
    await Promise.all([
      calmAnimations.fadeIn(screenOpacity, 400),
      calmAnimations.slideUp(formTranslateY, 30, 500),
    ]);
  };

  const searchUser = async (searchUsername: string) => {
    if (!searchUsername.trim()) {
      setUserFound(null);
      setSearchError('');
      setUsernameError('');
      return;
    }

    // Validate username format first
    const validation = ValidationService.validateUsername(searchUsername);
    if (!validation.isValid) {
      setUsernameError(validation.error || '');
      setUserFound(null);
      setSearchError('');
      return;
    }

    setUsernameError('');
    setLoading('search', true);

    try {
      const foundUser = await SupabaseService.searchUserByUsername(searchUsername.trim());
      
      if (foundUser) {
        setUserFound(foundUser);
        setSearchError('');
        focusManagement.announce(`User found: ${foundUser.name || foundUser.username}`);
      } else {
        setUserFound(null);
        setSearchError('User not found');
        feedbackAnimations.errorShake(errorShake).start();
        focusManagement.announce('User not found');
      }
    } catch (error) {
      showError(error, 'Search failed');
      setSearchError('Search failed');
      feedbackAnimations.errorShake(errorShake).start();
      focusManagement.announce('Search failed');
    } finally {
      setLoading('search', false);
    }
  };

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    setSearchError('');
    setUsernameError('');
    setUserFound(null); // Clear previous selection when typing
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Immediate search for dropdown (no debounce for better UX)
    searchUsers(text);
    
    // Debounced search for validation after user stops typing
    searchTimeoutRef.current = setTimeout(() => {
      searchUser(text);
    }, 800);
  };

  const handleMessageChange = (text: string) => {
    setMessage(text);
    setMessageError('');
  };
  
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const handleSendMessage = async () => {
    // Validate inputs
    const usernameValidation = ValidationService.validateUsername(username);
    const messageValidation = ValidationService.validateMessage(message);

    if (!usernameValidation.isValid) {
      setUsernameError(usernameValidation.error || '');
      showError(new Error('Invalid username'), 'Validation error');
      feedbackAnimations.errorShake(errorShake).start();
      return;
    }

    if (!messageValidation.isValid) {
      setMessageError(messageValidation.error || '');
      showError(new Error('Invalid message'), 'Validation error');
      feedbackAnimations.errorShake(errorShake).start();
      return;
    }

    if (!userFound) {
      setSearchError('Please find a valid user first');
      showError(new Error('No user selected'), 'User selection required');
      feedbackAnimations.errorShake(errorShake).start();
      return;
    }

    setLoading('send', true);
    
    // Button press animation
    feedbackAnimations.buttonPress(sendButtonScale).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const conversation = await SupabaseService.createDirectConversation(
        user.id,
        userFound.id,
        message.trim()
      );

      focusManagement.announce('Message sent successfully');
      showSuccess('Message sent successfully');
      
      onChatCreated(conversation.id, {
        id: userFound.id,
        username: userFound.username || '',
        name: userFound.name || userFound.username || '',
      });
    } catch (error) {
      showError(error, 'Failed to send message');
      feedbackAnimations.errorShake(errorShake).start();
      focusManagement.announce('Failed to send message');
    } finally {
      setLoading('send', false);
    }
  };

  const handleKeyboardSubmit = () => {
    if (username.trim() && !userFound) {
      // Search if user hasn't been found yet
      searchUser(username.trim());
    } else if (userFound && message.trim()) {
      // Send message if everything is ready
      handleSendMessage();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#F0FDF4', '#FFFFFF']} style={styles.gradientBg} start={{x:0,y:0}} end={{x:1,y:1}} />
  <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
  <KeyboardAwareWrapper enabled={false}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: screenOpacity,
            transform: [{ translateY: formTranslateY }],
            paddingHorizontal: spacing.md,
          }
        ]}
      >
        {/* Header */}
        <View 
          ref={headerRef}
          style={[
            styles.header,
            { marginBottom: spacing.lg }
          ]}
          {...accessibleProps.header('New Message')}
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
            New Message
          </Text>
          
          <View style={{ width: touchTarget.minSize }} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.form}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          {/* Username Input */}
          <View style={[styles.inputGroup, { marginBottom: spacing.md }]}>
            <Text 
              style={[
                styles.inputLabel,
                { fontSize: fontSize.md, marginBottom: spacing.xs }
              ]}
            >
              To:
            </Text>
            <Animated.View 
              style={[
                styles.inputContainer,
                { 
                  transform: [{ translateX: errorShake }],
                  minHeight: touchTarget.minHeight,
                }
              ]}
            >
        <TextInput
                ref={usernameInputRef}
                style={[
                  styles.textInput,
                  { fontSize: fontSize.md, lineHeight: fontSize.md * 1.4 }
                ]}
                value={username}
                onChangeText={handleUsernameChange}
                placeholder="Type username to search..."
                placeholderTextColor={'#64748B'}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleKeyboardSubmit}
                onFocus={() => {
                  if (username) searchUsers(username);
                }}
                {...accessibleProps.textInput(
                  'Recipient username',
                  'Type to search for users. Select from dropdown or continue typing.'
                )}
              />
              {username.trim() && (
                <View style={styles.searchIndicator}>
                  {searchLoading ? (
                    <Feather name="loader" size={20} color={'#16A34A'} />
                  ) : userFound ? (
                    <Feather name="check-circle" size={20} color={'#16A34A'} />
                  ) : searchError ? (
                    <Feather name="x-circle" size={20} color={'#DC2626'} />
                  ) : (
                    <Feather name="search" size={20} color={'#64748B'} />
                  )}
                </View>
              )}
            </Animated.View>
            
            {/* User Dropdown */}
            <Animated.View 
              style={[
                styles.dropdown,
                { 
                  height: dropdownHeight,
                  opacity: showDropdown ? 1 : 0,
                }
              ]}
            >
              <FlatList
                data={searchResults}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={searchResults.length > 4}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              />
            </Animated.View>
            
            {/* User found indicator */}
            {userFound && (
              <View 
                style={[
                  styles.userFoundContainer,
                  { marginTop: spacing.sm, padding: spacing.sm }
                ]}
              >
                <Feather name="user" size={16} color={'#16A34A'} />
                <Text 
                  style={[
                    styles.userFoundText,
                    { fontSize: fontSize.sm, marginLeft: spacing.xs }
                  ]}
                >
                  {userFound.name || userFound.username}
                </Text>
              </View>
            )}
            
            {/* Search error */}
            {searchError && (
              <Text 
                style={[
                  styles.errorText,
                  { fontSize: fontSize.sm, marginTop: spacing.xs }
                ]}
              >
                {searchError}
              </Text>
            )}
          </View>

          {/* Message Input */}
          <View style={styles.inputGroup}>
            <Text 
              style={[
                styles.inputLabel,
                { fontSize: fontSize.md, marginBottom: spacing.xs }
              ]}
            >
              Message:
            </Text>
            <View 
              style={[
                styles.messageInputContainer,
                { minHeight: isSmall ? 100 : 120 }
              ]}
            >
              <TextInput
                ref={messageInputRef}
                style={[
                  styles.messageInput,
                  { fontSize: fontSize.md, lineHeight: fontSize.md * 1.5 }
                ]}
                value={message}
                onChangeText={setMessage}
                placeholder="Start something beautiful..."
                placeholderTextColor={'#64748B'}
                multiline
                textAlignVertical="top"
                returnKeyType="send"
                onSubmitEditing={handleKeyboardSubmit}
                // Let KeyboardAvoidingView manage visibility
                {...accessibleProps.textInput(
                  'Message content',
                  'Type your message. Press send when ready.'
                )}
              />
            </View>
          </View>
        </ScrollView>

        {/* Send Button */}
        <Animated.View 
          style={[
            styles.sendButtonContainer,
            { 
              transform: [{ scale: sendButtonScale }],
              marginTop: spacing.md,
            }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                minHeight: touchTarget.minHeight,
                opacity: userFound && message.trim() ? 1 : 0.5,
              }
            ]}
            onPress={handleSendMessage}
            disabled={isLoading('send') || !userFound || !message.trim()}
            {...accessibleProps.button(
              accessibilityLabels.sendButton,
              'Double tap to send your message'
            )}
          >
            <Text 
              style={[
                styles.sendButtonText,
                { fontSize: fontSize.md }
              ]}
            >
              {isLoading('send') ? 'Sending...' : 'Send Message'}
            </Text>
            <Feather 
              name="send" 
              size={20} 
              color="white" 
              style={{ marginLeft: spacing.xs }} 
            />
          </TouchableOpacity>
        </Animated.View>
  </Animated.View>
  </KeyboardAwareWrapper>
  </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  gradientBg: { ...StyleSheet.absoluteFillObject },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: typography.fonts.medium, color: '#065F46', flex: 1, textAlign: 'center' },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: { fontFamily: typography.fonts.medium, color: '#065F46' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: {width:0,height:2}, shadowOpacity: 1, shadowRadius: 4, elevation: 2 },
  textInput: { flex: 1, fontFamily: typography.fonts.regular, color: '#065F46', paddingVertical: 12 },
  searchIndicator: {
    marginLeft: 8,
  },
  dropdown: { backgroundColor: '#FFFFFF', borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', elevation: 2, shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: {width:0,height:2}, shadowOpacity: 1, shadowRadius: 4 },
  userItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userDetails: {
    flex: 1,
  },
  userName: { fontFamily: typography.fonts.medium, color: '#065F46' },
  userUsername: { fontFamily: typography.fonts.regular, color: '#64748B', marginTop: 2 },
  userStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: { fontFamily: typography.fonts.regular, color: '#64748B' },
  userFoundContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', borderRadius: 8 },
  userFoundText: { fontFamily: typography.fonts.medium, color: '#16A34A' },
  errorText: { fontFamily: typography.fonts.regular, color: '#DC2626' },
  messageInputContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, shadowColor: 'rgba(0,0,0,0.03)', shadowOffset: {width:0,height:1}, shadowOpacity: 1, shadowRadius: 2, elevation: 1 },
  messageInput: { fontFamily: typography.fonts.regular, color: '#065F46', flex: 1 },
  sendButtonContainer: {
    alignItems: 'center',
  },
  sendButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16A34A', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 16, width: '100%' },
  sendButtonText: { fontFamily: typography.fonts.medium, color: 'white' },
});
