// nah bro we aain using this one, does not work for some reason was tryna copy truecaller
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  SlideInUp,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { SimCardService, SimCardInfo } from '../services/simCard';
import { Input } from './Input';
import { Button } from './Button';
import { theme } from '../utils/theme';

interface PhoneNumberSelectorProps {
  visible: boolean;
  onSelect: (phoneNumber: string) => void;
  onCancel: () => void;
}

export const PhoneNumberSelector: React.FC<PhoneNumberSelectorProps> = ({
  visible,
  onSelect,
  onCancel,
}) => {
  const [simCards, setSimCards] = useState<SimCardInfo[]>([]);
  const [customNumber, setCustomNumber] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [loading, setLoading] = useState(true);

  const modalScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      loadSimCards();
      modalScale.value = withSpring(1, { damping: 12 });
    } else {
      modalScale.value = withTiming(0);
    }
  }, [visible, modalScale]);

  const loadSimCards = async () => {
    try {
      setLoading(true);
      
      // Check permissions first (without requesting them)
      const permissionStatus = await SimCardService.checkPermissions();
      console.log('Permission status in selector:', permissionStatus);
      
      if (!permissionStatus.allPermissionsGranted) {
        // Show permission explanation before requesting
        const shouldRequest = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'SIM Detection',
            'To auto-detect your phone number from SIM cards, we need permission to access phone information. This data stays on your device.',
            [
              { text: 'Skip', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Allow', onPress: () => resolve(true) }
            ]
          );
        });
        
        if (!shouldRequest) {
          console.log('User chose to skip SIM detection');
          setShowCustomInput(true);
          return;
        }
        
        // Try to request permissions
        const hasPermission = await SimCardService.requestPermissions();
        if (!hasPermission) {
          Alert.alert(
            'Permission Required',
            'Phone permissions are needed to auto-detect SIM numbers. You can still enter your number manually.',
            [{ text: 'OK', onPress: () => setShowCustomInput(true) }]
          );
          return;
        }
      }

      // Get SIM card numbers
      const cards = await SimCardService.getSimCardNumbers();
      console.log('Detected SIM cards in selector:', cards);
      setSimCards(cards);
      
      if (cards.length === 0) {
        console.log('No SIM cards found, showing manual input');
        Alert.alert(
          'No SIM Cards Found',
          'No SIM cards were detected on your device. Please enter your number manually.',
          [{ text: 'OK', onPress: () => setShowCustomInput(true) }]
        );
      } else {
        const availableNumbers = cards.filter(sim => sim.hasPhoneNumber);
        console.log(`Found ${cards.length} SIM card(s), ${availableNumbers.length} with phone numbers`);
        
        if (availableNumbers.length === 0) {
          Alert.alert(
            'SIM Cards Found',
            'SIM cards were detected but phone numbers are not available. Please enter your number manually.',
            [{ text: 'OK', onPress: () => setShowCustomInput(true) }]
          );
        }
      }
    } catch (error) {
      console.error('Error loading SIM cards:', error);
      Alert.alert(
        'Detection Failed',
        'Could not detect SIM numbers. Please enter your number manually.',
        [{ text: 'OK', onPress: () => setShowCustomInput(true) }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSim = (simCard: SimCardInfo) => {
    if (simCard.phoneNumber) {
      onSelect(simCard.phoneNumber);
    }
  };

  const handleCustomNumber = () => {
    if (customNumber.length >= 10) {
      onSelect(customNumber);
    } else {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit phone number.');
    }
  };

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
    opacity: modalScale.value,
  }));

  const renderSimCard = ({ item }: { item: SimCardInfo }) => (
    <Animated.View entering={SlideInUp.delay((item.simSlotIndex ?? 0) * 100)}>
      <TouchableOpacity
        style={[
          styles.simCard,
          !item.hasPhoneNumber && styles.simCardDisabled
        ]}
        onPress={() => handleSelectSim(item)}
        disabled={!item.hasPhoneNumber}
      >
        <View style={styles.simCardContent}>
          <View style={styles.simIconContainer}>
            <Feather name="smartphone" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.simCardInfo}>
            <Text style={styles.phoneNumber}>
              {item.formattedNumber || SimCardService.formatIndianPhoneNumber(item.phoneNumber || '')}
            </Text>
            <Text style={styles.carrierName}>
              {item.carrierName} • SIM {(item.simSlotIndex ?? 0) + 1}
              {!item.hasPhoneNumber && ' • No number available'}
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalContent, modalAnimatedStyle]}>
          <Animated.View entering={FadeIn.delay(200)}>
            <View style={styles.header}>
              <Text style={styles.title}>Select Phone Number</Text>
              <Text style={styles.subtitle}>
                Choose from your SIM cards or enter manually
              </Text>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Detecting SIM cards...</Text>
              </View>
            ) : (
              <View style={styles.content}>
                {simCards.length > 0 && !showCustomInput ? (
                  <View style={styles.simCardsContainer}>
                    <FlatList
                      data={simCards}
                      keyExtractor={(item) => `sim-${item.simSlotIndex ?? 0}`}
                      renderItem={renderSimCard}
                      showsVerticalScrollIndicator={false}
                    />
                    
                    <TouchableOpacity
                      style={styles.customInputButton}
                      onPress={() => setShowCustomInput(true)}
                    >
                      <Feather name="edit-2" size={16} color={theme.colors.primary} />
                      <Text style={styles.customInputButtonText}>
                        Enter number manually
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.manualInputContainer}>
                    <Input
                      label="Phone Number"
                      placeholder="9876543210"
                      value={customNumber}
                      onChangeText={setCustomNumber}
                      keyboardType="phone-pad"
                      prefix="+91 "
                      helperText="Enter your 10-digit mobile number"
                      autoFocus
                    />
                    
                    {simCards.length > 0 && (
                      <TouchableOpacity
                        style={styles.backToSimsButton}
                        onPress={() => setShowCustomInput(false)}
                      >
                        <Feather name="arrow-left" size={16} color={theme.colors.primary} />
                        <Text style={styles.backToSimsButtonText}>
                          Back to SIM cards
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}

            <View style={styles.actions}>
              {showCustomInput && (
                <Button
                  title="Use This Number"
                  onPress={handleCustomNumber}
                  fullWidth
                  style={styles.confirmButton}
                />
              )}
              
              <Button
                title="Cancel"
                onPress={onCancel}
                variant="outline"
                fullWidth
              />
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    ...theme.shadows.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSizes.xl,
    fontFamily: theme.fonts.bold,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  loadingText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  content: {
    marginBottom: theme.spacing.lg,
  },
  simCardsContainer: {
    maxHeight: 300,
  },
  simCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  simCardDisabled: {
    opacity: 0.6,
    backgroundColor: theme.colors.surface,
  },
  simCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  simIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryAlpha,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  simCardInfo: {
    flex: 1,
  },
  phoneNumber: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.xs,
  },
  carrierName: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
  customInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  customInputButtonText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
  },
  manualInputContainer: {
    paddingVertical: theme.spacing.md,
  },
  backToSimsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  backToSimsButtonText: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  confirmButton: {
    marginBottom: theme.spacing.sm,
  },
});
