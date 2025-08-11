import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  Animated,
  Vibration,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  UIManager,
  findNodeHandle,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import BrandTitle from '../components/BrandTitle';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { KeyboardAwareWrapper } from '../components/KeyboardAwareWrapper';
import { theme } from '../utils/theme';
import Reanimated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  withRepeat,
  withDelay,
  interpolate,
  runOnJS,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import { User } from '../types';
import { AuthService, LoginCredentials, RegisterCredentials } from '../services/auth';

const { width, height } = Dimensions.get('window');

export interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const AnimatedTouchableOpacity = Reanimated.createAnimatedComponent(TouchableOpacity);

type AuthMode = 'login' | 'register' | 'forgot';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Animation values
  const cardY = useSharedValue(height);
  const scanLineX = useSharedValue(-width); // retained for subtle ambient line
  const focusGlow = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const checkmarkOpacity = useSharedValue(0);
  const textRevealProgress = useSharedValue(0);
  const smokeOpacity = useSharedValue(0.3);
  const particleY1 = useSharedValue(height);
  const particleY2 = useSharedValue(height);
  const particleY3 = useSharedValue(height);
  const buttonGlow = useSharedValue(0);
  const formTranslateY = useSharedValue(0);

  // Animated Ref
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const usernameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const nameInputRef = useRef<TextInput>(null);
  const usernameInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmInputRef = useRef<TextInput>(null);

  const scrollIntoView = (ref: React.RefObject<TextInput | null>) => {
    try {
      const inputNode = ref.current ? findNodeHandle(ref.current) : null;
      const scrollNode = scrollRef.current ? findNodeHandle(scrollRef.current) : null;
      if (inputNode && scrollNode) {
        UIManager.measureLayout(
          inputNode,
          scrollNode,
          () => {},
          (x, y, w, h) => {
            // Scroll so the input top is visible with a small margin
            const targetY = Math.max(0, y - 24);
            scrollRef.current?.scrollTo({ y: targetY, animated: true });
          }
        );
      }
    } catch {}
  };

  useEffect(() => {
    // Entry animation
    cardY.value = withDelay(500, withSpring(0, {
      damping: 15,
      stiffness: 150,
    }));

  // Subtle ambient line animation (softened for new theme)
    const scanAnimation = () => {
      scanLineX.value = withTiming(width + 100, {
    duration: 5000,
        easing: Easing.linear,
      }, () => {
        scanLineX.value = -width;
        runOnJS(scanAnimation)();
      });
    };
    scanAnimation();

    // Gentle opacity pulsing (kept but subtle)
    const smokeAnimation = () => {
      smokeOpacity.value = withTiming(0.6, {
        duration: 6000,
        easing: Easing.inOut(Easing.ease),
      }, () => {
        smokeOpacity.value = withTiming(0.3, {
          duration: 6000,
          easing: Easing.inOut(Easing.ease),
        }, () => {
          runOnJS(smokeAnimation)();
        });
      });
    };
    smokeAnimation();

  // Floating particles animation (softened)
    const floatingParticles = () => {
      particleY1.value = withTiming(-100, {
    duration: 12000,
        easing: Easing.linear,
      }, () => {
        particleY1.value = height + 100;
        runOnJS(floatingParticles)();
      });
      
      particleY2.value = withDelay(2000, withTiming(-100, {
        duration: 10000,
        easing: Easing.linear,
      }, () => {
        particleY2.value = height + 100;
      }));
      
      particleY3.value = withDelay(4000, withTiming(-100, {
        duration: 14000,
        easing: Easing.linear,
      }, () => {
        particleY3.value = height + 100;
      }));
    };
    floatingParticles();

    // Cursor pulse animation
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, []);

  useEffect(() => {
    // Form transition animation when switching modes
    formTranslateY.value = withSpring(0, {
      damping: 15,
      stiffness: 150,
    });
  }, [authMode]);

  useEffect(() => {
    // Button glow animation when loading
    buttonGlow.value = withTiming(loading ? 1 : 0, {
      duration: 500,
      easing: Easing.inOut(Easing.ease),
    });
  }, [loading]);

  // Debounced username availability check
  useEffect(() => {
    if (authMode === 'register' && username.length >= 3) {
      setUsernameChecking(true);
      setUsernameAvailable(null);
      
      // Clear previous timeout
      if (usernameTimeoutRef.current) {
        clearTimeout(usernameTimeoutRef.current);
      }

      // Set new timeout
      usernameTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await AuthService.checkUsernameAvailability(username);
          setUsernameAvailable(result.available);
          if (!result.available) {
            setUsernameError(result.message);
          } else {
            setUsernameError('');
          }
        } catch (error) {
          setUsernameError('Failed to check username');
        } finally {
          setUsernameChecking(false);
        }
      }, 500);
    } else {
      setUsernameChecking(false);
      setUsernameAvailable(null);
    }

    return () => {
      if (usernameTimeoutRef.current) {
        clearTimeout(usernameTimeoutRef.current);
      }
    };
  }, [username, authMode]);

  const validateForm = (): boolean => {
    let isValid = true;

    // Reset errors
    setUsernameError('');
    setPasswordError('');
    setNameError('');

    // Username validation
    if (!username.trim()) {
      setUsernameError('Username is required');
      isValid = false;
    } else if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      isValid = false;
    }

    // Password validation
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    // Registration-specific validations
    if (authMode === 'register') {
      if (!name.trim()) {
        setNameError('Name is required');
        isValid = false;
      } else if (name.trim().length < 2) {
        setNameError('Name must be at least 2 characters');
        isValid = false;
      }

      if (password !== confirmPassword) {
        setPasswordError('Passwords do not match');
        isValid = false;
      }

      if (usernameAvailable === false) {
        setUsernameError('Username is not available');
        isValid = false;
      }
    }

    return isValid;
  };

  const handleAuth = async () => {
    if (!validateForm()) {
      // Shake animation for error with haptic feedback
      buttonScale.value = withRepeat(
        withTiming(1.05, { duration: 100 }),
        3,
        true
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Button press animation
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1.05);
    });

    try {
      let result;

      if (authMode === 'login') {
        const credentials: LoginCredentials = { username, password };
        result = await AuthService.login(credentials);
      } else if (authMode === 'register') {
        const credentials: RegisterCredentials = { username, password, name };
        result = await AuthService.register(credentials);
      }

      if (result?.success && result.user) {
        // Success animation with haptic
        checkmarkOpacity.value = withTiming(1, { duration: 300 }, () => {
          checkmarkOpacity.value = withTiming(0, { duration: 300 });
        });
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Update user activity
        await AuthService.updateLastActive(result.user.id);
        
        setTimeout(() => onLogin(result.user!), 800);
      } else {
        // Error handling
        setLoading(false);
        buttonScale.value = withSpring(1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        if (result?.message) {
          Alert.alert('Authentication Failed', result.message);
        }
      }
    } catch (error) {
      setLoading(false);
      buttonScale.value = withSpring(1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      console.error('Authentication error:', error);
    }
  };

  const switchAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setUsernameError('');
    setPasswordError('');
    setNameError('');
    setUsername('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setUsernameAvailable(null);
  };


  // Animated styles
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardY.value }],
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: formTranslateY.value }],
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: scanLineX.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: checkmarkOpacity.value,
  }));

  const smokeStyle = useAnimatedStyle(() => ({
    opacity: smokeOpacity.value,
  }));

  const particleStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateY: particleY1.value }, { translateX: 20 }],
  }));

  const particleStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateY: particleY2.value }, { translateX: width - 40 }],
  }));

  const particleStyle3 = useAnimatedStyle(() => ({
    transform: [{ translateY: particleY3.value }, { translateX: width * 0.6 }],
  }));

  const buttonGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(buttonGlow.value, [0, 1], [0, 0.8], Extrapolation.CLAMP),
  }));

  const getButtonText = () => {
    if (loading) {
      return authMode === 'login' ? 'Signing in...' : 'Creating account...';
    }
    return authMode === 'login' ? 'Sign In 🔓' : 'Create Account 🚀';
  };

  const getStepText = () => {
    if (authMode === 'register') return 'Create your account';
    if (authMode === 'forgot') return 'Reset password';
    return ''; // no extra line on plain login
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <KeyboardAwareWrapper
          offset={Platform.OS === 'ios' ? 4 : 0}
          maxShiftRatio={Platform.OS === 'ios' ? 0.25 : 0}
          enabled={Platform.OS === 'ios'}
        >
        {/* Dynamic Gradient Background */}
        <LinearGradient
          colors={['#FFFFFF', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        />

  {/* Decorative smoke removed for clarity */}

      {/* Scanner Lines */}
  {/* Scan lines removed */}

      {/* Floating Particles */}
  {/* Particles removed */}

  {/* Main Card */}
  <Reanimated.View style={[styles.cardContainer, cardAnimatedStyle]}>
  <View style={styles.card}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{getStepText()}</Text>
          </View>

          {/* App Branding */}
          <View style={styles.brandingContainer}>
            <BrandTitle size="xl" />
            <Text style={styles.tagline}>Signal survives. You thrive.</Text>
          </View>

          {/* Auth Mode Switcher */}
          <View style={styles.authModeContainer}>
            <TouchableOpacity
              style={[styles.authModeButton, authMode === 'login' && styles.authModeActive]}
              onPress={() => switchAuthMode('login')}
            >
              <Text style={[styles.authModeText, authMode === 'login' && styles.authModeTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authModeButton, authMode === 'register' && styles.authModeActive]}
              onPress={() => switchAuthMode('register')}
            >
              <Text style={[styles.authModeText, authMode === 'register' && styles.authModeTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <Reanimated.View style={[styles.formContainer, formAnimatedStyle]}>
            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 4 : 0 }}
            >
            {/* Name Field (Register only) */}
            {authMode === 'register' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  ref={nameInputRef}
                  style={[styles.input, nameError ? styles.inputError : null]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your full name"
                  placeholderTextColor="#64748B"
                  autoCapitalize="words"
                  maxLength={50}
                  onFocus={() => scrollIntoView(nameInputRef)}
                />
                {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
              </View>
            )}

            {/* Username Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Username</Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  ref={usernameInputRef}
                  style={[
                    styles.input, 
                    usernameError ? styles.inputError : null,
                    usernameAvailable === true ? styles.inputSuccess : null
                  ]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="your_username"
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                  onFocus={() => scrollIntoView(usernameInputRef)}
                />
                {authMode === 'register' && (
                  <View style={styles.inputIcon}>
                    {usernameChecking ? (
                      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <Feather name="loader" size={16} color="#64748B" />
                      </Animated.View>
                    ) : usernameAvailable === true ? (
                      <Feather name="check-circle" size={16} color={theme.colors.success} />
                    ) : usernameAvailable === false ? (
                      <Feather name="x-circle" size={16} color={theme.colors.error} />
                    ) : null}
                  </View>
                )}
              </View>
              {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}
            </View>

            {/* Password Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  ref={passwordInputRef}
                  style={[styles.input, passwordError ? styles.inputError : null]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#64748B"
                  secureTextEntry={!showPassword}
                  maxLength={128}
                  onFocus={() => scrollIntoView(passwordInputRef)}
                />
                <TouchableOpacity
                  style={styles.inputIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                    <Feather 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={16} 
                    color="#64748B" 
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            {/* Confirm Password Field (Register only) */}
            {authMode === 'register' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <TextInput
                  ref={confirmInputRef}
                  style={[styles.input, password !== confirmPassword && confirmPassword ? styles.inputError : null]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#64748B"
                  secureTextEntry={!showPassword}
                  maxLength={128}
                  onFocus={() => scrollIntoView(confirmInputRef)}
                />
                {password !== confirmPassword && confirmPassword ? (
                  <Text style={styles.errorText}>Passwords do not match</Text>
                ) : null}
              </View>
            )}

            {/* Auth Button */}
            <AnimatedTouchableOpacity
              style={[styles.button, buttonAnimatedStyle]}
              onPress={handleAuth}
              disabled={loading}
            >
              <Reanimated.View style={[styles.buttonGlowRing, buttonGlowStyle]} />
              <LinearGradient
                colors={['#16A34A', '#22C55E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>{getButtonText()}</Text>
                
                {/* Success Checkmark */}
                <Reanimated.View style={[styles.checkmark, checkmarkStyle]}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </Reanimated.View>
              </LinearGradient>
            </AnimatedTouchableOpacity>


            {/* Test auth button removed for production */}
            </ScrollView>
          </Reanimated.View>
  </View>
      </Reanimated.View>
        </KeyboardAwareWrapper>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height * 1.2,
  },

  smokeLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height * 1.2,
    opacity: 0.3,
  },

  scanLine: {
    position: 'absolute',
    width: 2,
    height: height,
    backgroundColor: 'rgba(139, 92, 246, 0.8)',
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    transform: [{ rotate: '15deg' }],
  },

  scanLine2: {
    position: 'absolute',
    width: 1,
    height: height,
    backgroundColor: 'rgba(6, 182, 212, 0.6)',
    shadowColor: theme.colors.info,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    transform: [{ rotate: '15deg' }],
    left: 20,
  },

  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  card: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 24,
  paddingTop: 32,
  paddingHorizontal: 32,
  paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },

  progressContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },

  progressText: {
  color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  brandingContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appNameOuter: {
    flexDirection: 'row',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
    textAlign: 'center',
    // shadow for standout
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  appNameGradient: {
    color: 'transparent',
  },

  tagline: {
    fontSize: 14,
  color: '#000000',
    textAlign: 'center',
    letterSpacing: 0.25,
    fontStyle: 'italic',
    fontWeight: '400',
  },

  authModeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },

  authModeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  authModeActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
  },

  authModeText: {
    fontSize: 14,
    fontWeight: '600',
  color: '#000000',
  },

  authModeTextActive: {
    color: '#000000',
  },

  formContainer: {
    width: '100%',
  },

  inputContainer: {
    marginBottom: 20,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  color: '#000000',
    marginBottom: 8,
    letterSpacing: 0.25,
  },

  inputWithIcon: {
    position: 'relative',
  },

  input: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 48,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    fontWeight: '500',
  },

  inputError: {
    borderColor: theme.colors.error,
    backgroundColor: '#FEF2F2',
  },

  inputSuccess: {
    borderColor: theme.colors.success,
    backgroundColor: '#F0FDF4',
  },

  inputIcon: {
    position: 'absolute',
    right: 16,
    top: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4,
    marginLeft: 4,
  },

  button: {
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    marginTop: 8,
  },

  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.25,
  },

  checkmark: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },

  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },



  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(139, 92, 246, 0.6)',
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },

  buttonGlowRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
});
