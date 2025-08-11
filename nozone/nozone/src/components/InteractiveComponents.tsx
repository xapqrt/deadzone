import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  FadeIn,
  SlideInUp,
  BounceIn,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { theme, typography } from '../utils/theme';
import { useResponsive } from '../utils/responsive';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FloatingActionButtonProps {
  icon: string;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  label?: string;
  disabled?: boolean;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    icon: string;
    color: string;
    label: string;
  };
  rightAction?: {
    icon: string;
    color: string;
    label: string;
  };
  swipeThreshold?: number;
}

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
  showFilter?: boolean;
  onFilter?: () => void;
  autoFocus?: boolean;
}

interface TabBarProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: string;
    badge?: number;
  }>;
  activeTab: string;
  onTabPress: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
}

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number;
  title?: string;
  showHandle?: boolean;
}

interface PullToRefreshProps {
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
  pullDistance?: number;
  refreshThreshold?: number;
}

// Floating Action Button Component
export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onPress,
  size = 'medium',
  color = theme.colors.primary,
  position = 'bottom-right',
  label,
  disabled = false,
}) => {
  const scale = useSharedValue(1);
  const { spacing } = useResponsive();

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { size: 48, iconSize: 20 };
      case 'large':
        return { size: 64, iconSize: 28 };
      default:
        return { size: 56, iconSize: 24 };
    }
  };

  const getPositionStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      bottom: spacing.xl,
    };

    switch (position) {
      case 'bottom-left':
        return { ...baseStyle, left: spacing.lg };
      case 'bottom-center':
        return { ...baseStyle, alignSelf: 'center' as const };
      default:
        return { ...baseStyle, right: spacing.lg };
    }
  };

  const { size: buttonSize, iconSize } = getSizeConfig();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View
      entering={BounceIn.duration(600)}
      style={[
        animatedStyle,
        getPositionStyle(),
        styles.fabContainer,
      ]}
    >
      {label && (
        <View style={[
          styles.fabLabel,
          { marginRight: spacing.sm }
        ]}>
          <Text style={styles.fabLabelText}>{label}</Text>
        </View>
      )}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            backgroundColor: disabled ? theme.colors.surfaceVariant : color,
          }
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Feather 
          name={icon as any} 
          size={iconSize} 
          color={disabled ? theme.colors.textMuted : theme.colors.onPrimary} 
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Swipeable Card Component
export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  swipeThreshold = 80,
}) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const leftActionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, swipeThreshold], [0, 1]),
  }));

  const rightActionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-swipeThreshold, 0], [1, 0]),
  }));

  return (
    <View style={styles.swipeableContainer}>
      {leftAction && (
        <Animated.View style={[styles.swipeAction, styles.leftAction, leftActionStyle]}>
          <View style={[styles.swipeActionContent, { backgroundColor: leftAction.color }]}>
            <Feather name={leftAction.icon as any} size={24} color="white" />
            <Text style={styles.swipeActionText}>{leftAction.label}</Text>
          </View>
        </Animated.View>
      )}
      
      {rightAction && (
        <Animated.View style={[styles.swipeAction, styles.rightAction, rightActionStyle]}>
          <View style={[styles.swipeActionContent, { backgroundColor: rightAction.color }]}>
            <Feather name={rightAction.icon as any} size={24} color="white" />
            <Text style={styles.swipeActionText}>{rightAction.label}</Text>
          </View>
        </Animated.View>
      )}
      
      <Animated.View style={[styles.swipeableCard, animatedStyle]}>
        {children}
      </Animated.View>
    </View>
  );
};

