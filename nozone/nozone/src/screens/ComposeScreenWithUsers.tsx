import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  SlideInDown,
  FadeInDown,
  FadeOutUp,
} from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareWrapper } from '../components/KeyboardAwareWrapper';
import Toast from 'react-native-toast-message';
import { useLocalMessages } from '../hooks/useLocalMessages';
import { SupabaseService } from '../services/supabase';
import { StorageService } from '../services/storage';
import { Message, User } from '../types';  
import { theme } from '../utils/theme';
import { formatDateTime } from '../utils/helpers';
import { MessageLoading } from '../components/MessageLoading';
import { MessageSuccess } from '../components/MessageSuccess';
import UserSearchSection, { UserSearchResult as ExtractedUserSearchResult } from '../components/UserSearchSection';

const delayOptions = [
  { label: 'Immediately', value: 0 },
  { label: '10 minutes', value: 10 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '3 hours', value: 180 },
  { label: 'Custom', value: -1 },
];

export interface ComposeScreenWithUsersProps {
  user: User;
  editMessage?: Message;
  onBack: () => void;
  onSave: () => void;
  onStartDirectChat?: (otherUser: User) => void;
}

interface UserSearchResult extends ExtractedUserSearchResult {}

export const ComposeScreenWithUsers: React.FC<ComposeScreenWithUsersProps> = ({
  user,
  editMessage,
  onBack,
  onSave,
  onStartDirectChat,
}) => {
  const { actions } = useLocalMessages(user.id);
  
  // Message composition state
  const [messageText, setMessageText] = useState(editMessage?.text || '');
  const [selectedDelay, setSelectedDelay] = useState(0);
  const [customDate, setCustomDate] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMessageLoading, setShowMessageLoading] = useState(false);
  const [showMessageSuccess, setShowMessageSuccess] = useState(false);

  // User selection state
  const [recipientUsername, setRecipientUsername] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<UserSearchResult[]>([]);

  // Animation values
  const saveButtonScale = useSharedValue(1);
  const inputFocusScale = useSharedValue(1);
  // Removed dropdownHeight (handled inside extracted component)

  // Success message state
  const [successMessage, setSuccessMessage] = useState('Message sent successfully! 🚀');

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const draftSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const contentHeightRef = useRef(0);
  const containerHeightRef = useRef(0);

  // Draft key (username preferred)
  const getDraftKey = useCallback(() => {
    if (recipientUsername.trim()) return recipientUsername.trim().toLowerCase();
    if (selectedUser?.username) return selectedUser.username.toLowerCase();
    return '';
  }, [recipientUsername, selectedUser]);

  // Load draft when recipient context changes
  useEffect(() => {
    const key = getDraftKey();
    if (!key) return;
    let cancelled = false;
    (async () => {
      try {
        const draft = await StorageService.getDraft(key);
        if (draft && !cancelled) {
          if (!messageText.trim()) setMessageText(draft.text);
          if (typeof draft.selectedDelay === 'number') {
            setSelectedDelay(draft.selectedDelay);
            if (draft.selectedDelay === -1 && draft.customDate) {
              const d = new Date(draft.customDate);
              if (!isNaN(d.getTime())) setCustomDate(d);
            }
          }
        }
      } catch (e) {
        console.log('Failed to load draft', e);
      }
    })();
    return () => { cancelled = true; };
  }, [getDraftKey]);

  // Debounced draft save
  useEffect(() => {
    const key = getDraftKey();
    if (!key) return;
    if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
    draftSaveTimeoutRef.current = setTimeout(() => {
      if (!messageText.trim()) return; // skip empty
      StorageService.saveDraft(key, {
        text: messageText,
        selectedDelay,
        customDate: selectedDelay === -1 ? customDate.toISOString() : undefined,
      });
    }, 500);
  }, [messageText, selectedDelay, customDate, getDraftKey]);

  useEffect(() => {
    loadAllUsers();
    
    if (editMessage) {
      const diffInMinutes = Math.floor((editMessage.deliverAfter.getTime() - Date.now()) / (1000 * 60));
      const matchingOption = delayOptions.find(option => option.value === diffInMinutes);
      if (matchingOption) {
        setSelectedDelay(matchingOption.value);
      } else {
        setSelectedDelay(-1);
        setCustomDate(editMessage.deliverAfter);
      }
    }
  }, [editMessage]);

  const loadAllUsers = async () => {
    try {
      console.log('👥 Loading all users...');
      const users = await SupabaseService.getActiveUsers(user.id, '', 100);
      console.log('✅ Loaded users:', users.length);
      
      const userResults: UserSearchResult[] = users.map(u => ({
        id: u.id,
        username: u.username || '',
        name: u.name,
        lastActive: u.lastActive,
        isOnline: u.isOnline,
      }));
      setAllUsers(userResults);
      
      if (userResults.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'No Users Found',
          text2: 'Create more users to send messages',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      console.error('❌ Failed to load users:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load users',
        text2: 'Please try again later',
      });
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
  // no-op: component controls its own dropdown visibility
      return;
    }

    setSearchLoading(true);
    
    try {
      // Filter from all users for better performance
      const filtered = allUsers.filter(u => 
        u.username.toLowerCase().includes(query.toLowerCase()) ||
        u.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10); // Limit to 10 results
      
      setSearchResults(filtered);
  // dropdown animation handled by child component
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleUsernameChange = (text: string) => {
    setRecipientUsername(text);
    setSelectedUser(null);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(text);
    }, 300);
  };

  const selectUser = (selectedUser: UserSearchResult) => {
    console.log('📋 User selected:', selectedUser);
    setSelectedUser(selectedUser);
    setRecipientUsername(selectedUser.username);
  // handled by child component
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    
    Toast.show({
      type: 'success',
      text1: 'User Selected',
      text2: `Ready to send to ${selectedUser.name}`,
      visibilityTime: 2000,
    });
  };

  const startDirectChat = () => {
    if (selectedUser && onStartDirectChat) {
      const userObj: User = {
        id: selectedUser.id,
        username: selectedUser.username,
        name: selectedUser.name,
        lastActive: selectedUser.lastActive,
        createdAt: new Date(),
      };
      onStartDirectChat(userObj);
    }
  };

  const handleSave = async () => {
    if (!messageText.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Empty Message',
        text2: 'Please enter a message to send',
      });
      return;
    }

    if (!selectedUser) {
      Toast.show({
        type: 'error',
        text1: 'No Recipient',
        text2: 'Please select a user to send the message to',
      });
      return;
    }

    try {
      setLoading(true);
      setShowMessageLoading(true);
      
      let deliverAfter: Date;
      if (selectedDelay === -1) {
        deliverAfter = customDate;
      } else if (selectedDelay === 0) {
        deliverAfter = new Date();
      } else {
        deliverAfter = new Date(Date.now() + selectedDelay * 60 * 1000);
      }

      if (selectedDelay !== 0 && deliverAfter <= new Date()) {
        setShowMessageLoading(false);
        Toast.show({
          type: 'error',
          text1: 'Invalid Time',
          text2: 'Delivery time must be in the future',
        });
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1500));

      // For direct messaging, use the send_direct_message function
      let attempt = 0;
      let lastError: any = null;
      let result: any = null;
      const maxAttempts = 3; // basic retry (task 5)
      while (attempt < maxAttempts) {
        try {
          result = await SupabaseService.sendDirectMessage(
            user.id,
            selectedUser.username,
            messageText.trim(),
            deliverAfter
          );
          if (result?.success) break;
          lastError = result?.message || 'Unknown send error';
        } catch (err) {
          lastError = err;
        }
        attempt++;
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 500 * attempt)); // simple backoff
        }
      }

      if (!result?.success) {
        throw new Error(lastError instanceof Error ? lastError.message : String(lastError));
      }

      console.log('✅ Message scheduled successfully:', {
        messageId: result.messageId,
        conversationId: result.conversationId,
        deliverAfter: deliverAfter.toISOString(),
        isScheduled: deliverAfter > new Date()
      });

      // Bridge direct message into local stats storage so Home counters update
      try {
        const bridgedStatus = deliverAfter > new Date() ? 'pending' : 'sent';
        await actions.addMessage({
          senderId: user.id,
          recipientName: selectedUser.name || selectedUser.username || 'Direct User',
          text: messageText.trim(),
          deliverAfter,
          status: bridgedStatus as any,
          metadata: { source: 'direct', dmId: result.messageId },
        } as any);
      } catch (e) {
        console.log('⚠️ Failed to bridge direct message into local stats (non-fatal):', e);
      }

      saveButtonScale.value = withSpring(0.8, { duration: 200 }, () => {
        saveButtonScale.value = withSpring(1);
      });

      setShowMessageLoading(false);
      
      // Update success message based on scheduling
      const isScheduled = deliverAfter > new Date();
      const newSuccessMessage = isScheduled 
        ? `Message scheduled for ${formatDateTime(deliverAfter)}! 📅`
        : 'Message sent successfully! 🚀';
      
      setSuccessMessage(newSuccessMessage);
      setShowMessageSuccess(true);

      // Clear draft & reset compose state (keep recipient)
      const draftKey = getDraftKey();
      if (draftKey) StorageService.clearDraft(draftKey);
      setMessageText('');
      if (selectedDelay !== 0) setSelectedDelay(0);

      setTimeout(() => {
        setShowMessageSuccess(false);
        onSave();
      }, 2000);

    } catch (error) {
      console.error('Error sending message:', error);
      setShowMessageLoading(false);
      Toast.show({
        type: 'error', 
        text1: 'Send Failed',
        text2: 'Could not send message. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setCustomDate(prev => {
        const newDate = new Date(prev);
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
        return newDate;
      });
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      setCustomDate(prev => {
        const newDate = new Date(prev);
        newDate.setHours(selectedTime.getHours());
        newDate.setMinutes(selectedTime.getMinutes());
        return newDate;
      });
    }
  };

  const saveButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveButtonScale.value }],
  }));

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputFocusScale.value }],
  }));

  // Removed inline user item renderer (handled by UserSearchSection)

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#F0FDF4', '#FFFFFF']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
      <KeyboardAwareWrapper offset={20} animationType="spring">
        {/* Header */}
    <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
      <Feather name="arrow-left" size={24} color={'#065F46'} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editMessage ? 'Edit Message' : 'Send Message'}
          </Text>
          <View style={styles.placeholder} />
        </Animated.View>

        <ScrollView
          ref={ref => { scrollViewRef.current = ref; }}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
          onContentSizeChange={(w,h)=>{contentHeightRef.current = h;}}
          onLayout={e => { containerHeightRef.current = e.nativeEvent.layout.height; }}
        >
          {/* Recipient Selection (extracted component) */}
          <Animated.View entering={SlideInDown.delay(150)} style={styles.section}>
            <UserSearchSection
              recipientUsername={recipientUsername}
              onRecipientUsernameChange={handleUsernameChange}
              searchResults={searchResults}
              loading={searchLoading}
              selectedUser={selectedUser}
              onSelectUser={selectUser}
              onClearSelected={() => { setSelectedUser(null); setRecipientUsername(''); }}
              onStartDirectChat={startDirectChat}
            />
          </Animated.View>

          {/* Message Input */}
          <Animated.View entering={SlideInDown.delay(200)} style={styles.section}>
      <Text style={styles.sectionTitle}>Message</Text>
            <Animated.View style={[styles.inputContainer, inputAnimatedStyle]}>
              <TextInput
                style={styles.messageInput}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Enter your message here..."
        placeholderTextColor={'#64748B'}
                multiline
                textAlignVertical="top"
                onFocus={() => {
                  inputFocusScale.value = withTiming(1.02, { duration: 200 });
                  setTimeout(() => {
                    if (scrollViewRef.current && contentHeightRef.current > containerHeightRef.current) {
                      scrollViewRef.current.scrollToEnd({ animated: true });
                    }
                  }, 60);
                }}
                onBlur={() => {
                  inputFocusScale.value = withTiming(1, { duration: 200 });
                }}
              />
              <Text style={styles.characterCount}>{messageText.length}/1000</Text>
            </Animated.View>
          </Animated.View>

          {/* Delay Options */}
          <Animated.View entering={SlideInDown.delay(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Time</Text>
            <View style={styles.delayOptions}>
              {delayOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.delayOption,
                    selectedDelay === option.value && styles.delayOptionSelected,
                  ]}
                  onPress={() => setSelectedDelay(option.value)}
                >
                  <Text
                    style={[
                      styles.delayOptionText,
                      selectedDelay === option.value && styles.delayOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Custom Date/Time */}
          {selectedDelay === -1 && (
            <Animated.View entering={SlideInDown.delay(400)} style={styles.section}>
              <Text style={styles.sectionTitle}>Custom Date & Time</Text>
              
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Feather name="calendar" size={20} color={'#16A34A'} />
                <Text style={styles.dateTimeText}>
                  {customDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Feather name="clock" size={20} color={'#16A34A'} />
                <Text style={styles.dateTimeText}>
                  {customDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>

              <View style={styles.deliveryPreview}>
                <Text style={styles.deliveryPreviewText}>
                  Will be delivered: {formatDateTime(customDate)}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Delivery Preview for preset delays */}
          {selectedDelay !== -1 && (
            <Animated.View entering={SlideInDown.delay(400)} style={styles.section}>
              <View style={styles.deliveryPreview}>
                <Text style={styles.deliveryPreviewText}>
                  Will be delivered: {formatDateTime(new Date(Date.now() + selectedDelay * 60 * 1000))}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Send Button */}
          <Animated.View entering={SlideInDown.delay(500)} style={styles.saveSection}>
            <Animated.View style={saveButtonAnimatedStyle}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { 
                    opacity: loading || !selectedUser || !messageText.trim() ? 0.7 : 1,
                    backgroundColor: (!selectedUser || !messageText.trim()) ? theme.colors.textMuted : theme.colors.primary
                  },
                ]}
                onPress={handleSave}
                disabled={loading || !selectedUser || !messageText.trim()}
                accessibilityRole="button"
                accessibilityLabel={loading ? 'Sending message' : 'Send message'}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Feather name="send" size={20} color={'white'} />
                )}
                <Text style={styles.saveButtonText}>
                  {loading ? 'Sending...' : 
                   !selectedUser ? 'Select a user to send' :
                   !messageText.trim() ? 'Enter a message' :
                   'Send Message'}
                </Text>
              </TouchableOpacity>
              {/* Scheduled badge preview */}
              {selectedUser && selectedDelay !== 0 && (
                <View style={styles.scheduledBadge}>
                  <Feather name="clock" size={14} color={'#065F46'} />
                  <Text style={styles.scheduledBadgeText}>
                    {selectedDelay === -1 ? formatDateTime(customDate) : formatDateTime(new Date(Date.now() + selectedDelay * 60 * 1000))}
                  </Text>
                </View>
              )}
            </Animated.View>
          </Animated.View>
        </ScrollView>

        {/* Date/Time Pickers */}
        {showDatePicker && (
          <DateTimePicker
            value={customDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={customDate}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}

        <Toast />

        {/* Premium Loading Component */}
        {showMessageLoading && (
          <MessageLoading 
            message="Sending your message into the no-zone..."
          />
        )}

        {/* Premium Success Component */}
        {showMessageSuccess && (
          <MessageSuccess 
            message={successMessage}
            recipientName={selectedUser?.name || 'User'}
            onComplete={() => setShowMessageSuccess(false)}
          />
        )}
      </KeyboardAwareWrapper>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width:0, height:2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSizes.xl,
    fontFamily: theme.fonts.bold,
    color: '#065F46',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  contentContainer: {
    paddingBottom: theme.spacing.xxl * 2,
  },
  section: {
    marginVertical: theme.spacing.lg,
  },
  sectionTitle: { fontSize: theme.fontSizes.lg, fontFamily: theme.fonts.bold, color: '#065F46', marginBottom: theme.spacing.md },
  // User search styles moved to UserSearchSection component
  inputContainer: { backgroundColor: '#FFFFFF', borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: {width:0,height:2}, shadowOpacity:1, shadowRadius:4 },
  messageInput: { fontSize: theme.fontSizes.md, fontFamily: theme.fonts.regular, color: '#065F46', padding: theme.spacing.md, minHeight: 120, maxHeight: 200 },
  characterCount: { fontSize: theme.fontSizes.sm, fontFamily: theme.fonts.regular, color: '#64748B', textAlign: 'right', paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm },
  delayOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  delayOption: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.round, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  delayOptionSelected: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  delayOptionText: { fontSize: theme.fontSizes.sm, fontFamily: theme.fonts.medium, color: '#065F46' },
  delayOptionTextSelected: { color: 'white' },
  dateTimeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.sm, borderWidth:1, borderColor:'#E2E8F0', shadowColor:'rgba(0,0,0,0.05)', shadowOffset:{width:0,height:2}, shadowOpacity:1, shadowRadius:4 },
  dateTimeText: { fontSize: theme.fontSizes.md, fontFamily: theme.fonts.medium, color: '#065F46', marginLeft: theme.spacing.sm },
  deliveryPreview: { backgroundColor: '#DCFCE7', padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, borderLeftWidth: 4, borderLeftColor: '#16A34A' },
  deliveryPreviewText: { fontSize: theme.fontSizes.sm, fontFamily: theme.fonts.medium, color: '#16A34A' },
  saveSection: {
    paddingVertical: theme.spacing.xl,
  },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16A34A', paddingVertical: theme.spacing.lg, borderRadius: theme.borderRadius.lg, shadowColor:'rgba(0,0,0,0.08)', shadowOffset:{width:0,height:4}, shadowOpacity:1, shadowRadius:8 },
  saveButtonText: { fontSize: theme.fontSizes.lg, fontFamily: theme.fonts.medium, color: 'white', marginLeft: theme.spacing.sm },
  scheduledBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: theme.spacing.sm, backgroundColor: '#F1F5F9', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.round },
  scheduledBadgeText: { marginLeft: theme.spacing.xs, fontSize: theme.fontSizes.sm, fontFamily: theme.fonts.medium, color: '#065F46' },
});
