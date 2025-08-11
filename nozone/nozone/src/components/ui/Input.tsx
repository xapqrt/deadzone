import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme, typography } from '../../utils/theme';
import { useResponsive } from '../../utils/responsive';

const AnimatedView = Animated.createAnimatedComponent(View);

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  helperText?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  variant?: 'filled' | 'outlined' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  required?: boolean;
  secure?: boolean;
  multiline?: boolean;
  maxLength?: number;
  showCharacterCount?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  autoFocus?: boolean;
  clearable?: boolean;
  validateOnBlur?: boolean;
  validator?: (value: string) => string | null;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'outlined',
  size = 'md',
  disabled = false,
  required = false,
  secure = false,
  multiline = false,
  maxLength,
  showCharacterCount = false,
  style,
  inputStyle,
  labelStyle,
  autoFocus = false,
  clearable = false,
  validateOnBlur = true,
  validator,
  ...textInputProps
}) => {
  const { spacing, fontSize, touchTarget } = useResponsive();
  const [isFocused, setIsFocused] = useState(false);
  const [isSecureVisible, setIsSecureVisible] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  
  const focusValue = useSharedValue(0);
  const errorValue = useSharedValue(0);

  const displayError = error || internalError;
  const hasError = Boolean(displayError);
  const isEmpty = !value || value.length === 0;
  const isActive = isFocused || !isEmpty;

  React.useEffect(() => {
    focusValue.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused]);

  React.useEffect(() => {
    errorValue.value = withTiming(hasError ? 1 : 0, { duration: 200 });
  }, [hasError]);

  const handleFocus = useCallback((e: any) => {
    setIsFocused(true);
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    textInputProps.onFocus?.(e);
  }, [textInputProps.onFocus]);

  const handleBlur = useCallback((e: any) => {
    setIsFocused(false);
    
    if (validateOnBlur && validator) {
      const validationError = validator(value);
      setInternalError(validationError);
    }
    
    textInputProps.onBlur?.(e);
  }, [value, validateOnBlur, validator, textInputProps.onBlur]);

  const handleChangeText = useCallback((text: string) => {
    // Clear internal error when user starts typing
    if (internalError) {
      setInternalError(null);
    }
    
    onChangeText(text);
  }, [onChangeText, internalError]);

  const handleClear = useCallback(() => {
    onChangeText('');
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [onChangeText]);

  const handleSecureToggle = useCallback(() => {
    setIsSecureVisible(!isSecureVisible);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [isSecureVisible]);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      errorValue.value,
      [0, 1],
      [
        interpolateColor(
          focusValue.value,
          [0, 1],
          [theme.colors.border, theme.colors.primary]
        ),
        theme.colors.error
      ]
    );

    const backgroundColor = variant === 'filled' 
      ? interpolateColor(
          focusValue.value,
          [0, 1],
          [theme.colors.surfaceVariant, theme.colors.surface]
        )
      : 'transparent';

    return {
      borderColor,
      backgroundColor,
    };
  });

  const labelAnimatedStyle = useAnimatedStyle(() => {
    const translateY = withTiming(
      isActive ? -8 : getSizeStyles(size, spacing).paddingVertical,
      { duration: 200 }
    );
    
    const scale = withTiming(isActive ? 0.85 : 1, { duration: 200 });
    
    const color = interpolateColor(
      errorValue.value,
      [0, 1],
      [
        interpolateColor(
          focusValue.value,
          [0, 1],
          [theme.colors.textMuted, theme.colors.primary]
        ),
        theme.colors.error
      ]
    );

    return {
      transform: [{ translateY }, { scale }],
      color,
    };
  });

  const inputSizeStyles = getSizeStyles(size, spacing);
  const textSizeStyles = getSizeTextStyles(size, fontSize);

  const rightIconName = secure 
    ? (isSecureVisible ? 'eye-off' : 'eye')
    : clearable && value && !disabled
    ? 'x'
    : rightIcon;

  const handleRightIconPress = secure
    ? handleSecureToggle
    : clearable && value && !disabled
    ? handleClear
    : onRightIconPress;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Animated.View style={[styles.labelContainer, labelAnimatedStyle]}>
          <Text style={[styles.label, textSizeStyles.label, labelStyle]}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </Animated.View>
      )}

      <AnimatedView style={[
        styles.inputContainer,
        getVariantStyles(variant),
        inputSizeStyles,
        containerAnimatedStyle,
        disabled && styles.disabled,
      ]}>
        {leftIcon && (
          <Feather
            name={leftIcon as any}
            size={getIconSize(size)}
            color={hasError ? theme.colors.error : theme.colors.textMuted}
            style={[styles.leftIcon, { marginRight: spacing.xs }]}
          />
        )}

        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            textSizeStyles.input,
            inputStyle,
            multiline && styles.multilineInput,
          ]}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={secure && !isSecureVisible}
          editable={!disabled}
          multiline={multiline}
          maxLength={maxLength}
          autoFocus={autoFocus}
          selectionColor={theme.colors.primary}
          {...textInputProps}
        />

        {rightIconName && (
          <TouchableOpacity
            onPress={handleRightIconPress}
            style={[styles.rightIcon, { marginLeft: spacing.xs }]}
            disabled={!handleRightIconPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={rightIconName as any}
              size={getIconSize(size)}
              color={hasError ? theme.colors.error : theme.colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </AnimatedView>

      {(displayError || helperText || showCharacterCount) && (
        <View style={styles.footer}>
          <View style={styles.messageContainer}>
            {displayError ? (
              <Text style={[styles.errorText, textSizeStyles.helper]}>
                {displayError}
              </Text>
            ) : helperText ? (
              <Text style={[styles.helperText, textSizeStyles.helper]}>
                {helperText}
              </Text>
            ) : null}
          </View>

          {showCharacterCount && maxLength && (
            <Text style={[styles.characterCount, textSizeStyles.helper]}>
              {value.length}/{maxLength}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

// Helper functions
const getSizeStyles = (size: string, spacing: any) => {
  const styles = {
    sm: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      minHeight: 36,
    },
    md: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 44,
    },
    lg: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      minHeight: 52,
    },
  };
  return styles[size as keyof typeof styles] || styles.md;
};

const getSizeTextStyles = (size: string, fontSize: any) => {
  const styles = {
    sm: {
      input: { fontSize: fontSize.sm },
      label: { fontSize: fontSize.xs },
      helper: { fontSize: fontSize.xs },
    },
    md: {
      input: { fontSize: fontSize.md },
      label: { fontSize: fontSize.sm },
      helper: { fontSize: fontSize.sm },
    },
    lg: {
      input: { fontSize: fontSize.lg },
      label: { fontSize: fontSize.md },
      helper: { fontSize: fontSize.sm },
    },
  };
  return styles[size as keyof typeof styles] || styles.md;
};

const getVariantStyles = (variant: string) => {
  return {
    filled: {
      borderWidth: 0,
      borderBottomWidth: 2,
    },
    outlined: {
      borderWidth: 1,
    },
    ghost: {
      borderWidth: 0,
      borderBottomWidth: 1,
    },
  }[variant] || {};
};

const getIconSize = (size: string) => {
  const sizes = {
    sm: 16,
    md: 18,
    lg: 20,
  };
  return sizes[size as keyof typeof sizes] || sizes.md;
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  labelContainer: {
    position: 'absolute',
    left: theme.spacing.md,
    zIndex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 4,
  },
  label: {
    fontFamily: typography.fonts.medium,
    color: theme.colors.textMuted,
  },
  required: {
    color: theme.colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'transparent',
  },
  input: {
    flex: 1,
    fontFamily: typography.fonts.regular,
    color: theme.colors.onBackground,
    textAlignVertical: 'center',
    paddingVertical: 0, // Remove default padding
  },
  multilineInput: {
    textAlignVertical: 'top',
    paddingTop: theme.spacing.sm,
  },
  leftIcon: {
    // No default styles needed
  },
  rightIcon: {
    padding: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  messageContainer: {
    flex: 1,
  },
  errorText: {
    fontFamily: typography.fonts.regular,
    color: theme.colors.error,
  },
  helperText: {
    fontFamily: typography.fonts.regular,
    color: theme.colors.textMuted,
  },
  characterCount: {
    fontFamily: typography.fonts.regular,
    color: theme.colors.textMuted,
    marginLeft: theme.spacing.sm,
  },
  disabled: {
    opacity: 0.6,
  },
});
