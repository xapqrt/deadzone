import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageSourcePropType,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme, typography } from '../../utils/theme';
import { useResponsive } from '../../utils/responsive';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export interface AvatarProps {
  source?: ImageSourcePropType;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  variant?: 'circle' | 'rounded' | 'square';
  fallbackIcon?: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  onPress?: () => void;
  style?: ViewStyle;
  imageStyle?: ViewStyle;
  textStyle?: TextStyle;
  badge?: {
    color?: string;
    size?: 'sm' | 'md' | 'lg';
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  };
  status?: 'online' | 'offline' | 'away' | 'busy';
  loading?: boolean;
  disabled?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'md',
  variant = 'circle',
  fallbackIcon = 'user',
  backgroundColor,
  textColor,
  borderColor,
  borderWidth = 0,
  onPress,
  style,
  imageStyle,
  textStyle,
  badge,
  status,
  loading = false,
  disabled = false,
}) => {
  const { spacing } = useResponsive();
  const scale = useSharedValue(1);
  const [imageError, setImageError] = React.useState(false);

  const avatarSize = typeof size === 'number' ? size : getSizeValue(size);
  const borderRadius = getBorderRadius(variant, avatarSize);
  const isClickable = Boolean(onPress && !disabled);

  const handlePressIn = () => {
    if (isClickable) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (isClickable) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerStyle = [
    styles.container,
    {
      width: avatarSize,
      height: avatarSize,
      borderRadius,
      backgroundColor: backgroundColor || getDefaultBackgroundColor(name),
      borderColor: borderColor || theme.colors.border,
      borderWidth,
    },
    disabled && styles.disabled,
    style,
  ];

  const getInitials = () => {
    if (!name) return '';
    
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const renderContent = () => {
    // Show loading state
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Feather
            name="loader"
            size={avatarSize * 0.4}
            color={theme.colors.textMuted}
          />
        </View>
      );
    }

    // Show image if available and no error
    if (source && !imageError) {
      return (
        <Image
          source={source}
          style={[
            styles.image,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius,
            },
            imageStyle,
          ]}
          onError={() => setImageError(true)}
          resizeMode="cover"
        />
      );
    }

    // Show initials if name is available
    if (name) {
      const initials = getInitials();
      return (
        <Text
          style={[
            styles.initials,
            {
              fontSize: avatarSize * 0.4,
              color: textColor || getDefaultTextColor(name),
            },
            textStyle,
          ]}
        >
          {initials}
        </Text>
      );
    }

    // Show fallback icon
    return (
      <Feather
        name={fallbackIcon as any}
        size={avatarSize * 0.5}
        color={textColor || theme.colors.textMuted}
      />
    );
  };

  const AvatarContainer = isClickable ? AnimatedTouchableOpacity : Animated.View;
  const containerProps = isClickable ? {
    onPress,
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
    disabled,
    activeOpacity: 0.9,
    accessibilityRole: 'button' as const,
    accessibilityLabel: name || 'Avatar',
  } : {};

  return (
    <View style={styles.wrapper}>
      <AvatarContainer
        style={[containerStyle, isClickable && animatedStyle]}
        {...containerProps}
      >
        {renderContent()}

        {/* Status Indicator */}
        {status && (
          <View
            style={[
              styles.statusIndicator,
              {
                width: avatarSize * 0.25,
                height: avatarSize * 0.25,
                borderRadius: (avatarSize * 0.25) / 2,
                backgroundColor: getStatusColor(status),
                borderWidth: 2,
                borderColor: theme.colors.background,
                bottom: avatarSize * 0.05,
                right: avatarSize * 0.05,
              },
            ]}
          />
        )}
      </AvatarContainer>

      {/* Badge */}
      {badge && (
        <View
          style={[
            styles.badge,
            getBadgePositionStyle(badge.position || 'top-right', avatarSize),
            {
              backgroundColor: badge.color || theme.colors.primary,
              width: getBadgeSize(badge.size || 'md'),
              height: getBadgeSize(badge.size || 'md'),
              borderRadius: getBadgeSize(badge.size || 'md') / 2,
            },
          ]}
        />
      )}
    </View>
  );
};

