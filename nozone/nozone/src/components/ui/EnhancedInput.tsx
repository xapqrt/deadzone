import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  TouchableOpacity,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import { useResponsive } from '../../utils/responsive';

export interface EnhancedInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  style?: ViewStyle;
  multiline?: boolean;
  numberOfLines?: number;
  prefix?: string;
  leftIcon?: keyof typeof Feather.glyphMap;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightIconPress?: () => void;
  iconSize?: number;
  iconColor?: string;
}

export const EnhancedInput: React.FC<EnhancedInputProps> = ({
  label,
  error,
  helperText,
  style,
  multiline = false,
  numberOfLines = 1,
  prefix,
  leftIcon,
  rightIcon,
  onRightIconPress,
  iconSize = 20,
  iconColor,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const { spacing, fontSize } = useResponsive();
  
  const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    if (textInputProps.onFocus) {
      textInputProps.onFocus(e);
    }
  };
  
  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
    if (textInputProps.onBlur) {
      textInputProps.onBlur(e);
    }
  };
  
  const borderColor = error
    ? theme.colors.error
    : isFocused
    ? theme.colors.inputFocused
    : theme.colors.inputBorder;
    
  const iconColorValue = iconColor || theme.colors.textSecondary;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text 
          style={[
            styles.label, 
            { fontSize: fontSize.sm, marginBottom: spacing.xs }
          ]}
        >
          {label}
        </Text>
      )}
      
      <View style={[
        styles.inputContainer,
        {
          borderColor,
          paddingLeft: leftIcon ? spacing.lg : spacing.sm,
          height: multiline ? undefined : 50,
        }
      ]}>
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Feather name={leftIcon} size={iconSize} color={iconColorValue} />
          </View>
        )}
        
        {prefix && (
          <Text style={styles.prefix}>{prefix}</Text>
        )}
        
        <TextInput
          style={[
            styles.input,
            { 
              height: multiline ? undefined : '100%',
              textAlignVertical: multiline ? 'top' : 'center',
            }
          ]}
          placeholderTextColor={theme.colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          {...textInputProps}
        />
        
        {rightIcon && (
          <TouchableOpacity 
            style={styles.rightIconContainer} 
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            <Feather name={rightIcon} size={iconSize} color={iconColorValue} />
          </TouchableOpacity>
        )}
      </View>
      
      {(error || helperText) && (
        <Text 
          style={[
            styles.helperText, 
            error && styles.errorText,
            { fontSize: fontSize.xs, marginTop: spacing.xs }
          ]}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: theme.colors.inputBackground,
    overflow: 'hidden',
    position: 'relative',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: theme.colors.text,
    fontSize: 16,
  },
  prefix: {
    color: theme.colors.textSecondary,
    marginRight: 4,
  },
  helperText: {
    color: theme.colors.textSecondary,
  },
  errorText: {
    color: theme.colors.error,
  },
  leftIconContainer: {
    position: 'absolute',
    left: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIconContainer: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
