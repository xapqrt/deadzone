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
  Alert,
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
import { ContactSelectorEnhanced } from '../components/ContactSelectorEnhanced';
import { MessageLoading } from '../components/MessageLoading';
import { MessageSuccess } from '../components/MessageSuccess';
import { supabase } from '../services/supabase';
import { Message, User } from '../types';  
import { theme } from '../utils/theme';
import { formatDateTime } from '../utils/helpers';

const delayOptions = [
  { label: 'Send Immediately', value: 0 },
  { label: 'Send in 10 minutes', value: 10 },
  { label: 'Send in 30 minutes', value: 30 },
  { label: 'Send in 1 hour', value: 60 },
  { label: 'Send in 2 hours', value: 120 },
  { label: 'Custom Time', value: -1 },
];

export interface ComposeScreenEnhancedProps {
  user: User;
  editMessage?: Message;
  onBack: () => void;
  onSave: () => void;
}

export const ComposeScreenEnhanced: React.FC<ComposeScreenEnhancedProps> = ({
  user,
  editMessage,
  onBack,
  onSave,
}) => {
  // State management
  const [currentStep, setCurrentStep] = useState<'selectContact' | 'compose' | 'schedule'>('selectContact');
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  const [messageText, setMessageText] = useState(editMessage?.text || '');
  const [selectedDelay, setSelectedDelay] = useState(0); // Default immediately
  const [customDate, setCustomDate] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMessageLoading, setShowMessageLoading] = useState(false);
  const [showMessageSuccess, setShowMessageSuccess] = useState(false);

  // Animation values
  const saveButtonScale = useSharedValue(1);
  const inputFocusScale = useSharedValue(1);
  const stepTransition = useSharedValue(0);

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

  const handleContactSelect = (contact: User) => {
    setSelectedContact(contact);
    setCurrentStep('compose');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleNextToSchedule = () => {
    if (!messageText.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Empty Message',
        text2: 'Please enter a message to send',
      });
      return;
    }
    setCurrentStep('schedule');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSendMessage = async () => {
    if (!selectedContact || !messageText.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please select a contact and enter a message',
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
        deliverAfter = new Date(); // Immediately
      } else {
        deliverAfter = new Date(Date.now() + selectedDelay * 60 * 1000);
      }

      // Only check future time for non-immediate messages
      if (selectedDelay !== 0 && deliverAfter <= new Date()) {
        setShowMessageLoading(false);
        Toast.show({
          type: 'error',
          text1: 'Invalid Time',
          text2: 'Delivery time must be in the future',
        });
        return;
      }

      // Save message using the send_message SQL function
      const { data: sendResult, error: sendError } = await supabase
        .rpc('send_message', {
          p_sender_id: user.id,
          p_recipient_id: selectedContact.id,
          p_content: messageText.trim(),
          p_scheduled_for: deliverAfter.toISOString(),
          p_message_type: 'direct'
        });

      if (sendError) {
        console.error('Failed to save message:', sendError);
        setShowMessageLoading(false);
        Toast.show({
          type: 'error',
          text1: 'Send Failed',
          text2: 'Failed to send message. Please try again.',
        });
        return;
      }

      const result = sendResult?.[0];
      if (!result || !result.success) {
        setShowMessageLoading(false);
        Toast.show({
          type: 'error',
          text1: 'Send Failed',
          text2: result?.message || 'Failed to send message. Please try again.',
        });
        return;
      }

      // Simulate some processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Animate send button
      saveButtonScale.value = withSpring(0.8, { duration: 200 }, () => {
        saveButtonScale.value = withSpring(1);
      });

      // Hide loading and show success
      setShowMessageLoading(false);
      setShowMessageSuccess(true);

      // Auto-hide success and navigate back
      setTimeout(() => {
        setShowMessageSuccess(false);
        onSave();
      }, 2000);

    } catch (error) {
      console.error('Failed to send message:', error);
      setLoading(false);
      setShowMessageLoading(false);
      Toast.show({
        type: 'error',
        text1: 'Send Failed',
        text2: 'An unexpected error occurred',
      });
    }
  };

  const saveButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveButtonScale.value }],
  }));

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputFocusScale.value }],
  }));

  const renderDelayOption = (option: typeof delayOptions[0]) => (
    <TouchableOpacity
      key={option.value}
      style={[
        styles.delayOption,
        selectedDelay === option.value && styles.selectedDelayOption,
      ]}
      onPress={() => {
        setSelectedDelay(option.value);
        if (option.value !== -1) {
          setShowDatePicker(false);
          setShowTimePicker(false);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
    >
      <View style={styles.delayOptionContent}>
        <Text style={[
          styles.delayOptionText,
          selectedDelay === option.value && styles.selectedDelayOptionText,
        ]}>
          {option.label}
        </Text>
        {option.value === -1 && selectedDelay === -1 && (
          <Text style={styles.customTimeText}>
            {formatDateTime(customDate)}
          </Text>
        )}
        {option.value > 0 && selectedDelay === option.value && (
          <Text style={styles.timePreviewText}>
            {formatDateTime(new Date(Date.now() + option.value * 60 * 1000))}
          </Text>
        )}
      </View>
      <View style={[
        styles.radioButton,
        selectedDelay === option.value && styles.selectedRadioButton,
      ]}>
        {selectedDelay === option.value && (
          <View style={styles.radioButtonInner} />
        )}
      </View>
    </TouchableOpacity>
  );

  if (showMessageLoading) {
    return <MessageLoading />;
  }

  if (showMessageSuccess) {
    return <MessageSuccess 
      message={messageText}
      recipientName={selectedContact?.name || 'Contact'} 
      isScheduled={selectedDelay !== 0}
      scheduledTime={selectedDelay === -1 ? customDate : 
        selectedDelay > 0 ? new Date(Date.now() + selectedDelay * 60 * 1000) : undefined}
      onComplete={() => {
        setShowMessageSuccess(false);
        onBack();
      }}
    />;
  }

  // Step 1: Contact Selection
  if (currentStep === 'selectContact') {
    return (
      <ContactSelectorEnhanced
        currentUser={user}
        onSelectContact={handleContactSelect}
        onBack={onBack}
      />
    );
  }

  // Step 2: Message Composition and Scheduling
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareWrapper>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => setCurrentStep('selectContact')} 
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color={theme.colors.onBackground} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              {currentStep === 'compose' ? 'Compose Message' : 'Schedule Message'}
            </Text>
            {selectedContact && (
              <Text style={styles.headerSubtitle}>
                To: {selectedContact.name} (@{selectedContact.username})
              </Text>
            )}
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Step indicator */}
          <View style={styles.stepIndicator}>
            <View style={[styles.step, styles.completedStep]}>
              <Feather name="check" size={16} color={theme.colors.onPrimary} />
            </View>
            <View style={[styles.stepLine, styles.completedStepLine]} />
            <View style={[styles.step, currentStep === 'schedule' ? styles.activeStep : styles.completedStep]}>
              <Text style={[styles.stepNumber, currentStep === 'schedule' && styles.activeStepNumber]}>
                {currentStep === 'schedule' ? '2' : <Feather name="check" size={16} color={theme.colors.onPrimary} />}
              </Text>
            </View>
            <View style={[styles.stepLine, currentStep === 'schedule' && styles.activeStepLine]} />
            <View style={[styles.step, currentStep === 'schedule' ? styles.activeStep : styles.inactiveStep]}>
              <Text style={[styles.stepNumber, currentStep === 'schedule' && styles.activeStepNumber]}>3</Text>
            </View>
          </View>

          {/* Message Input */}
          <Animated.View style={[styles.section, inputAnimatedStyle]} entering={FadeIn.delay(200)}>
            <Text style={styles.sectionTitle}>Your Message</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Type your message here..."
              placeholderTextColor={theme.colors.textSecondary}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              onFocus={() => {
                inputFocusScale.value = withSpring(1.02);
              }}
              onBlur={() => {
                inputFocusScale.value = withSpring(1);
              }}
            />
            <Text style={styles.characterCount}>
              {messageText.length}/500
            </Text>
          </Animated.View>

          {/* Time Scheduling */}
          <Animated.View style={styles.section} entering={FadeIn.delay(400)}>
            <Text style={styles.sectionTitle}>When to Send</Text>
            <View style={styles.delayOptions}>
              {delayOptions.map(renderDelayOption)}
            </View>

            {/* Custom Time Picker */}
            {selectedDelay === -1 && (
              <Animated.View style={styles.customTimeSection} entering={SlideInDown}>
                <Text style={styles.customTimeTitle}>Select Custom Time</Text>
                
                <View style={styles.timePickerButtons}>
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Feather name="calendar" size={20} color={theme.colors.primary} />
                    <Text style={styles.timePickerButtonText}>
                      {customDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Feather name="clock" size={20} color={theme.colors.primary} />
                    <Text style={styles.timePickerButtonText}>
                      {customDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </Animated.View>

          {/* Preview */}
          <Animated.View style={styles.previewSection} entering={FadeIn.delay(600)}>
            <Text style={styles.previewTitle}>Message Preview</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={styles.previewAvatar}>
                  <Text style={styles.previewAvatarText}>
                    {selectedContact?.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.previewInfo}>
                  <Text style={styles.previewName}>{selectedContact?.name}</Text>
                  <Text style={styles.previewUsername}>@{selectedContact?.username}</Text>
                </View>
                <View style={styles.previewTime}>
                  <Text style={styles.previewTimeText}>
                    {selectedDelay === 0 ? 'Now' : 
                     selectedDelay === -1 ? formatDateTime(customDate).split(' ')[1] :
                     `${selectedDelay}m`}
                  </Text>
                </View>
              </View>
              <Text style={styles.previewMessage}>
                {messageText || 'Your message will appear here...'}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {currentStep === 'compose' && (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNextToSchedule}
              disabled={!messageText.trim()}
            >
              <Text style={styles.nextButtonText}>Next: Schedule</Text>
              <Feather name="arrow-right" size={20} color={theme.colors.onPrimary} />
            </TouchableOpacity>
          )}

          {currentStep === 'schedule' && (
            <Animated.View style={saveButtonAnimatedStyle}>
              <TouchableOpacity
                style={[styles.sendButton, loading && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={loading || !messageText.trim()}
              >
                <Feather 
                  name={selectedDelay === 0 ? "send" : "clock"} 
                  size={20} 
                  color={theme.colors.onPrimary} 
                />
                <Text style={styles.sendButtonText}>
                  {selectedDelay === 0 ? 'Send Now' : 'Schedule Message'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        {/* Date/Time Pickers */}
        {showDatePicker && (
          <DateTimePicker
            value={customDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setCustomDate(selectedDate);
              }
            }}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={customDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowTimePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setCustomDate(selectedDate);
              }
            }}
          />
        )}
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
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },

  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },

  headerContent: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },

  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },

  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },

  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    justifyContent: 'center',
  },

  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },

  completedStep: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },

  activeStep: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },

  inactiveStep: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },

  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },

  activeStepNumber: {
    color: theme.colors.onPrimary,
  },

  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.xs,
  },

  completedStepLine: {
    backgroundColor: theme.colors.primary,
  },

  activeStepLine: {
    backgroundColor: theme.colors.primary,
  },

  section: {
    marginBottom: theme.spacing.lg,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },

  messageInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.onSurface,
    backgroundColor: theme.colors.surface,
    minHeight: 120,
    textAlignVertical: 'top',
  },

  characterCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },

  delayOptions: {
    gap: theme.spacing.sm,
  },

  delayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  selectedDelayOption: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.card,
  },

  delayOptionContent: {
    flex: 1,
  },

  delayOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },

  selectedDelayOptionText: {
    color: theme.colors.primary,
  },

  customTimeText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  timePreviewText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginTop: 2,
  },

  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  selectedRadioButton: {
    borderColor: theme.colors.primary,
  },

  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },

  customTimeSection: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 12,
  },

  customTimeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.md,
  },

  timePickerButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },

  timePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },

  timePickerButtonText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },

  previewSection: {
    marginBottom: theme.spacing.xl,
  },

  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },

  previewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },

  previewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },

  previewAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },

  previewInfo: {
    flex: 1,
  },

  previewName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },

  previewUsername: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },

  previewTime: {
    alignItems: 'flex-end',
  },

  previewTimeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },

  previewMessage: {
    fontSize: 16,
    color: theme.colors.onSurface,
    lineHeight: 22,
  },

  actionButtons: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 12,
    gap: theme.spacing.sm,
  },

  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },

  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 12,
    gap: theme.spacing.sm,
  },

  sendButtonDisabled: {
    backgroundColor: theme.colors.surfaceVariant,
  },

  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
});
