import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

import { SupabaseService } from '../services/supabase';
import { StorageService } from '../services/storage';
import { theme } from '../utils/theme';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Toast } from '../components/ui/Toast';
import { User } from '../types';
import { BrandTitle } from '../components/BrandTitle';

interface LoginScreenEnhancedProps {
  onLogin: (user: User) => void;
}

export const LoginScreenEnhanced: React.FC<LoginScreenEnhancedProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [step, setStep] = useState<'name' | 'username' | 'phone'>('name');

  // Test database connection on mount
  useEffect(() => {
    testDatabaseConnection();
  }, []);

  // Check username availability with debounce
  useEffect(() => {
    if (username.length >= 3) {
      const timeoutId = setTimeout(async () => {
        setIsCheckingUsername(true);
        const available = await SupabaseService.checkUsernameAvailability(username);
        setUsernameAvailable(available);
        setIsCheckingUsername(false);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setUsernameAvailable(null);
    }
  }, [username]);

  const testDatabaseConnection = async () => {
    try {
      const connected = await SupabaseService.testConnection();
      if (connected) {
        showToastMessage('Database connected successfully!', 'success');
      } else {
        showToastMessage('Database connection failed. Using offline mode.', 'error');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      showToastMessage('Connection test failed', 'error');
    }
  };

  const showToastMessage = (message: string, type: 'success' | 'error' | 'info') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const validateName = (name: string): boolean => {
    return name.trim().length >= 2;
  };

  const validateUsername = (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const handleNextStep = () => {
    if (step === 'name') {
      if (!validateName(name)) {
        showToastMessage('Please enter a valid name (at least 2 characters)', 'error');
        return;
      }
      setStep('username');
    } else if (step === 'username') {
      if (!validateUsername(username)) {
        showToastMessage('Username must be 3-20 characters (letters, numbers, underscore only)', 'error');
        return;
      }
      if (usernameAvailable === false) {
        showToastMessage('This username is already taken', 'error');
        return;
      }
      setStep('phone');
    }
  };

  const handlePreviousStep = () => {
    if (step === 'username') {
      setStep('name');
    } else if (step === 'phone') {
      setStep('username');
    }
  };

  const handleLogin = async () => {
    if (!validateName(name)) {
      showToastMessage('Please enter a valid name', 'error');
      return;
    }

    if (!validateUsername(username)) {
      showToastMessage('Please enter a valid username', 'error');
      return;
    }

    if (usernameAvailable === false) {
      showToastMessage('Username is already taken', 'error');
      return;
    }

    setIsLoading(true);
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Register user with Supabase
      const result = await SupabaseService.registerUser(name.trim(), username.trim(), phone.trim() || undefined);
      
      if (!result.success) {
        if (result.usernameTaken) {
          showToastMessage('Username is already taken. Please choose another.', 'error');
          setStep('username');
        } else {
          showToastMessage(result.message, 'error');
        }
        return;
      }

      if (result.user) {
        // Store user locally
        await StorageService.saveUser(result.user!);
        
  showToastMessage('Welcome to DEADZONE! 🎉', 'success');
        
        // Call onLogin with a slight delay to show success message
        setTimeout(() => {
          onLogin(result.user!);
        }, 1000);
      } else {
        throw new Error('User creation failed');
      }
      
    } catch (error) {
      console.error('Login failed:', error);
      showToastMessage(
        error instanceof Error ? error.message : 'Registration failed. Please try again.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getUsernameInputHelper = () => {
    if (username.length < 3) return null;
    if (isCheckingUsername) {
      return (
        <View style={styles.helperRow}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.helperText}>Checking availability...</Text>
        </View>
      );
    }
    if (usernameAvailable === true) {
      return (
        <View style={styles.helperRow}>
          <Text style={[styles.helperText, styles.available]}>✓ Username available</Text>
        </View>
      );
    }
    if (usernameAvailable === false) {
      return (
        <View style={styles.helperRow}>
          <Text style={[styles.helperText, styles.taken]}>✗ Username already taken</Text>
        </View>
      );
    }
    return null;
  };

  const getStepTitle = () => {
    switch (step) {
      case 'name': return 'What\'s your name?';
      case 'username': return 'Choose a username';
      case 'phone': return 'Phone number (optional)';
      default: return 'Get started';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'name': return 'Tell us what to call you';
      case 'username': return 'This will be how others find you';
      case 'phone': return 'For SMS notifications (you can skip this)';
      default: return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <BrandTitle size="lg" />
            <Text style={styles.tagline}>Offline-first messaging</Text>
          </View>

          <Card variant="glass" style={styles.card}>
            <View style={styles.stepIndicator}>
              <View style={[styles.step, step === 'name' && styles.activeStep]} />
              <View style={[styles.step, step === 'username' && styles.activeStep]} />
              <View style={[styles.step, step === 'phone' && styles.activeStep]} />
            </View>

            <Text style={styles.title}>{getStepTitle()}</Text>
            <Text style={styles.description}>{getStepDescription()}</Text>

            {step === 'name' && (
              <Input
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                onSubmitEditing={handleNextStep}
                style={styles.input}
              />
            )}

            {step === 'username' && (
              <View>
                <Input
                  placeholder="username (3-20 characters)"
                  value={username}
                  onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  autoCapitalize="none"
                  autoComplete="username"
                  returnKeyType="next"
                  onSubmitEditing={handleNextStep}
                  style={styles.input}
                />
                {getUsernameInputHelper()}
              </View>
            )}

            {step === 'phone' && (
              <Input
                placeholder="Phone number (optional)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                style={styles.input}
              />
            )}

            <View style={styles.buttonContainer}>
              {step !== 'name' && (
                <Button
                  title="Back"
                  variant="ghost"
                  onPress={handlePreviousStep}
                  style={styles.backButton}
                />
              )}
              
              {step !== 'phone' ? (
                <Button
                  title="Next"
                  onPress={handleNextStep}
                  disabled={
                    (step === 'name' && !validateName(name)) ||
                    (step === 'username' && (!validateUsername(username) || usernameAvailable === false))
                  }
                  style={styles.nextButton}
                />
              ) : (
                <Button
                  title={isLoading ? 'Creating Account...' : 'Get Started'}
                  onPress={handleLogin}
                  loading={isLoading}
                  disabled={!validateName(name) || !validateUsername(username) || usernameAvailable === false}
                  style={styles.loginButton}
                />
              )}
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onHide={() => setShowToast(false)}
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  tagline: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  card: {
    marginBottom: theme.spacing.lg,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  step: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
    marginHorizontal: 4,
  },
  activeStep: {
    backgroundColor: theme.colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  input: {
    marginBottom: theme.spacing.md,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  helperText: {
    fontSize: 14,
    marginLeft: theme.spacing.sm,
  },
  available: {
    color: theme.colors.success,
  },
  taken: {
    color: theme.colors.error,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flex: 0.3,
  },
  nextButton: {
    flex: 0.6,
  },
  loginButton: {
    flex: 1,
  },
});
