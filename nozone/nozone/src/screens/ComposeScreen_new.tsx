import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareWrapper } from '../components/KeyboardAwareWrapper';
import { useLocalMessages } from '../hooks/useLocalMessages';
import { useContactsEnhanced } from '../hooks/useContactsEnhanced';
import { ContactSelector } from '../components/ContactSelectorEnhanced';
import { Message, User } from '../types';  
import { theme } from '../utils/theme';
import { formatDateTime } from '../utils/helpers';

const delayOptions = [
  { label: 'Immediately', value: 0 },
  { label: '10 minutes', value: 10 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '3 hours', value: 180 },
  { label: 'Custom', value: -1 },
];

export interface ComposeScreenProps {
  user: User;
  editMessage?: Message;
  onBack: () => void;
  onSave: () => void;
}

export const ComposeScreen: React.FC<ComposeScreenProps> = ({
  user,
  editMessage,
  onBack,
  onSave,
}) => {
  const { actions } = useLocalMessages(user.id);
  const { contacts, addNewContact } = useContactsEnhanced(user.id);
  const [showContactSelector, setShowContactSelector] = useState(!editMessage?.recipientName);
  const [messageText, setMessageText] = useState(editMessage?.text || '');
  const [recipientName, setRecipientName] = useState(editMessage?.recipientName || '');
  const [selectedDelay, setSelectedDelay] = useState(0); // Default immediately
  const [customDate, setCustomDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Default 1 day
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const saveButtonScale = useSharedValue(1);
  const inputFocusScale = useSharedValue(1);

  useEffect(() => {
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

  const handleSave = async () => {
    if (!messageText.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Empty Message',
        text2: 'Please enter a message to send',
      });
      return;
    }

    try {
      setLoading(true);
      
      let deliverAfter: Date;
      if (selectedDelay === -1) {
        deliverAfter = customDate;
      } else if (selectedDelay === 0) {
        deliverAfter = new Date(); // Immediately
      } else {
        deliverAfter = new Date(Date.now() + selectedDelay * 60 * 1000);
      }

      // Only check future time for non-immediate messages
      if (selectedDelay !== 0 && deliverAfter <= new Date()) {
        Toast.show({
          type: 'error',
          text1: 'Invalid Time',
          text2: 'Delivery time must be in the future',
        });
        return;
      }

      if (editMessage) {
        await actions.updateMessage(editMessage.id, {
          text: messageText.trim(),
          recipientName: recipientName.trim(),
          deliverAfter,
        });
        
        Toast.show({
          type: 'success',
          text1: 'Message Updated',
          text2: 'Your message has been updated',
        });
      } else {
        await actions.addMessage({
          senderId: user.id,
          text: messageText.trim(),
          recipientName: recipientName.trim(),
          deliverAfter,
          status: 'pending',
        });

        // Animate airplane icon
        saveButtonScale.value = withSpring(0.8, { duration: 200 }, () => {
          saveButtonScale.value = withSpring(1);
        });

        const isImmediate = selectedDelay === 0;
        Toast.show({
          type: 'success',
          text1: isImmediate ? '🚀 Message Queued' : '✈️ Message Scheduled',
          text2: isImmediate ? 'Message queued for immediate delivery' : 'Message scheduled for delivery',
        });
      }

      onSave();
    } catch (error) {
      console.error('Error saving message:', error);
      Toast.show({
        type: 'error', 
        text1: 'Save Failed',
        text2: 'Could not save message. Please try again.',
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

  const handleSelectContact = (contactName: string) => {
    setRecipientName(contactName);
    setShowContactSelector(false);
  };

  const handleAddNewContact = (contactName: string) => {
    addNewContact(contactName);
    setRecipientName(contactName);
    setShowContactSelector(false);
  };

  const handleChangeRecipient = () => {
    setShowContactSelector(true);
  };

  // Show contact selector if no recipient is selected
  if (showContactSelector) {
    return (
      <SafeAreaView style={styles.container}>
        <ContactSelector
          contacts={contacts}
          onSelectContact={handleSelectContact}
          onAddNewContact={handleAddNewContact}
          onBack={onBack}
          currentUserId={user.id}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareWrapper offset={20} animationType="spring">
        {/* Header */}
        <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Feather name="arrow-left" size={24} color={theme.colors.onBackground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editMessage ? 'Edit Message' : 'Compose Message'}
          </Text>
          <View style={styles.placeholder} />
        </Animated.View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Recipient Selection */}
        <Animated.View entering={SlideInDown.delay(100)} style={styles.section}>
          <Text style={styles.sectionTitle}>Send To</Text>
          <TouchableOpacity 
            style={styles.recipientSelector}
            onPress={handleChangeRecipient}
          >
            <View style={styles.recipientInfo}>
              <View style={styles.recipientAvatar}>
                <Text style={styles.recipientInitial}>
                  {recipientName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.recipientDetails}>
                <Text style={styles.recipientName}>{recipientName}</Text>
                <Text style={styles.recipientSubtitle}>Tap to change recipient</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
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
              placeholderTextColor={theme.colors.textMuted}
              multiline
              textAlignVertical="top"
              onFocus={() => {
                inputFocusScale.value = withTiming(1.02, { duration: 200 });
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
              <Feather name="calendar" size={20} color={theme.colors.primary} />
              <Text style={styles.dateTimeText}>
                {customDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Feather name="clock" size={20} color={theme.colors.primary} />
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
                {selectedDelay === 0 
                  ? "Will be delivered: Immediately" 
                  : `Will be delivered: ${formatDateTime(new Date(Date.now() + selectedDelay * 60 * 1000))}`
                }
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Save Button */}
        <Animated.View entering={SlideInDown.delay(500)} style={styles.saveSection}>
          <Animated.View style={saveButtonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { opacity: loading ? 0.7 : 1 },
              ]}
              onPress={handleSave}
              disabled={loading}
            >
              <Feather 
                name={editMessage ? "save" : "send"} 
                size={20} 
                color={theme.colors.onPrimary} 
              />
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : editMessage ? 'Update Message' : 'Save Message'}
              </Text>
            </TouchableOpacity>
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
      </KeyboardAwareWrapper>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSizes.xl,
    fontFamily: theme.fonts.bold,
    color: theme.colors.onBackground,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  section: {
    marginVertical: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.bold,
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.md,
  },
  inputContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  recipientInput: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.onSurface,
    padding: theme.spacing.md,
    minHeight: 50,
  },
  messageInput: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.onSurface,
    padding: theme.spacing.md,
    minHeight: 120,
    maxHeight: 200,
  },
  characterCount: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textMuted,
    textAlign: 'right',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  delayOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  delayOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  delayOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  delayOptionText: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
    color: theme.colors.onSurface,
  },
  delayOptionTextSelected: {
    color: theme.colors.onPrimary,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  dateTimeText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.onSurface,
    marginLeft: theme.spacing.sm,
  },
  deliveryPreview: {
    backgroundColor: theme.colors.primaryAlpha,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  deliveryPreviewText: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
  },
  saveSection: {
    paddingVertical: theme.spacing.xl,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  saveButtonText: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    color: theme.colors.onPrimary,
    marginLeft: theme.spacing.sm,
  },
  recipientSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recipientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recipientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  recipientInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  recipientDetails: {
    flex: 1,
  },
  recipientName: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  recipientSubtitle: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
});
