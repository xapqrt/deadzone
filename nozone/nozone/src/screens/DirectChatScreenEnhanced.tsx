import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { theme } from '../utils/theme';
import { useResponsive } from '../utils/responsive';

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  type: 'sent' | 'received';
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

interface DirectChatScreenEnhancedProps {
  contactName: string;
  contactPhone: string;
  onBack: () => void;
}

export const DirectChatScreenEnhanced: React.FC<DirectChatScreenEnhancedProps> = ({
  contactName,
  contactPhone,
  onBack,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const responsive = useResponsive();
  const styles = createResponsiveStyles(responsive);
  
  // Animation refs
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const inputScale = useRef(new Animated.Value(1)).current;
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  
  // Refs
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Animate screen in
    Animated.timing(screenOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate send button
    Animated.sequence([
      Animated.timing(sendButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(sendButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      timestamp: new Date(),
      type: 'sent',
      status: 'sending',
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessages(prev =>
        prev.map(msg =>
          msg.id === message.id
            ? { ...msg, status: 'delivered' }
            : msg
        )
      );
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
      setMessages(prev => prev.filter(msg => msg.id !== message.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (text: string) => {
    setNewMessage(text);
    
    // Animate input container on first character
    if (text.length === 1 && newMessage.length === 0) {
      Animated.spring(inputScale, {
        toValue: 1.02,
        useNativeDriver: true,
      }).start();
    } else if (text.length === 0 && newMessage.length === 1) {
      Animated.spring(inputScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageWrapper,
        item.type === 'sent' ? styles.sentWrapper : styles.receivedWrapper,
      ]}
    >
      <Animated.View
        style={[
          styles.messageBubble,
          item.type === 'sent' ? styles.sentBubble : styles.receivedBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.type === 'sent' ? styles.sentText : styles.receivedText,
          ]}
        >
          {item.text}
        </Text>
        
        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>
            {item.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          
          {item.type === 'sent' && (
            <Ionicons
              name={
                item.status === 'sending' ? 'time-outline' :
                item.status === 'sent' ? 'checkmark' :
                item.status === 'delivered' ? 'checkmark-done' :
                'checkmark-done-circle'
              }
              size={responsive.fontSize.sm}
              color={
                item.status === 'read' 
                  ? theme.colors.primary 
                  : theme.colors.textMuted
              }
              style={styles.statusIcon}
            />
          )}
        </View>
      </Animated.View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name="chatbubbles-outline" 
        size={responsive.fontSize.xxxl} 
        color={theme.colors.textSecondary} 
      />
      <Text style={styles.emptyText}>
        Start a conversation with {contactName}
      </Text>
      <Text style={styles.emptySubtext}>
        Messages are end-to-end encrypted
      </Text>
    </View>
  );

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={responsive.isSmallPhone ? 60 : 80}
        >
          {/* Header */}
          <View style={styles.header}>
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
            
            <View style={styles.headerInfo}>
              <Text style={styles.contactName} numberOfLines={1}>
                {contactName}
              </Text>
              <Text style={styles.contactPhone} numberOfLines={1}>
                {contactPhone}
              </Text>
            </View>
            
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name="call" 
                  size={responsive.fontSize.lg} 
                  color={theme.colors.primary} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name="ellipsis-vertical" 
                  size={responsive.fontSize.lg} 
                  color={theme.colors.text} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={[
              styles.messagesContent,
              messages.length === 0 && styles.emptyContent,
            ]}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
            keyboardShouldPersistTaps="handled"
          />

          {/* Input Area */}
          <Animated.View style={[styles.inputContainer, { transform: [{ scale: inputScale }] }]}>
            <View style={styles.inputWrapper}>
              <TextInput
                ref={textInputRef}
                style={styles.textInput}
                placeholder="Type a message..."
                placeholderTextColor={theme.colors.textMuted}
                value={newMessage}
                onChangeText={handleInputChange}
                multiline
                maxLength={1000}
                returnKeyType="default"
                blurOnSubmit={false}
                textAlignVertical="center"
              />
              
              <TouchableOpacity
                style={styles.attachButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="add"
                  size={responsive.fontSize.lg}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
              
              <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!newMessage.trim() || isLoading) && styles.sendButtonDisabled,
                  ]}
                  onPress={sendMessage}
                  disabled={!newMessage.trim() || isLoading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={isLoading ? 'hourglass-outline' : 'send'}
                    size={responsive.fontSize.md}
                    color={
                      !newMessage.trim() || isLoading
                        ? theme.colors.textMuted
                        : theme.colors.background
                    }
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Animated.View>
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
    elevation: 2,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  backButton: {
    padding: responsive.spacing.xs,
    marginRight: responsive.spacing.sm,
    minWidth: responsive.layout.minTouchTarget,
    minHeight: responsive.layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: responsive.spacing.md,
  },
  
  headerInfo: {
    flex: 1,
    marginRight: responsive.spacing.sm,
    justifyContent: 'center',
  },
  
  contactName: {
    fontSize: responsive.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: responsive.fontSize.lg * 1.2,
  },
  
  contactPhone: {
    fontSize: responsive.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: responsive.fontSize.sm * 1.2,
  },
  
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  actionButton: {
    padding: responsive.spacing.xs,
    marginLeft: responsive.spacing.xs,
    minWidth: responsive.layout.minTouchTarget,
    minHeight: responsive.layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: responsive.spacing.md,
  },
  
  messagesList: {
    flex: 1,
  },
  
  messagesContent: {
    paddingHorizontal: responsive.spacing.md,
    paddingVertical: responsive.spacing.sm,
  },
  
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: responsive.spacing.xxxl,
    paddingHorizontal: responsive.spacing.lg,
  },
  
  emptyText: {
    fontSize: responsive.fontSize.lg,
    fontWeight: '500',
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: responsive.spacing.md,
    marginBottom: responsive.spacing.xs,
  },
  
  emptySubtext: {
    fontSize: responsive.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  
  messageWrapper: {
    marginVertical: responsive.spacing.xs,
    maxWidth: responsive.wp(80),
  },
  
  sentWrapper: {
    alignSelf: 'flex-end',
  },
  
  receivedWrapper: {
    alignSelf: 'flex-start',
  },
  
  messageBubble: {
    paddingHorizontal: responsive.spacing.md,
    paddingVertical: responsive.spacing.sm,
    borderRadius: responsive.spacing.lg,
    minHeight: responsive.layout.minTouchTarget - 8,
    justifyContent: 'center',
    elevation: 1,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  
  sentBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: responsive.spacing.xs,
  },
  
  receivedBubble: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderBottomLeftRadius: responsive.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  
  messageText: {
    fontSize: responsive.fontSize.md,
    lineHeight: responsive.fontSize.md * 1.4,
  },
  
  sentText: {
    color: theme.colors.onPrimary,
  },
  
  receivedText: {
    color: theme.colors.text,
  },
  
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: responsive.spacing.xs,
  },
  
  timestamp: {
    fontSize: responsive.fontSize.xs,
    color: theme.colors.textMuted,
    marginRight: responsive.spacing.xs,
  },
  
  statusIcon: {
    marginLeft: 2,
  },
  
  inputContainer: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: responsive.spacing.md,
    paddingVertical: responsive.spacing.sm,
    paddingBottom: responsive.isSmallPhone ? responsive.spacing.sm : responsive.spacing.md,
  },
  
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.background,
    borderRadius: responsive.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: responsive.spacing.md,
    paddingVertical: responsive.spacing.sm,
    minHeight: responsive.layout.inputHeight,
    maxHeight: 120,
  },
  
  textInput: {
    flex: 1,
    fontSize: responsive.fontSize.md,
    color: theme.colors.text,
    lineHeight: responsive.fontSize.md * 1.4,
    textAlignVertical: 'center',
    paddingVertical: 0,
  },
  
  attachButton: {
    marginLeft: responsive.spacing.sm,
    marginRight: responsive.spacing.xs,
    padding: responsive.spacing.xs,
    minWidth: responsive.layout.minTouchTarget,
    minHeight: responsive.layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  sendButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: responsive.spacing.lg,
    padding: responsive.spacing.sm,
    minWidth: responsive.layout.minTouchTarget,
    minHeight: responsive.layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
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
});
