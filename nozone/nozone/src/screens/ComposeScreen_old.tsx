import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
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
import { useLocalMessages } from '../hooks/useLocalMessages';
import { Message, User } from '../types';
import { theme } from '../utils/theme';
import { formatDateTime } from '../utils/helpers';

const delayOptions = [
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
  const [messageText, setMessageText] = useState(editMessage?.text || '');
  const [phone, setPhone] = useState(editMessage?.phone || '');
  const [deliverAfter, setDeliverAfter] = useState(
    editMessage?.deliverAfter || new Date(Date.now() + 60 * 60 * 1000) // Default to 1 hour from now
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    message: '',
    phone: '',
  });

  useEffect(() => {
    // Clear errors when inputs change
    if (errors.message && messageText.trim()) {
      setErrors(prev => ({ ...prev, message: '' }));
    }
    if (errors.phone && phone.trim()) {
      setErrors(prev => ({ ...prev, phone: '' }));
    }
  }, [messageText, phone, errors]);

  const validateForm = (): boolean => {
    const newErrors = { message: '', phone: '' };
    let isValid = true;

    if (!messageText.trim()) {
      newErrors.message = 'Message text is required';
      isValid = false;
    } else if (messageText.trim().length > 1000) {
      newErrors.message = 'Message must be less than 1000 characters';
      isValid = false;
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
      isValid = false;
    } else if (!validatePhone(phone)) {
      newErrors.phone = 'Please enter a valid phone number';
      isValid = false;
    }

    if (deliverAfter <= new Date()) {
      Alert.alert('Invalid Date', 'Delivery date must be in the future');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = formatPhone(phone);
      
      if (editMessage) {
        // Update existing message
        await StorageService.updateMessage(editMessage.id, {
          text: messageText.trim(),
          phone: formattedPhone,
          deliverAfter,
        });
      } else {
        // Create new message
        const newMessage: Message = {
          id: generateId(),
          text: messageText.trim(),
          phone: formattedPhone,
          deliverAfter,
          status: 'pending',
          createdAt: new Date(),
        };

        await StorageService.addMessage(newMessage);
      }

      onSave();
    } catch (error) {
      console.error('Error saving message:', error);
      Alert.alert('Error', 'Failed to save message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(deliverAfter);
      newDate.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );
      setDeliverAfter(newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(deliverAfter);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setDeliverAfter(newDate);
    }
  };

  const getQuickDelayOptions = () => [
    { label: '1 hour', minutes: 60 },
    { label: '4 hours', minutes: 240 },
    { label: '1 day', minutes: 1440 },
    { label: '1 week', minutes: 10080 },
  ];

  const handleQuickDelay = (minutes: number) => {
    const newDate = new Date(Date.now() + minutes * 60 * 1000);
    setDeliverAfter(newDate);
  };

  const characterCount = messageText.length;
  const isOverLimit = characterCount > 1000;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
        
        <Text style={styles.title}>
          {editMessage ? 'Edit Message' : 'New Message'}
        </Text>
        
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <Input
          label="Message"
          placeholder="Type your message here..."
          value={messageText}
          onChangeText={setMessageText}
          error={errors.message}
          multiline
          numberOfLines={6}
          helperText={`${characterCount}/1000 characters`}
          style={isOverLimit ? styles.inputError : undefined}
        />

        <Input
          label="Phone Number"
          placeholder="+1 (555) 123-4567"
          value={phone}
          onChangeText={setPhone}
          error={errors.phone}
          keyboardType="phone-pad"
          helperText="Include country code (e.g., +1 for US)"
        />

        <View style={styles.deliverySection}>
          <Text style={styles.sectionTitle}>Delivery Time</Text>
          
          <TouchableOpacity
            style={styles.datetimeButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.datetimeText}>
              {formatDateTime(deliverAfter)}
            </Text>
          </TouchableOpacity>

          <View style={styles.quickDelays}>
            <Text style={styles.quickDelayTitle}>Quick delays:</Text>
            <View style={styles.quickDelayButtons}>
              {getQuickDelayOptions().map((option) => (
                <TouchableOpacity
                  key={option.minutes}
                  style={styles.quickDelayButton}
                  onPress={() => handleQuickDelay(option.minutes)}
                >
                  <Text style={styles.quickDelayButtonText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title={editMessage ? 'Update Message' : 'Queue Message'}
            onPress={handleSave}
            loading={loading}
            fullWidth
            disabled={isOverLimit}
          />
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={deliverAfter}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={deliverAfter}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },

  title: {
    flex: 1,
    fontSize: theme.fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.onBackground,
    textAlign: 'center',
  },

  headerSpacer: {
    width: 40, // Same width as back button
  },

  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },

  inputError: {
    borderColor: theme.colors.error,
  },

  deliverySection: {
    marginBottom: theme.spacing.xl,
  },

  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '600',
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.md,
  },

  datetimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },

  datetimeText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.onSurface,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },

  quickDelays: {
    marginTop: theme.spacing.sm,
  },

  quickDelayTitle: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },

  quickDelayButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },

  quickDelayButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    margin: theme.spacing.xs,
  },

  quickDelayButtonText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },

  actions: {
    paddingTop: theme.spacing.lg,
  },
});