// Enhanced Search Bar Component
export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  onFocus,
  onBlur,
  onClear,
  showFilter = false,
  onFilter,
  autoFocus = false,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const animatedWidth = useSharedValue(0);
  const { fontSize, spacing } = useResponsive();

  const animatedStyle = useAnimatedStyle(() => ({
    width: animatedWidth.value,
  }));

  const handleFocus = () => {
    setIsFocused(true);
    animatedWidth.value = withSpring(screenWidth - 32);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <Animated.View 
      entering={SlideInUp.duration(400)}
      style={[
        styles.searchContainer,
        {
          paddingHorizontal: spacing.md,
          marginVertical: spacing.sm,
        }
      ]}
    >
      <View style={[
        styles.searchBar,
        {
          borderColor: isFocused ? theme.colors.primary : theme.colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }
      ]}>
        <Feather 
          name="search" 
          size={20} 
          color={isFocused ? theme.colors.primary : theme.colors.textMuted} 
        />
        
        <TextInput
          style={[
            styles.searchInput,
            {
              fontSize: fontSize.md,
              marginLeft: spacing.sm,
              color: theme.colors.onBackground,
            }
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoFocus={autoFocus}
        />
        
        {value.length > 0 && (
          <TouchableOpacity
            style={[styles.searchClear, { padding: spacing.xs }]}
            onPress={handleClear}
          >
            <Feather name="x" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
        
        {showFilter && (
          <TouchableOpacity
            style={[styles.searchFilter, { marginLeft: spacing.sm }]}
            onPress={onFilter}
          >
            <Feather name="filter" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

// Tab Bar Component
export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
  variant = 'default',
}) => {
  const { fontSize, spacing } = useResponsive();

  const getTabStyle = (isActive: boolean) => {
    switch (variant) {
      case 'pills':
        return {
          backgroundColor: isActive ? theme.colors.primary : 'transparent',
          borderRadius: theme.borderRadius.lg,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        };
      case 'underline':
        return {
          borderBottomWidth: isActive ? 2 : 0,
          borderBottomColor: theme.colors.primary,
          paddingVertical: spacing.md,
        };
      default:
        return {
          backgroundColor: isActive ? theme.colors.primaryAlpha : 'transparent',
          borderRadius: theme.borderRadius.md,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.sm,
        };
    }
  };

  const getTextColor = (isActive: boolean) => {
    if (variant === 'pills' && isActive) {
      return theme.colors.onPrimary;
    }
    return isActive ? theme.colors.primary : theme.colors.textSecondary;
  };

  return (
    <View style={[
      styles.tabBar,
      {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
      }
    ]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScrollContent}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                getTabStyle(isActive),
                { marginRight: spacing.sm }
              ]}
              onPress={() => onTabPress(tab.id)}
            >
              <View style={styles.tabContent}>
                {tab.icon && (
                  <Feather 
                    name={tab.icon as any} 
                    size={16} 
                    color={getTextColor(isActive)} 
                  />
                )}
                <Text style={[
                  styles.tabText,
                  {
                    fontSize: fontSize.sm,
                    color: getTextColor(isActive),
                    marginLeft: tab.icon ? spacing.xs : 0,
                  }
                ]}>
                  {tab.label}
                </Text>
                {tab.badge && tab.badge > 0 && (
                  <View style={[
                    styles.tabBadge,
                    { marginLeft: spacing.xs }
                  ]}>
                    <Text style={[
                      styles.tabBadgeText,
                      { fontSize: fontSize.xs }
                    ]}>
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

// Bottom Sheet Component
export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  children,
  height = screenHeight * 0.6,
  title,
  showHandle = true,
}) => {
  const translateY = useSharedValue(height);
  const { fontSize, spacing } = useResponsive();

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0);
    } else {
      translateY.value = withTiming(height);
    }
  }, [visible, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.bottomSheetOverlay}>
        <TouchableOpacity
          style={styles.bottomSheetBackdrop}
          onPress={onClose}
          activeOpacity={1}
        />
        <Animated.View style={[
          styles.bottomSheet,
          animatedStyle,
          { height, paddingHorizontal: spacing.md }
        ]}>
          {showHandle && (
            <View style={[styles.bottomSheetHandle, { marginBottom: spacing.md }]} />
          )}
          
          {title && (
            <View style={[styles.bottomSheetHeader, { marginBottom: spacing.lg }]}>
              <Text style={[
                styles.bottomSheetTitle,
                { fontSize: fontSize.lg }
              ]}>
                {title}
              </Text>
              <TouchableOpacity
                style={[styles.bottomSheetClose, { padding: spacing.xs }]}
                onPress={onClose}
              >
                <Feather name="x" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          
          <ScrollView 
            style={styles.bottomSheetContent}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Pull to Refresh Component
export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  refreshing,
  onRefresh,
  children,
  pullDistance = 80,
  refreshThreshold = 60,
}) => {
  const pullValue = useSharedValue(0);
  const refreshOpacity = useSharedValue(0);

  const refreshIndicatorStyle = useAnimatedStyle(() => ({
    opacity: refreshOpacity.value,
    transform: [
      { 
        rotate: `${interpolate(pullValue.value, [0, refreshThreshold], [0, 360])}deg` 
      }
    ],
  }));

  React.useEffect(() => {
    if (refreshing) {
      refreshOpacity.value = withTiming(1);
    } else {
      refreshOpacity.value = withTiming(0);
      pullValue.value = withSpring(0);
    }
  }, [refreshing]);

  return (
    <View style={styles.pullToRefreshContainer}>
      <Animated.View style={[
        styles.refreshIndicator,
        refreshIndicatorStyle,
      ]}>
        <Feather 
          name="refresh-cw" 
          size={24} 
          color={theme.colors.primary} 
        />
      </Animated.View>
      
      <ScrollView
        style={styles.pullToRefreshScroll}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {children}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Floating Action Button Styles
  fabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
  },
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
  fabLabel: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  fabLabelText: {
    fontSize: 14,
    fontFamily: typography.fonts.medium,
    color: theme.colors.onSurface,
  },

  // Swipeable Card Styles
  swipeableContainer: {
    position: 'relative',
  },
  swipeableCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  swipeAction: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftAction: {
    left: 0,
  },
  rightAction: {
    right: 0,
  },
  swipeActionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  swipeActionText: {
    fontSize: 12,
    fontFamily: typography.fonts.medium,
    color: 'white',
    marginTop: 4,
  },

  // Search Bar Styles
  searchContainer: {
    width: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fonts.regular,
  },
  searchClear: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchFilter: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xs,
  },

  // Tab Bar Styles
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabScrollContent: {
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabText: {
    fontFamily: typography.fonts.medium,
  },
  tabBadge: {
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontFamily: typography.fonts.bold,
    color: 'white',
  },

  // Bottom Sheet Styles
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetBackdrop: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingTop: theme.spacing.md,
    ...theme.shadows.xl,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 2,
    alignSelf: 'center',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomSheetTitle: {
    fontFamily: typography.fonts.bold,
    color: theme.colors.onSurface,
  },
  bottomSheetClose: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetContent: {
    flex: 1,
  },

  // Pull to Refresh Styles
  pullToRefreshContainer: {
    flex: 1,
    position: 'relative',
  },
  refreshIndicator: {
    position: 'absolute',
    top: -40,
    left: '50%',
    marginLeft: -12,
    zIndex: 1000,
  },
  pullToRefreshScroll: {
    flex: 1,
  },
});
