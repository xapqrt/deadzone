import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

import { SupabaseService } from '../services/supabase';
import { NetworkService } from '../services/network';
import { theme, typography } from '../utils/theme';
import { Button } from '../components/ui/Button';
import { User } from '../types';

interface DirectComposeScreenProps {
  user: User;
  onBack: () => void;
  onMessageSent: (conversationId: string, otherUser: { id: string; username: string; name: string }) => void;
  prefilledUsername?: string;
}

export const DirectComposeScreen: React.FC<DirectComposeScreenProps> = ({
  user,
  onBack,
  onMessageSent,
  prefilledUsername = '',
}) => {
  const [recipientInput, setRecipientInput] = useState(prefilledUsername);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const sendButtonScale = useSharedValue(1);

  useEffect(() => {
    checkNetworkStatus();
  }, []);

  const checkNetworkStatus = async () => {
    const status = await NetworkService.getCurrentStatus();
    setIsOnline(status.isConnected);
  };

  const validateInput = () => {
    if (!recipientInput.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing Recipient',
        text2: 'Please enter a @username or display name',
      });
      return false;
    }

    if (!messageText.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Empty Message',
        text2: 'Please enter a message to send',
      });
      return false;
    }

    if (messageText.length > 1000) {
      Toast.show({
        type: 'error',
        text1: 'Message Too Long',
        text2: 'Messages must be 1000 characters or less',
      });
      return false;
    }

    return true;
  };

  const handleSend = async () => {
    if (!validateInput()) return;

    try {
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Animate send button
      sendButtonScale.value = withSpring(0.9, {}, () => {
        sendButtonScale.value = withSpring(1);
      });

      // Clean username (remove @ if present)
      const cleanUsername = recipientInput.trim().replace(/^@/, '');

      // Send the message
      const result = await SupabaseService.sendDirectMessage(
        user.id,
        cleanUsername,
        messageText.trim()
      );

      if (result.success) {
        if (result.recipientExists) {
          Toast.show({
            type: 'success',
            text1: '✅ Message Sent',
            text2: `Message sent to @${cleanUsername}`,
          });

          // Navigate to the conversation if we have the data
          if (result.conversationId) {
            onMessageSent(result.conversationId, {
              id: '', // Will be filled by the conversation
              username: cleanUsername,
              name: cleanUsername, // Fallback to username
            });
          } else {
            onBack();
          }
        } else {
          Toast.show({
            type: 'info',
            text1: '📬 Message Queued',
            text2: result.message,
          });
          onBack();
        }

        // Clear form
        setRecipientInput('');
        setMessageText('');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      Toast.show({
        type: 'error',
        text1: 'Send Failed',
        text2: 'Could not send message. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <Animated.View entering={FadeIn} style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Write with Intent</Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Offline Indicator */}
        {!isOnline && (
          <Animated.View entering={SlideInDown} style={styles.offlineIndicator}>
            <Feather name="wifi-off" size={16} color={theme.colors.warning} />
            <Text style={styles.offlineText}>
              📡 Offline – Message will send when you're back
            </Text>
          </Animated.View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Recipient Input */}
          <Animated.View entering={SlideInDown.delay(200)} style={styles.section}>
            <Text style={styles.sectionLabel}>To</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.recipientInput}
                value={recipientInput}
                onChangeText={setRecipientInput}
                placeholder="@username or display name"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={!prefilledUsername}
              />
            </View>
            <Text style={styles.inputHint}>
              Enter exact @username or display name. No search or suggestions.
            </Text>
          </Animated.View>

          {/* Message Input */}
          <Animated.View entering={SlideInDown.delay(400)} style={styles.section}>
            <Text style={styles.sectionLabel}>Message</Text>
            <View style={styles.messageInputContainer}>
              <TextInput
                style={styles.messageInput}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Write something timeless…"
                placeholderTextColor={theme.colors.textMuted}
                multiline
                textAlignVertical="top"
                maxLength={1000}
                autoFocus={!!prefilledUsername}
              />
              <View style={styles.characterCount}>
                <Text style={styles.characterCountText}>
                  {messageText.length}/1000
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Info Card */}
          <Animated.View entering={SlideInDown.delay(600)} style={styles.infoCard}>
            <Feather name="info" size={20} color={theme.colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>How it works</Text>
              <Text style={styles.infoText}>
                • Type exact @username to message someone{'\n'}
                • If they exist: message sends immediately{'\n'}
                • If not: message queues until they join{'\n'}
                • They'll see your message once they reply (handshake)
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Send Button */}
        <Animated.View 
          entering={SlideInDown.delay(800)} 
          style={[styles.sendSection, sendButtonAnimatedStyle]}
        >
          <Button
            title={isLoading ? 'Sending...' : 'Send Message'}
            onPress={handleSend}
            disabled={isLoading || !recipientInput.trim() || !messageText.trim()}
            loading={isLoading}
            variant="primary"
            style={styles.sendButton}
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardContainer: {
    flex: 1,
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
  headerSpacer: {
    width: 40, // Match back button width
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
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionLabel: {
    ...typography.bodyLarge,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  inputContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  recipientInput: {
    ...typography.bodyLarge,
    color: theme.colors.onSurface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    minHeight: 48,
  },
  inputHint: {
    ...typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  messageInputContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
    position: 'relative',
  },
  messageInput: {
    ...typography.bodyLarge,
    color: theme.colors.onSurface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.xl, // Space for character count
    minHeight: 120,
    maxHeight: 200,
  },
  characterCount: {
    position: 'absolute',
    bottom: theme.spacing.xs,
    right: theme.spacing.sm,
  },
  characterCountText: {
    ...typography.caption,
    color: theme.colors.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primaryAlpha,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  infoContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  infoTitle: {
    ...typography.bodyMedium,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    ...typography.small,
    color: theme.colors.primary,
    lineHeight: 18,
  },
  sendSection: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  sendButton: {
    width: '100%',
  },
});
