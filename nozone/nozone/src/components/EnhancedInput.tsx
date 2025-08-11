import React from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle, TextInputProps, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import { useResponsive } from '../utils/responsive';

// Type for Feather icon names
type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

export interface EnhancedInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  style?: ViewStyle;
  multiline?: boolean;
  numberOfLines?: number;
  prefix?: string;
  leftIcon?: FeatherIconName;
  rightIcon?: FeatherIconName;
  onRightIconPress?: () => void;
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
  ...textInputProps
}) => {
  const { spacing, fontSize } = useResponsive();

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[
        styles.inputContainer,
        error ? styles.inputError : null,
      ]}>
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Feather name={leftIcon} size={18} color={theme.colors.textSecondary} />
          </View>
        )}
        
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        
        <TextInput
          style={[
            styles.input,
            multiline ? { minHeight: 80 } : null,
            leftIcon ? { paddingLeft: 40 } : null,
            rightIcon ? { paddingRight: 40 } : null,
          ]}
          placeholderTextColor={theme.colors.textMuted}
          multiline={multiline}
          numberOfLines={numberOfLines}
          {...textInputProps}
        />
        
        {rightIcon && (
          <TouchableOpacity 
            style={styles.rightIconContainer}
            onPress={onRightIconPress}
          >
            <Feather name={rightIcon} size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      {(error || helperText) && (
        <Text style={[
          styles.helperText,
          error ? styles.errorText : null
        ]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: theme.colors.text,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.inputBackground,
    position: 'relative',
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    color: theme.colors.textSecondary,
  },
  errorText: {
    color: theme.colors.error,
  },
  prefix: {
    paddingLeft: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  leftIconContainer: {
    position: 'absolute',
    left: 12,
    top: 14,
    zIndex: 2,
  },
  rightIconContainer: {
    position: 'absolute',
    right: 12,
    top: 14,
    zIndex: 2,
  }
});
