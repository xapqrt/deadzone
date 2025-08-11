import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import { useResponsive } from '../../utils/responsive';

export interface EnhancedCardProps {
  title?: string;
  subtitle?: string;
  content?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  contentStyle?: TextStyle;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled' | 'gradient';
  icon?: keyof typeof Feather.glyphMap;
  iconColor?: string;
  iconSize?: number;
  iconPosition?: 'left' | 'right';
  onPress?: () => void;
  gradientColors?: string[];
  cornerRadius?: number;
  backgroundImage?: any;
  overlayColor?: string;
  overlayOpacity?: number;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
  borderColor?: string;
}

export const EnhancedCard: React.FC<EnhancedCardProps> = ({
  title,
  subtitle,
  content,
  children,
  style,
  titleStyle,
  subtitleStyle,
  contentStyle,
  variant = 'default',
  icon,
  iconColor,
  iconSize = 20,
  iconPosition = 'left',
  onPress,
  gradientColors = [theme.colors.primary, theme.colors.secondary],
  cornerRadius = 12,
  backgroundImage,
  overlayColor = 'rgba(0,0,0,0.3)',
  overlayOpacity = 0.3,
  shadow = 'md',
  bordered = false,
  borderColor,
}) => {
  const { spacing, fontSize, isSmall } = useResponsive();
  
  const cardStyle: ViewStyle = {
    borderRadius: cornerRadius,
    padding: spacing.lg,
    overflow: 'hidden',
    ...(variant === 'elevated' && getShadowStyle(shadow)),
    ...(variant === 'outlined' && {
      borderWidth: 1,
      borderColor: borderColor || theme.colors.border,
    }),
    ...(variant === 'filled' && {
      backgroundColor: theme.colors.primaryAlpha,
    }),
    ...(bordered && {
      borderWidth: 1,
      borderColor: borderColor || theme.colors.border,
    }),
  };
  
  const Container = onPress ? TouchableOpacity : View;
  
  const renderContent = () => (
    <>
      {(title || icon) && (
        <View style={[
          styles.header, 
          { marginBottom: subtitle || content ? spacing.sm : 0 }
        ]}>
          {icon && iconPosition === 'left' && (
            <Feather 
              name={icon} 
              size={iconSize} 
              color={iconColor || theme.colors.primary} 
              style={{ marginRight: spacing.sm }}
            />
          )}
          
          {title && (
            <Text style={[
              styles.title, 
              { fontSize: isSmall ? fontSize.lg : fontSize.xl },
              titleStyle
            ]}>
              {title}
            </Text>
          )}
          
          {icon && iconPosition === 'right' && (
            <Feather 
              name={icon} 
              size={iconSize} 
              color={iconColor || theme.colors.primary} 
              style={{ marginLeft: 'auto' }}
            />
          )}
        </View>
      )}
      
      {subtitle && (
        <Text style={[
          styles.subtitle, 
          { marginBottom: content ? spacing.sm : 0, fontSize: fontSize.sm },
          subtitleStyle
        ]}>
          {subtitle}
        </Text>
      )}
      
      {content && (
        <Text style={[
          styles.content, 
          { fontSize: fontSize.md },
          contentStyle
        ]}>
          {content}
        </Text>
      )}
      
      {children}
    </>
  );
  
  if (backgroundImage) {
    return (
      <ImageBackground
        source={backgroundImage}
        style={[cardStyle, style]}
        imageStyle={{ borderRadius: cornerRadius }}
      >
        <View style={[
          styles.overlay,
          { backgroundColor: overlayColor, opacity: overlayOpacity }
        ]} />
        {renderContent()}
      </ImageBackground>
    );
  }
  
  if (variant === 'gradient') {
    return (
      <Container style={[cardStyle, style]} onPress={onPress}>
        <LinearGradient
          colors={gradientColors}
          style={styles.gradientBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {renderContent()}
      </Container>
    );
  }
  
  return (
    <Container 
      style={[
        cardStyle, 
        variant === 'default' && { backgroundColor: theme.colors.card },
        style
      ]} 
      onPress={onPress}
    >
      {renderContent()}
    </Container>
  );
};

const getShadowStyle = (shadowSize: 'none' | 'sm' | 'md' | 'lg'): ViewStyle => {
  switch (shadowSize) {
    case 'sm':
      return {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
      };
    case 'md':
      return {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
      };
    case 'lg':
      return {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
      };
    default:
      return {};
  }
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: theme.colors.text,
    fontWeight: '600',
    flex: 1,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  content: {
    color: theme.colors.text,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
