import React from 'react';
import {
  View,
  ScrollView,
  ViewStyle,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { theme } from '../../utils/theme';
import { useResponsive } from '../../utils/responsive';

export interface LayoutProps {
  children: React.ReactNode;
  variant?: 'screen' | 'container' | 'section' | 'card' | 'inline';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  margin?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  direction?: 'row' | 'column';
  align?: 'flex-start' | 'flex-end' | 'center' | 'stretch';
  justify?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  wrap?: boolean;
  scrollable?: boolean;
  safe?: boolean;
  backgroundColor?: string;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  keyboardAvoiding?: boolean;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  variant = 'container',
  padding = 'md',
  margin = 'none',
  gap = 'none',
  direction = 'column',
  align = 'stretch',
  justify = 'flex-start',
  wrap = false,
  scrollable = false,
  safe = false,
  backgroundColor,
  style,
  contentContainerStyle,
  keyboardAvoiding = false,
  showsVerticalScrollIndicator = true,
  showsHorizontalScrollIndicator = true,
}) => {
  const { spacing } = useResponsive();

  const baseStyles = [
    styles.base,
    getVariantStyles(variant),
    getPaddingStyles(padding, spacing),
    getMarginStyles(margin, spacing),
    getGapStyles(gap, spacing, direction),
    {
      flexDirection: direction,
      alignItems: align,
      justifyContent: justify,
      flexWrap: wrap ? 'wrap' : 'nowrap',
      backgroundColor: backgroundColor || getVariantBackgroundColor(variant),
    },
    style,
  ];

  const content = (
    <>
      {children}
    </>
  );

  // Handle keyboard avoiding
  const KeyboardWrapper = keyboardAvoiding ? KeyboardAvoidingView : React.Fragment;
  const keyboardProps = keyboardAvoiding ? {
    behavior: Platform.OS === 'ios' ? 'padding' as const : 'height' as const,
    style: { flex: 1 },
  } : {};

  // Handle scrollable content
  if (scrollable) {
    const ScrollWrapper = safe ? SafeAreaView : React.Fragment;
    const safeProps = safe ? { style: { flex: 1, backgroundColor: backgroundColor || getVariantBackgroundColor(variant) } } : {};

    return (
      <ScrollWrapper {...safeProps}>
        <KeyboardWrapper {...keyboardProps}>
          <ScrollView
            style={[baseStyles, { flex: 1 }]}
            contentContainerStyle={[
              direction === 'column' && { flexGrow: 1 },
              contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={showsVerticalScrollIndicator}
            showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
            keyboardShouldPersistTaps="handled"
          >
            {content}
          </ScrollView>
        </KeyboardWrapper>
      </ScrollWrapper>
    );
  }

  // Handle safe area
  if (safe) {
    return (
      <SafeAreaView style={[baseStyles, { flex: 1 }]}>
        <KeyboardWrapper {...keyboardProps}>
          <View style={[{ flex: 1 }, contentContainerStyle]}>
            {content}
          </View>
        </KeyboardWrapper>
      </SafeAreaView>
    );
  }

  // Default view
  return (
    <KeyboardWrapper {...keyboardProps}>
      <View style={baseStyles}>
        {content}
      </View>
    </KeyboardWrapper>
  );
};

// Spacer component for consistent spacing
export interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  direction?: 'horizontal' | 'vertical';
}

export const Spacer: React.FC<SpacerProps> = ({
  size = 'md',
  direction = 'vertical',
}) => {
  const { spacing } = useResponsive();
  
  const spacingValue = typeof size === 'number' ? size : spacing[size];
  
  return (
    <View
      style={{
        width: direction === 'horizontal' ? spacingValue : undefined,
        height: direction === 'vertical' ? spacingValue : undefined,
      }}
    />
  );
};

// Divider component
export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  thickness?: number;
  color?: string;
  style?: ViewStyle;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  thickness = 1,
  color = theme.colors.border,
  style,
}) => {
  return (
    <View
      style={[
        {
          backgroundColor: color,
          ...(orientation === 'horizontal'
            ? { height: thickness, width: '100%' }
            : { width: thickness, height: '100%' }),
        },
        style,
      ]}
    />
  );
};

// Center component for easy centering
export interface CenterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Center: React.FC<CenterProps> = ({ children, style }) => {
  return (
    <View style={[styles.center, style]}>
      {children}
    </View>
  );
};

// Stack component for vertical layouts
export interface StackProps {
  children: React.ReactNode;
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'flex-start' | 'flex-end' | 'center' | 'stretch';
  style?: ViewStyle;
}

export const Stack: React.FC<StackProps> = ({
  children,
  spacing = 'md',
  align = 'stretch',
  style,
}) => {
  return (
    <Layout
      direction="column"
      gap={spacing}
      align={align}
      style={style}
    >
      {children}
    </Layout>
  );
};

// Row component for horizontal layouts
export interface RowProps {
  children: React.ReactNode;
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'flex-start' | 'flex-end' | 'center' | 'stretch';
  justify?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  wrap?: boolean;
  style?: ViewStyle;
}

export const Row: React.FC<RowProps> = ({
  children,
  spacing = 'md',
  align = 'center',
  justify = 'flex-start',
  wrap = false,
  style,
}) => {
  return (
    <Layout
      direction="row"
      gap={spacing}
      align={align}
      justify={justify}
      wrap={wrap}
      style={style}
    >
      {children}
    </Layout>
  );
};

// Helper functions
const getVariantStyles = (variant: string) => {
  return {
    screen: {
      flex: 1,
    },
    container: {
      // No default styles
    },
    section: {
      marginVertical: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.sm,
    },
    inline: {
      // No default styles
    },
  }[variant] || {};
};

const getVariantBackgroundColor = (variant: string) => {
  return {
    screen: theme.colors.background,
    container: 'transparent',
    section: 'transparent',
    card: theme.colors.surface,
    inline: 'transparent',
  }[variant] || 'transparent';
};

const getPaddingStyles = (padding: string, spacing: any) => {
  if (padding === 'none') return {};
  
  const value = spacing[padding] || spacing.md;
  return { padding: value };
};

const getMarginStyles = (margin: string, spacing: any) => {
  if (margin === 'none') return {};
  
  const value = spacing[margin] || spacing.md;
  return { margin: value };
};

const getGapStyles = (gap: string, spacing: any, direction: string) => {
  if (gap === 'none') return {};
  
  const value = spacing[gap] || spacing.md;
  
  // Use gap property if supported, otherwise use margin
  if (Platform.OS === 'web') {
    return { gap: value };
  }
  
  // For React Native, we'll handle gap through margin in children
  // This is a simplified approach - in practice, you might want to use
  // a more sophisticated solution
  return {};
};

const styles = StyleSheet.create({
  base: {
    // Base styles for all layouts
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