// Avatar Group Component
export interface AvatarGroupProps {
  avatars: Array<{
    source?: ImageSourcePropType;
    name?: string;
    id: string;
  }>;
  size?: AvatarProps['size'];
  max?: number;
  spacing?: number;
  onPress?: (id: string) => void;
  onMorePress?: () => void;
  style?: ViewStyle;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  size = 'md',
  max = 3,
  spacing = -8,
  onPress,
  onMorePress,
  style,
}) => {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;
  const avatarSize = typeof size === 'number' ? size : getSizeValue(size);

  return (
    <View style={[styles.group, style]}>
      {visibleAvatars.map((avatar, index) => (
        <View
          key={avatar.id}
          style={[
            styles.groupAvatar,
            {
              marginLeft: index > 0 ? spacing : 0,
              zIndex: visibleAvatars.length - index,
            },
          ]}
        >
          <Avatar
            source={avatar.source}
            name={avatar.name}
            size={size}
            onPress={onPress ? () => onPress(avatar.id) : undefined}
            borderWidth={2}
            borderColor={theme.colors.background}
          />
        </View>
      ))}

      {remainingCount > 0 && (
        <View
          style={[
            styles.groupAvatar,
            {
              marginLeft: spacing,
              zIndex: 0,
            },
          ]}
        >
          <Avatar
            name={`+${remainingCount}`}
            size={size}
            backgroundColor={theme.colors.surfaceVariant}
            textColor={theme.colors.onSurfaceVariant}
            onPress={onMorePress}
            borderWidth={2}
            borderColor={theme.colors.background}
          />
        </View>
      )}
    </View>
  );
};

// Helper functions
const getSizeValue = (size: string) => {
  const sizes = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 56,
    '2xl': 64,
  };
  return sizes[size as keyof typeof sizes] || sizes.md;
};

const getBorderRadius = (variant: string, size: number) => {
  switch (variant) {
    case 'circle':
      return size / 2;
    case 'rounded':
      return size * 0.2;
    case 'square':
      return 0;
    default:
      return size / 2;
  }
};

const getBadgeSize = (size: string) => {
  const sizes = {
    sm: 8,
    md: 12,
    lg: 16,
  };
  return sizes[size as keyof typeof sizes] || sizes.md;
};

const getBadgePositionStyle = (position: string, avatarSize: number) => {
  const offset = avatarSize * 0.05;
  
  switch (position) {
    case 'top-right':
      return { top: offset, right: offset };
    case 'top-left':
      return { top: offset, left: offset };
    case 'bottom-right':
      return { bottom: offset, right: offset };
    case 'bottom-left':
      return { bottom: offset, left: offset };
    default:
      return { top: offset, right: offset };
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online':
      return theme.colors.success;
    case 'away':
      return '#F59E0B';
    case 'busy':
      return theme.colors.error;
    case 'offline':
      return theme.colors.textMuted;
    default:
      return theme.colors.textMuted;
  }
};

const getDefaultBackgroundColor = (name?: string) => {
  if (!name) return theme.colors.surfaceVariant;
  
  // Generate a consistent color based on the name
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

const getDefaultTextColor = (name?: string) => {
  // Return white or black based on background brightness
  // This is a simplified version - you might want to use a more sophisticated algorithm
  return '#FFFFFF';
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    // Image styles are applied dynamically
  },
  initials: {
    fontFamily: typography.fonts.bold,
    textAlign: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    position: 'absolute',
  },
  badge: {
    position: 'absolute',
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupAvatar: {
    // Position styles applied dynamically
  },
  disabled: {
    opacity: 0.6,
  },
});
