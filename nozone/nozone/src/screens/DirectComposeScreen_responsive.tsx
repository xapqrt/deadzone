import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Keyboard,
  Animated,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SupabaseService } from '../services/supabase';
import { theme, typography } from '../utils/theme';
import { useResponsive } from '../utils/responsive';
import { accessibleProps, accessibilityLabels, focusManagement } from '../utils/accessibility';
import { calmAnimations, feedbackAnimations } from '../utils/motion';
import { User } from '../types';
import { KeyboardAwareWrapper } from '../components/KeyboardAwareWrapper';

interface DirectComposeScreenProps {
  user: User;
  onBack: () => void;
  onChatCreated: (conversationId: string, otherUser: { id: string; username: string; name: string }) => void;
}

export const DirectComposeScreen: React.FC<DirectComposeScreenProps> = ({
  user,
  onBack,
  onChatCreated,
}) => {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [userFound, setUserFound] = useState<User | null>(null);
  const [searchError, setSearchError] = useState('');

  const { device, spacing, fontSize, touchTarget } = useResponsive();
  
  // Animation refs
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const errorShake = useRef(new Animated.Value(0)).current;
  
  // Input refs for focus management
  const usernameInputRef = useRef<TextInput>(null);
  const messageInputRef = useRef<TextInput>(null);
  const headerRef = useRef<View>(null);

  useEffect(() => {
    // Animate screen entrance
    animateScreenIn();
    
    // Set focus to header for screen readers
    setTimeout(() => {
      focusManagement.setFocus(headerRef);
    }, 300);
    
    // Auto-focus username input after animations
    setTimeout(() => {
      usernameInputRef.current?.focus();
    }, 600);

    // Cleanup timers on unmount to avoid setState on unmounted component
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current as any);
        searchTimeoutRef.current = null;
      }
    };
  }, []);

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
      return;
    }

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
      console.error('Search error:', error);
      setSearchError('Search failed');
      feedbackAnimations.errorShake(errorShake).start();
      focusManagement.announce('Search failed');
    }
  };

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    setSearchError('');
    
    // Debounced search after user stops typing
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      searchUser(text);
    }, 500);
  };
  
  // Use generic ReturnType to avoid Node vs browser timer type mismatch in React Native
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const handleSendMessage = async () => {
    if (!userFound || !message.trim()) {
      Alert.alert('Error', 'Please select a user and enter a message');
      feedbackAnimations.errorShake(errorShake).start();
      return;
    }

    setLoading(true);
    feedbackAnimations.buttonPress(sendButtonScale).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let sent = false;
    try {
      const conversation = await SupabaseService.createDirectConversation(
        user.id,
        userFound.id,
        message.trim()
      );
      sent = true;
      focusManagement.announce('Message sent successfully');
      // Fallback: force stats refresh and emit optimistic event in case event bus missed
      setTimeout(() => {
        try {
          const { DeviceEventEmitter } = require('react-native');
          DeviceEventEmitter.emit('directMessageSent', {
            conversationId: conversation.id,
            at: Date.now(),
            optimistic: true,
            source: 'DirectComposeScreen_fallback',
          });
          DeviceEventEmitter.emit('forceStatsRefresh', { reason: 'composeFallback' });
        } catch {}
      }, 1200);
      onChatCreated(conversation.id, {
        id: userFound.id,
        username: `${userFound.username || ''}`,
        name: `${userFound.name || userFound.username || ''}`,
      });
      // Clear fields for next send
      setUsername('');
      setMessage('');
      setUserFound(null);
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      feedbackAnimations.errorShake(errorShake).start();
      focusManagement.announce('Failed to send message');
      // Fallback: emit failed event and force refresh
      setTimeout(() => {
        try {
          const { DeviceEventEmitter } = require('react-native');
          DeviceEventEmitter.emit('directMessageFailed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            at: Date.now(),
            source: 'DirectComposeScreen_fallback',
          });
          DeviceEventEmitter.emit('forceStatsRefresh', { reason: 'composeFallbackError' });
        } catch {}
      }, 1200);
    } finally {
      setLoading(false);
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
      <LinearGradient colors={['#F0FDF4', '#FFFFFF']} style={StyleSheet.absoluteFillObject} start={{x:0,y:0}} end={{x:1,y:1}} />
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
                placeholder="Enter username"
                placeholderTextColor={'#64748B'}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleKeyboardSubmit}
                // Removed aggressive onFocus scroll to prevent jumping
                {...accessibleProps.textInput(
                  'Recipient username',
                  'Enter the username of the person you want to message'
                )}
              />
              {username.trim() && (
                <View style={styles.searchIndicator}>
                  {userFound ? (
                    <Feather name="check-circle" size={20} color={'#16A34A'} />
                  ) : searchError ? (
                    <Feather name="x-circle" size={20} color={'#DC2626'} />
                  ) : (
                    <Feather name="search" size={20} color={'#64748B'} />
                  )}
                </View>
              )}
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
                { minHeight: 120 }
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
                // Removed onFocus scroll to avoid overshoot; KeyboardAvoidingView handles lift
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
            disabled={loading || !userFound || !message.trim()}
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
              {loading ? 'Sending...' : 'Send Message'}
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
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, shadowColor:'rgba(0,0,0,0.05)', shadowOffset:{width:0,height:2}, shadowOpacity:1, shadowRadius:4 },
  textInput: { flex: 1, fontFamily: typography.fonts.regular, color: '#065F46', paddingVertical: 12 },
  searchIndicator: {
    marginLeft: 8,
  },
  userFoundContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', borderRadius: 8 },
  userFoundText: { fontFamily: typography.fonts.medium, color: '#16A34A' },
  errorText: { fontFamily: typography.fonts.regular, color: '#DC2626' },
  messageInputContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, shadowColor:'rgba(0,0,0,0.03)', shadowOffset:{width:0,height:1}, shadowOpacity:1, shadowRadius:2 },
  messageInput: { fontFamily: typography.fonts.regular, color: '#065F46', flex: 1 },
  sendButtonContainer: {
    alignItems: 'center',
  },
  sendButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16A34A', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 16, width: '100%' },
  sendButtonText: { fontFamily: typography.fonts.medium, color: 'white' },
});
