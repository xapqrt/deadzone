import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Animated, ActivityIndicator, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { SupabaseService } from '../services/supabase';
import { DeviceEventEmitter } from 'react-native';
import { OfflineQueueService } from '../services/offlineQueueService';
import { NetworkService } from '../services/network';
import { showError, showSuccess } from '../services/errorService';
import { theme, typography } from '../utils/theme';
import { IconButton } from '../components/ui';
import { useResponsive } from '../utils/responsive';
import { accessibleProps, accessibilityLabels, focusManagement } from '../utils/accessibility';
import { calmAnimations, feedbackAnimations } from '../utils/motion';
import { DirectMessage, User } from '../types';
import { useLocalMessages } from '../hooks/useLocalMessages';

interface DirectChatScreenProps {
  user: User;
  conversationId: string;
  otherUser: { id: string; username: string; name: string };
  onBack: () => void;
}

export const DirectChatScreen: React.FC<DirectChatScreenProps> = ({ user, conversationId, otherUser, onBack }) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  // Local stats bridge
  const { actions: localMessageActions } = useLocalMessages(user.id);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const { spacing, fontSize, touchTarget, isSmall } = useResponsive();

  // Animation refs
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const messagesOpacity = useRef(new Animated.Value(0)).current;
  const sendButtonScale = useRef(new Animated.Value(1)).current;

  const flatListRef = useRef<FlatList<DirectMessage>>(null);
  const headerRef = useRef<View>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [androidKeyboardInset, setAndroidKeyboardInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const showSub = Keyboard.addListener('keyboardDidShow', e => {
        setAndroidKeyboardInset(e.endCoordinates.height);
      });
      const hideSub = Keyboard.addListener('keyboardDidHide', () => setAndroidKeyboardInset(0));
      return () => { showSub.remove(); hideSub.remove(); };
    }
  }, []);

  const animateIn = () => {
    Animated.sequence([
      Animated.timing(screenOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(messagesOpacity, { toValue: 1, duration: 300, useNativeDriver: true })
    ]).start();
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await loadMessages();
        await SupabaseService.markMessagesAsRead(conversationId, user.id);
        const network = await NetworkService.getCurrentStatus();
        if (active) setIsOnline(network.isConnected);
      } finally {
        if (active) setLoading(false);
        animateIn();
        setTimeout(() => focusManagement.setFocus(headerRef), 300);
      }
    })();

    const sub = SupabaseService.subscribeToConversationMessages(conversationId, (m: DirectMessage) => {
      setMessages(prev => [...prev, m]);
      // No longer bridging inbound to local stats; stats now come from Supabase directly
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
      focusManagement.announce('New message received');
    });

    return () => {
      active = false;
      sub?.unsubscribe?.();
    };
  }, [conversationId, user.id]);

  const loadMessages = useCallback(async () => {
    try {
      const data = await SupabaseService.getDirectMessages(conversationId, user.id);
      setMessages(data);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 50);
    } catch (err) {
      showError(err, 'Failed to load messages');
    }
  }, [conversationId, user.id]);

  const handleSend = async () => {
    const body = newMessage.trim();
    if (!body || sending) return;
    setSending(true);
    feedbackAnimations.buttonPress(sendButtonScale).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const optimistic: DirectMessage = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderId: user.id,
      recipientId: otherUser.id,
      messageText: body,
      createdAt: new Date().toISOString(),
      status: 'sending'
    } as any;
    setMessages(prev => [...prev, optimistic]);
    setNewMessage('');
    try {
      // If offline, push to queue instead of immediate send
      const network = await NetworkService.getCurrentStatus();
      if (!network.isConnected) {
        // Transform optimistic message into queued DirectMessage structure
        const queuedMessage: DirectMessage = {
          id: optimistic.id,
          conversationId,
          senderId: user.id,
          recipientId: otherUser.id,
            messageText: body,
          status: 'pending',
          deliverAfter: new Date(),
          createdAt: new Date().toISOString()
        } as any;
        await OfflineQueueService.addMessage(queuedMessage, 2);
        showSuccess('Queued (offline)');
        // Emit optimistic pending count change
        DeviceEventEmitter.emit('directMessagePending', { id: queuedMessage.id });
      } else {
        console.log('📤 [DirectChatScreen] Sending via sendDirectMessage', { conversationId, username: otherUser.username });
        const dmResult = await SupabaseService.sendDirectMessage(user.id, otherUser.username, body, new Date());
        if (!dmResult.success || !dmResult.messageId) {
          throw new Error(dmResult.message || 'Send failed');
        }
        const saved: DirectMessage = {
          id: dmResult.messageId,
          conversationId: dmResult.conversationId || conversationId,
          senderId: user.id,
          recipientId: otherUser.id,
          messageText: body,
          status: 'sent',
          deliverAfter: new Date(),
          createdAt: new Date().toISOString(),
        } as any;
        setMessages(prev => prev.map(m => (m.id === optimistic.id ? saved : m)));
        showSuccess('Sent');
        // Emit optimistic sent increment
        DeviceEventEmitter.emit('directMessageSent', { id: saved.id });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 60);
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setNewMessage(body);
      showError(err, 'Send failed');
      DeviceEventEmitter.emit('directMessageFailed', {});
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: string | Date) => {
    const date = typeof ts === 'string' ? new Date(ts) : ts;
    const diff = Date.now() - date.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`; 
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`; 
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d`;
    return date.toLocaleDateString();
  };

  const renderMessage = ({ item }: { item: DirectMessage }) => {
    const mine = item.senderId === user.id;
    const gradient: [string, string] = mine
      ? [theme.colors.primary, theme.colors.primaryVariant || theme.colors.primary]
      : [theme.colors.surfaceVariant, theme.colors.backgroundSecondary];
    return (
      <View style={[styles.row, { justifyContent: mine ? 'flex-end' : 'flex-start', paddingHorizontal: spacing.md }]}>        
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, { maxWidth: isSmall ? '85%' : '75%' }]}
          {...(accessibleProps?.message ? accessibleProps.message(mine ? 'You' : otherUser.name, item.messageText, formatTime(item.createdAt), item.status || 'sent') : {})}
        >
          <Text style={[styles.bodyText, { color: mine ? '#fff' : theme.colors.text, fontSize: fontSize.md }]}>{item.messageText}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.timeText, { color: mine ? 'rgba(255,255,255,0.75)' : theme.colors.textSecondary, fontSize: fontSize.xs }]}>{formatTime(item.createdAt)}</Text>
            {mine && (
              <Feather name={item.status === 'read' ? 'check-circle' : 'check'} size={12} color={mine ? 'rgba(255,255,255,0.75)' : theme.colors.textSecondary} style={{ marginLeft: 4 }} />
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex} keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
        <Animated.View ref={headerRef} style={[styles.header, { opacity: screenOpacity, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}
          onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}
          {...(accessibleProps?.header ? accessibleProps.header(`Chat with ${otherUser.name}`) : {})}
        >
          <IconButton name="arrow-left" onPress={onBack} accessibilityLabel={accessibilityLabels?.backButton || 'Back'} />
          <View style={styles.headerInfo}>
            <Text style={[styles.title, { fontSize: fontSize.lg }]} numberOfLines={1}>{otherUser.name}</Text>
            <Text style={[styles.subtitle, { fontSize: fontSize.xs }]}>{`@${otherUser.username}`}</Text>
          </View>
          {!isOnline && <Feather name="wifi-off" size={18} color={theme.colors.warning} />}
        </Animated.View>

        {loading ? (
          <View style={[styles.loading, { padding: spacing.lg }]}> 
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <Animated.View style={[styles.messages, { opacity: messagesOpacity }]}> 
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={m => m.id}
              renderItem={renderMessage}
              contentContainerStyle={[styles.listContent, { paddingVertical: spacing.md }]}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />
          </Animated.View>
        )}

  <View style={[styles.inputBar, { padding: spacing.sm, paddingBottom: Platform.OS === 'ios' ? spacing.sm : spacing.sm, marginBottom: Platform.OS === 'android' ? Math.max(0, androidKeyboardInset - (touchTarget.minHeight + spacing.md)) : 0 }]}>          
          <View style={[styles.inputWrapper, { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, minHeight: touchTarget.minHeight }]}>            
            <TextInput
              style={[styles.input, { fontSize: fontSize.md }]}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Message..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              {...(accessibleProps?.textInput ? accessibleProps.textInput('Message input', 'Type your message and press send') : {})}
            />
            <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
              <IconButton
                name={sending ? 'clock' : 'send'}
                onPress={handleSend}
                disabled={!newMessage.trim() || sending}
                variant="filled"
                accessibilityLabel={accessibilityLabels?.sendButton || 'Send message'}
              />
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  headerInfo: { flex: 1, marginLeft: 8 },
  title: { fontFamily: typography.fonts.medium, color: theme.colors.onBackground },
  subtitle: { fontFamily: typography.fonts.regular, color: theme.colors.textSecondary },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messages: { flex: 1 },
  listContent: { flexGrow: 1, justifyContent: 'flex-end' },
  row: { width: '100%', marginBottom: 8 },
  bubble: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, ...theme.shadows.xs },
  bodyText: { fontFamily: typography.fonts.regular },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  timeText: { fontFamily: typography.fonts.regular },
  inputBar: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: theme.colors.surfaceVariant, borderRadius: 28 },
  input: { flex: 1, fontFamily: typography.fonts.regular, paddingVertical: 10, paddingRight: 8, color: theme.colors.onBackground, maxHeight: 120 },
});
