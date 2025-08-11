/// <reference types="react" />
// Clean implementation of responsive direct chat screen
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Animated, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SupabaseService } from '../services/supabase';
import { NetworkService } from '../services/network';
import { theme, typography } from '../utils/theme';
import { useResponsive } from '../utils/responsive';
import { accessibleProps, accessibilityLabels, focusManagement } from '../utils/accessibility';
import { calmAnimations, feedbackAnimations } from '../utils/motion';
import { DirectMessage, User } from '../types';

interface DirectChatScreenProps { user: User; conversationId: string; otherUser: { id: string; username: string; name: string }; onBack: () => void; }

export const DirectChatScreen: React.FC<DirectChatScreenProps> = ({ user, conversationId, otherUser, onBack }) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [keyboardInset, setKeyboardInset] = useState(0); // Android keyboard height
  const [inputHeight, setInputHeight] = useState(0); // measured composer height

  const { device, spacing, fontSize, touchTarget } = useResponsive();

  // Anim refs
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const messagesOpacity = useRef(new Animated.Value(0)).current;
  const inputContainerScale = useRef(new Animated.Value(1)).current;
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const typingOpacity = useRef(new Animated.Value(0)).current;

  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  const headerRef = useRef<View>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Extra visual space between keyboard edge and composer (user requested more gap)
  const EXTRA_KEYBOARD_GAP = 20; // px

  useEffect(() => {
    loadMessages();
    checkNetwork();
    animateIn();
    setTimeout(() => focusManagement.setFocus(headerRef), 300);
    const sub = SupabaseService.subscribeToConversationMessages(conversationId, m => {
      setMessages(prev => [...prev, m]);
      focusManagement.announce('New message received');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    });
    return () => { sub?.unsubscribe(); if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
  }, [conversationId]);

  useEffect(() => {
    const showEvent = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvent = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';
    const showSub = Keyboard.addListener(showEvent, e => {
      if (Platform.OS === 'android') setKeyboardInset(e.endCoordinates?.height || 0);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => { if (Platform.OS === 'android') setKeyboardInset(0); });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const animateIn = async () => {
    screenOpacity.setValue(0); messagesOpacity.setValue(0);
    await Promise.all([
      calmAnimations.fadeIn(screenOpacity, 400),
      calmAnimations.fadeIn(messagesOpacity, 600)
    ]);
  };

  const checkNetwork = async () => {
    const status = await NetworkService.getCurrentStatus();
    setIsOnline(status.isConnected);
  };

  const loadMessages = async () => {
    try {
      const data = await SupabaseService.getDirectMessages(conversationId);
      setMessages(data);
      await SupabaseService.markMessagesAsRead(conversationId, user.id);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 60);
    } catch (e) {
      console.error('Load messages failed', e); Alert.alert('Error', 'Failed to load messages');
    }
  };

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || sending) return;
    setSending(true);
    feedbackAnimations.buttonPress(sendButtonScale).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewMessage('');
    calmAnimations.scaleIn(inputContainerScale);
    try {
      const m = await SupabaseService.sendMessageToConversation(conversationId, user.id, text);
      setMessages(prev => [...prev, m]);
      focusManagement.announce('Message sent');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 70);
    } catch (e) {
      console.error('Send failed', e); setNewMessage(text); Alert.alert('Error', 'Failed to send'); feedbackAnimations.errorShake(inputContainerScale).start(); focusManagement.announce('Failed to send message');
    } finally { setSending(false); }
  };

  const handleTextChange = (t: string) => {
    setNewMessage(t);
    if (t.length && !typingIndicator) { setTypingIndicator(true); calmAnimations.fadeIn(typingOpacity); }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { setTypingIndicator(false); calmAnimations.fadeOut(typingOpacity); }, 2000);
  };

  const formatTime = (d: Date) => {
    const now = new Date(); const diffMs = now.getTime() - d.getTime();
    const m = Math.floor(diffMs / 60000); const h = Math.floor(diffMs / 3600000); const day = Math.floor(diffMs / 86400000);
    if (m < 1) return 'now'; if (m < 60) return `${m}m ago`; if (h < 24) return `${h}h ago`; if (day < 7) return `${day}d ago`; return d.toLocaleDateString();
  };

  const renderMessage = ({ item, index }: { item: DirectMessage; index: number }) => {
    const isOwn = item.senderId === user.id;
    const fade = useRef(new Animated.Value(0)).current;
    useEffect(() => { setTimeout(() => calmAnimations.fadeIn(fade, 300), index * 35); }, []);
    return (
      <Animated.View style={[styles.messageContainer, { opacity: fade, alignItems: isOwn ? 'flex-end' : 'flex-start', marginBottom: spacing.sm, paddingHorizontal: spacing.md }]}>
        <View style={[styles.messageBubble, { backgroundColor: isOwn ? theme.colors.primary : theme.colors.surfaceVariant, maxWidth: (device.screenSize === 'xs' || device.screenSize === 'sm') ? '85%' : '75%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]} {...accessibleProps.message(isOwn ? 'You' : otherUser.name, item.messageText, formatTime(new Date(item.createdAt)), item.status || 'sent')}>
          <Text style={[styles.messageText, { color: isOwn ? 'white' : theme.colors.onBackground, fontSize: fontSize.md, lineHeight: fontSize.md * 1.4 }]}>{item.messageText}</Text>
          <View style={[styles.messageFooter, { marginTop: spacing.xs }]}> 
            <Text style={[styles.messageTime, { color: isOwn ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary, fontSize: fontSize.xs }]}>{formatTime(new Date(item.createdAt))}</Text>
            {isOwn && (<View style={{ marginLeft: spacing.xs }}><Feather name={item.status === 'read' ? 'check-circle' : 'check'} size={12} color='rgba(255,255,255,0.7)' /></View>)}
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderTyping = () => (
    <Animated.View style={[styles.typingContainer, { opacity: typingOpacity, paddingHorizontal: spacing.md, marginBottom: spacing.sm }]}>
      <View style={styles.typingBubble}><Text style={[styles.typingText, { fontSize: fontSize.sm }]}>{otherUser.name} is typing...</Text></View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
        <Animated.View ref={headerRef} style={[styles.header, { opacity: screenOpacity, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]} onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)} {...accessibleProps.header(`Chat with ${otherUser.name}`)}>
          <TouchableOpacity style={[styles.backButton, { minWidth: touchTarget.minSize, minHeight: touchTarget.minSize }]} onPress={onBack} {...accessibleProps.button(accessibilityLabels.backButton)}>
            <Feather name='arrow-left' size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { fontSize: fontSize.lg, lineHeight: fontSize.lg * 1.2 }]}>{otherUser.name}</Text>
            <Text style={[styles.headerStatus, { fontSize: fontSize.sm }]}>@{otherUser.username}</Text>
          </View>
          {!isOnline && (
            <View style={styles.offlineIndicator} {...accessibleProps.status('Offline', 'You are currently offline')}>
              <Feather name='wifi-off' size={16} color={theme.colors.warning} />
            </View>
          )}
        </Animated.View>

        <Animated.View style={[styles.messagesContainer, { opacity: messagesOpacity }]}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={i => i.id}
            contentContainerStyle={[styles.messagesList, { paddingBottom: (inputHeight || 48) + spacing.xs }]}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps='handled'
            accessible
            accessibilityLabel='Messages list'
          />
          {typingIndicator && renderTyping()}
        </Animated.View>

  <Animated.View style={[styles.inputContainer, { transform: [{ scale: inputContainerScale }], paddingHorizontal: spacing.md, paddingVertical: Math.max(6, spacing.sm - 4), marginBottom: Platform.OS === 'android' ? Math.max(0, keyboardInset - (touchTarget.minHeight + spacing.md + 8)) + EXTRA_KEYBOARD_GAP : 0 }]} onLayout={e => { const h = e.nativeEvent.layout.height; if (h && Math.abs(h - inputHeight) > 2) setInputHeight(h); }}>
          <View style={[styles.inputWrapper, { minHeight: touchTarget.minHeight, paddingVertical: 6 }]}>
            <TextInput ref={textInputRef} style={[styles.textInput, { fontSize: fontSize.md, lineHeight: fontSize.md * 1.4 }]} value={newMessage} onChangeText={handleTextChange} placeholder='Message...' placeholderTextColor={theme.colors.textSecondary} multiline maxLength={1000} returnKeyType='send' onSubmitEditing={handleSend} onFocus={() => requestAnimationFrame(() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 40))} {...accessibleProps.textInput('Message input', 'Type your message and press send')} />
            <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
              <TouchableOpacity style={[styles.sendButton, { minWidth: touchTarget.minSize, minHeight: touchTarget.minSize, opacity: newMessage.trim() ? 1 : 0.5 }]} onPress={handleSend} disabled={!newMessage.trim() || sending} {...accessibleProps.button(accessibilityLabels.sendButton, 'Double tap to send your message')}>
                <Feather name={sending ? 'clock' : 'send'} size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  keyboardView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backButton: { alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerInfo: { flex: 1 },
  headerName: { fontFamily: typography.fonts.medium, color: theme.colors.text },
  headerStatus: { fontFamily: typography.fonts.regular, color: theme.colors.textSecondary },
  offlineIndicator: { padding: 8 },
  messagesContainer: { flex: 1 },
  messagesList: { flexGrow: 1, justifyContent: 'flex-end' },
  messageContainer: { width: '100%' },
  messageBubble: { borderRadius: 16, shadowColor: theme.colors.shadowLight, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  messageText: { fontFamily: typography.fonts.regular },
  messageFooter: { flexDirection: 'row', alignItems: 'center' },
  messageTime: { fontFamily: typography.fonts.regular },
  typingContainer: { alignItems: 'flex-start' },
  typingBubble: { backgroundColor: theme.colors.surfaceVariant, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8 },
  typingText: { fontFamily: typography.fonts.regular, color: theme.colors.textSecondary, fontStyle: 'italic' },
  inputContainer: { backgroundColor: theme.colors.background, borderTopWidth: 1, borderTopColor: theme.colors.border },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: theme.colors.surfaceVariant, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  textInput: { flex: 1, fontFamily: typography.fonts.regular, color: theme.colors.onBackground, maxHeight: 120, paddingVertical: 8 },
  sendButton: { alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
