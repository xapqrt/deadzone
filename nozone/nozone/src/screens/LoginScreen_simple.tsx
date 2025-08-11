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
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');

  const handleNameChange = (value: string) => {
    setName(value);
    setNameError('');
  };

  const handleLogin = async () => {
    setNameError('');
    
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }

    if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return;
    }

    setLoading(true);
    
    try {
      // Simulate a brief loading for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create user with just the name
      const user: User = {
        id: Date.now().toString(), // Simple ID generation
        name: name.trim(),
        createdAt: new Date(),
      };
      
      onLogin(user);
    } catch (error) {
      setNameError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading fullScreen text="Welcome..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.header}>
            <BrandTitle size="xl" />
            <Text style={styles.subtitle}>
              What should we call you?
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Your Name"
              placeholder="Enter your name"
              value={name}
              onChangeText={handleNameChange}
              error={nameError}
              autoCapitalize="words"
              autoFocus
              helperText="This is how you'll appear to others"
            />
            
            <Button
              title="Get Started"
              onPress={handleLogin}
              loading={loading}
              fullWidth
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>
        </View>
      </ScrollView>
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

  footer: {
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
  },

  footerText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
