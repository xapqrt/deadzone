import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { User } from '../types';
import { theme } from '../utils/theme';
import { BrandTitle } from '../components/BrandTitle';

export interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [remainingTime, setRemainingTime] = useState(0);
  const [showPhoneSelector, setShowPhoneSelector] = useState(false);
  const [showQAMode, setShowQAMode] = useState(false);

  // Auto-detect SIM cards on mount if in dev mode
  useEffect(() => {
    if (__DEV__) {
      autoDetectSimCards();
    }
  }, []);

  const autoDetectSimCards = async () => {
    try {
      console.log('Auto-detecting SIM cards...');
      
      // Check if we have permissions first (without requesting them)
      const permissionStatus = await SimCardService.checkPermissions();
      console.log('Initial permission status:', permissionStatus);
      
      // Only proceed with auto-detection if we already have permissions or in dev mode
      if (permissionStatus.allPermissionsGranted || __DEV__) {
        const simCards = await SimCardService.getSimCardNumbers();
        console.log('Auto-detected SIM cards:', simCards);
        
        if (simCards.length > 0 && simCards[0].phoneNumber && simCards[0].hasPhoneNumber) {
          console.log('Auto-filled phone number from SIM:', simCards[0].phoneNumber);
          setPhone(simCards[0].phoneNumber);
          
          // Show a subtle toast to inform user
          Alert.alert(
            'Phone Number Detected',
            `Auto-filled from ${simCards[0].carrierName} SIM card. You can change it if needed.`,
            [{ text: 'OK' }]
          );
        } else {
          console.log('SIM detected but no phone number available');
        }
      } else {
        console.log('Auto-detection skipped - permissions not available');
      }
    } catch (error) {
      console.log('Auto-detection failed:', error);
      // Don't show error to user for auto-detection failure
    }
  };
  const [simDetectionDone, setSimDetectionDone] = useState(false);

  // Auto-detect SIM card numbers on component mount
  useEffect(() => {
    const detectSimCards = async () => {
      if (simDetectionDone) return;
      
      try {
        const simCards = await SimCardService.getSimCardNumbers();
        
        if (simCards.length > 0) {
          // If only one SIM card, auto-fill the phone number
          if (simCards.length === 1 && simCards[0].phoneNumber) {
            const phoneNumber = simCards[0].phoneNumber;
            if (SimCardService.validateIndianMobile(phoneNumber)) {
              setPhone(phoneNumber);
              console.log('📱 Auto-filled phone number from SIM:', phoneNumber);
            }
          } else if (simCards.length > 1) {
            // Multiple SIM cards detected, show selector automatically
            console.log('📱 Multiple SIM cards detected:', simCards.length);
            // Don't auto-show selector, let user click the button
          }
        }
      } catch (error) {
        console.error('Error detecting SIM cards:', error);
      } finally {
        setSimDetectionDone(true);
      }
    };

    detectSimCards();
  }, [simDetectionDone]);

  // Auto-format Indian phone numbers
  const handlePhoneChange = (value: string) => {
    // Allow only digits and format as Indian number
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length <= 10) {
      setPhone(cleaned);
    }
    
    setPhoneError('');
  };

  const handlePhoneSelect = (selectedPhone: string) => {
    // Remove +91 prefix if present for internal storage
    const cleanedPhone = selectedPhone.replace(/^\+91\s?/, '');
    setPhone(cleanedPhone);
    setShowPhoneSelector(false);
    setPhoneError('');
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (step === 'otp' && remainingTime > 0) {
      interval = setInterval(() => {
        const remaining = PhoneVerificationService.getRemainingTime();
        setRemainingTime(remaining);
        
        if (remaining <= 0) {
          setStep('phone');
          setOtp('');
          Alert.alert('OTP Expired', 'Please request a new OTP.');
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, remainingTime]);

  const handleSendOTP = async () => {
    setPhoneError('');
    
    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      return;
    }

    setLoading(true);
    
    try {
      const result = await PhoneVerificationService.sendOTP(phone);
      
      if (result.success) {
        setStep('otp');
        setRemainingTime(600); // 10 minutes
        Alert.alert(
          'OTP Sent',
          `A 6-digit code has been sent to ${formatPhone(phone)}.\n\nFor demo purposes, check the console for the OTP.`,
          [{ text: 'OK' }]
        );
      } else {
        setPhoneError(result.error || 'Failed to send OTP');
      }
    } catch (error) {
      setPhoneError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setOtpError('');
    
    if (!otp.trim()) {
      setOtpError('OTP is required');
      return;
    }

    if (otp.length !== 6) {
      setOtpError('OTP must be 6 digits');
      return;
    }

    setLoading(true);
    
    try {
      const result = await PhoneVerificationService.verifyOTP(phone, otp);
      
      if (result.success && result.user) {
        onLogin(result.user);
      } else {
        setOtpError(result.error || 'Invalid OTP');
      }
    } catch (error) {
      setOtpError('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setOtpError('');
    
    try {
      const result = await PhoneVerificationService.resendOTP(phone);
      
      if (result.success) {
        setRemainingTime(600); // 10 minutes
        Alert.alert('OTP Resent', 'A new code has been sent to your phone.');
      } else {
        setOtpError(result.error || 'Failed to resend OTP');
      }
    } catch (error) {
      setOtpError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    setStep('phone');
    setOtp('');
    setOtpError('');
  };

  const formatRemainingTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <Loading fullScreen text="Please wait..." />;
  }

  // Show QA testing screen if enabled
  if (showQAMode) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.qaHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowQAMode(false)}
          >
            <Feather name="arrow-left" size={24} color={theme.colors.onBackground} />
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
        <SimCardQAScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.header}>
            <BrandTitle size="xl" />
            <Text style={styles.subtitle}>
              {step === 'phone' 
                ? 'Enter your phone number to get started'
                : 'Enter the 6-digit code sent to your phone'
              }
            </Text>
          </View>

          {step === 'phone' ? (
            <View style={styles.form}>
              <View style={styles.phoneInputContainer}>
                <Input
                  label="Phone Number"
                  placeholder="9876543210"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  error={phoneError}
                  keyboardType="phone-pad"
                  autoFocus
                  helperText="Enter your 10-digit Indian mobile number"
                  prefix="+91 "
                />
                
                <TouchableOpacity
                  style={styles.simDetectButton}
                  onPress={() => setShowPhoneSelector(true)}
                  activeOpacity={0.7}
                >
                  <Feather name="smartphone" size={18} color={theme.colors.primary} />
                  <Text style={styles.simDetectButtonText}>Auto-detect</Text>
                </TouchableOpacity>
              </View>
              
              <Button
                title="Send Code"
                onPress={handleSendOTP}
                loading={loading}
                fullWidth
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Input
                label="Verification Code"
                placeholder="123456"
                value={otp}
                onChangeText={setOtp}
                error={otpError}
                keyboardType="numeric"
                maxLength={6}
                autoFocus
                helperText={`Code expires in ${formatRemainingTime(remainingTime)}`}
              />
              
              <Button
                title="Verify Code"
                onPress={handleVerifyOTP}
                loading={loading}
                fullWidth
                style={styles.primaryButton}
              />
              
              <Button
                title="Resend Code"
                onPress={handleResendOTP}
                variant="outline"
                disabled={remainingTime > 570} // Can resend after 30 seconds
                fullWidth
                style={styles.secondaryButton}
              />
              
              <Button
                title="Change Phone Number"
                onPress={handleGoBack}
                variant="ghost"
                fullWidth
              />
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </Text>
            
            {__DEV__ && (
              <TouchableOpacity
                style={styles.qaButton}
                onPress={() => setShowQAMode(true)}
              >
                <Feather name="settings" size={16} color={theme.colors.primary} />
                <Text style={styles.qaButtonText}>QA Tests</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
      
      <PhoneNumberSelector
        visible={showPhoneSelector}
        onSelect={handlePhoneSelect}
        onCancel={() => setShowPhoneSelector(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },

  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },

  title: {
    fontSize: theme.fontSizes.xxxl,
    fontWeight: 'bold',
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.sm,
  },

  subtitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  form: {
    marginBottom: theme.spacing.xl,
  },

  phoneInputContainer: {
    position: 'relative',
    marginBottom: theme.spacing.lg,
  },

  simDetectButton: {
    position: 'absolute',
    right: 12,
    top: 36, // Align with input field
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryAlpha,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },

  simDetectButtonText: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
  },

  primaryButton: {
    marginBottom: theme.spacing.md,
  },

  secondaryButton: {
    marginBottom: theme.spacing.sm,
  },

  footer: {
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
  },

  footerText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },

  qaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primaryAlpha,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },

  qaButtonText: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
  },

  qaHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },

  backButtonText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.onBackground,
  },
});
