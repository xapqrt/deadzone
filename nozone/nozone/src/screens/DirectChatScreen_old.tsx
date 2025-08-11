import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  SlideInRight,
  SlideInLeft,
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
import { DirectMessage, User } from '../types';

interface DirectChatScreenProps {
  user: User;
  conversationId: string;
  otherUser: {
    id: string;
    username: string;
    name: string;
  };
  onBack: () => void;
}

export const DirectChatScreen: React.FC<DirectChatScreenProps> = ({
  user,
  conversationId,
  otherUser,
  onBack,
}) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const flatListRef = useRef<FlatList>(null);
  const sendButtonScale = useSharedValue(1);
  const headerRef = useRef<View>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [androidInset, setAndroidInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const showSub = Keyboard.addListener('keyboardDidShow', e => setAndroidInset(e.endCoordinates.height));
      const hideSub = Keyboard.addListener('keyboardDidHide', () => setAndroidInset(0));
      return () => { showSub.remove(); hideSub.remove(); };
    }
  }, []);

  useEffect(() => {
    loadMessages();
    checkNetworkStatus();
  }, []);

  const checkNetworkStatus = async () => {
    const status = await NetworkService.getCurrentStatus();
    setIsOnline(status.isConnected);
  };

  const loadMessages = async () => {
    try {
      const chatMessages = await SupabaseService.getConversationMessages(
        conversationId,
        user.id
      );
      setMessages(chatMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      Toast.show({
        type: 'error',
        text1: 'Loading Failed',
        text2: 'Could not load conversation',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      setSending(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Animate send button
      sendButtonScale.value = withSpring(0.9, {}, () => {
        sendButtonScale.value = withSpring(1);
      });

      const result = await SupabaseService.sendDirectMessage(
        user.id,
        otherUser.username,
        messageText.trim()
      );

      if (result.success) {
        // Clear input
        setMessageText('');
        
        // Reload messages to show the new one
        await loadMessages();
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        Toast.show({
          type: 'success',
          text1: '✅ Message Sent',
          text2: 'Message delivered successfully',
        });
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
      setSending(false);
    }
  };

  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      });
    }
  };

  const renderMessage = ({ item, index }: { item: DirectMessage; index: number }) => {
    const isMyMessage = item.senderId === user.id;
    const showAvatar = !isMyMessage;
    
    return (
      <Animated.View 
        entering={isMyMessage ? SlideInRight.delay(index * 50) : SlideInLeft.delay(index * 50)}
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
        ]}
      >
        {showAvatar && (
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {otherUser.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.messageText}
          </Text>
          
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.otherMessageTime
            ]}>
              {formatMessageTime(item.createdAt)}
            </Text>
            
            {isMyMessage && (
              <Feather 
                name={item.status === 'read' ? 'check-circle' : 'check'} 
                size={12} 
                color={
                  item.status === 'read' 
                    ? theme.colors.success 
                    : theme.colors.primaryAlpha
                } 
              />
            )}
          </View>
        </View>
        
        {isMyMessage && <View style={styles.spacer} />}
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <Animated.View entering={FadeIn.delay(300)} style={styles.emptyState}>
      <View style={styles.emptyAvatar}>
        <Text style={styles.emptyAvatarText}>
          {otherUser.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.emptyTitle}>
        Start chatting with {otherUser.name}
      </Text>
      <Text style={styles.emptySubtitle}>
        @{otherUser.username}
      </Text>
      <Text style={styles.emptyHint}>
        Send your first message to start the conversation
      </Text>
    </Animated.View>
  );

  const sendButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
  <Animated.View entering={FadeIn} style={styles.header} ref={headerRef} onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {otherUser.name}
          </Text>
          <Text style={styles.headerUsername}>
            @{otherUser.username}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.headerAction}>
          <Feather name="more-vertical" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </Animated.View>

      {/* Offline Indicator */}
      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <Feather name="wifi-off" size={16} color={theme.colors.warning} />
          <Text style={styles.offlineText}>
            Offline - Messages will send when online
          </Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.messagesList,
          messages.length === 0 && styles.emptyMessagesList
        ]}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 100);
        }}
      />

      {/* Input */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.inputContainer, Platform.OS === 'android' && { marginBottom: Math.max(0, androidInset - 60) }]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.textMuted}
            multiline
            maxLength={1000}
            editable={!sending}
          />
          
          <Animated.View style={sendButtonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || sending) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || sending}
            >
              <Feather 
                name={sending ? "loader" : "send"} 
                size={20} 
                color={
                  (!messageText.trim() || sending)
                    ? theme.colors.textMuted
                    : theme.colors.onPrimary
                } 
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  headerName: {
  fontSize: theme.fontSizes.lg,
  lineHeight: theme.lineHeights.lg,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  headerUsername: {
  fontSize: theme.fontSizes.xs,
  lineHeight: theme.lineHeights.xs,
    color: theme.colors.primary,
  },
  headerAction: {
    padding: theme.spacing.xs,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.warningAlpha,
    gap: theme.spacing.xs,
  },
  offlineText: {
  fontSize: theme.fontSizes.xs,
  lineHeight: theme.lineHeights.xs,
    color: theme.colors.warning,
  },
  messagesList: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  emptyMessagesList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyAvatarText: {
  fontSize: theme.fontSizes.xxxl,
  lineHeight: theme.lineHeights.xxxl,
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
  emptyTitle: {
  fontSize: theme.fontSizes.xl,
  lineHeight: theme.lineHeights.xl,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
  fontSize: theme.fontSizes.md,
  lineHeight: theme.lineHeights.md,
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptyHint: {
  fontSize: theme.fontSizes.sm,
  lineHeight: theme.lineHeights.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: theme.spacing.xs,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: theme.spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
  fontSize: theme.fontSizes.sm,
  lineHeight: theme.lineHeights.sm,
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  myMessageBubble: {
  backgroundColor: theme.colors.primaryAlpha,    // Light tinted background for sent messages
  },
  otherMessageBubble: {
  backgroundColor: theme.colors.backgroundSecondary, // Neutral background for received messages
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  messageText: {
  fontSize: theme.fontSizes.md,
  lineHeight: theme.lineHeights.md,
    lineHeight: 20,
  },
  myMessageText: {
    color: theme.colors.onSurface,    // Dark text on light blue bubble
  },
  otherMessageText: {
    color: theme.colors.onSurface,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  messageTime: {
  fontSize: theme.fontSizes.xs,
  lineHeight: theme.lineHeights.xs,
    fontSize: 11,
  },
  myMessageTime: {
    color: theme.colors.primaryAlpha,
  },
  otherMessageTime: {
    color: theme.colors.textSecondary,
  },
  spacer: {
    width: 32,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  textInput: {
    flex: 1,
  fontSize: theme.fontSizes.md,
  lineHeight: theme.lineHeights.md,
    color: theme.colors.onSurface,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.inputBackground,
  },
});
