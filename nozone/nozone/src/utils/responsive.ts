import { Dimensions, PixelRatio } from 'react-native';
import { useState, useEffect } from 'react';

// Enhanced device breakpoints with more granular control
export const breakpoints = {
  xs: { min: 320, max: 374 },      // Very small phones (iPhone SE, small Android)
  sm: { min: 375, max: 413 },      // Standard phones (iPhone 12, 13, 14)
  md: { min: 414, max: 479 },      // Large phones (iPhone 14 Plus, Pixel 7 Pro)
  lg: { min: 480, max: 767 },      // Small tablets / Large phones in landscape
  xl: { min: 768, max: 1023 },     // Tablets in portrait
  xxl: { min: 1024, max: 9999 },   // Tablets in landscape / Desktop
} as const;

export type DeviceSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

// Enhanced device size detection
export const getDeviceSize = (width: number): DeviceSize => {
  if (width <= breakpoints.xs.max) return 'xs';
  if (width <= breakpoints.sm.max) return 'sm';
  if (width <= breakpoints.md.max) return 'md';
  if (width <= breakpoints.lg.max) return 'lg';
  if (width <= breakpoints.xl.max) return 'xl';
  return 'xxl';
};

// Screen type detection
export const getScreenType = (width: number, height: number) => {
  const aspectRatio = width / height;
  const isLandscape = width > height;
  const size = getDeviceSize(width);
  
  return {
    isPhone: size === 'xs' || size === 'sm' || size === 'md',
    isTablet: size === 'lg' || size === 'xl' || size === 'xxl',
    isSmallPhone: size === 'xs',
    isLargePhone: size === 'md',
    isLandscape,
    isPortrait: !isLandscape,
    aspectRatio,
    isWideScreen: aspectRatio > 2.0, // Very long screens like iPhone 14 Pro Max
    isTallScreen: aspectRatio < 0.6,  // Very tall screens in portrait
  };
};

// Base spacing values
export const spacing = {
  xs: 4,   // 4dp
  sm: 8,   // 8dp  
  md: 16,  // 16dp (base)
  lg: 24,  // 24dp
  xl: 32,  // 32dp
  xxl: 48, // 48dp
} as const;

// Responsive scaling functions
const getScale = (deviceSize: DeviceSize) => {
  const scales = {
    xs: 0.85,    // Smaller scale for very small screens
    sm: 1.0,     // Base scale
    md: 1.1,     // Slightly larger for bigger phones
    lg: 1.2,     // Larger for small tablets
    xl: 1.4,     // Much larger for tablets
    xxl: 1.6,    // Largest for big tablets/desktop
  };
  return scales[deviceSize];
};

// Enhanced responsive spacing
const createResponsiveSpacing = (deviceSize: DeviceSize, screenType: any) => {
  const scale = getScale(deviceSize);
  const baseSpacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  };

  // Additional adjustment for very small screens
  const smallScreenAdjustment = screenType.isSmallPhone ? 0.8 : 1;
  
  return Object.fromEntries(
    Object.entries(baseSpacing).map(([key, value]) => [
      key, 
      Math.round(value * scale * smallScreenAdjustment)
    ])
  );
};

// Enhanced responsive font sizes
const createResponsiveFontSizes = (deviceSize: DeviceSize, screenType: any) => {
  const scale = getScale(deviceSize);
  const baseFontSizes = {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    xxxxl: 34,
  };

  // Smaller fonts for very small screens
  const smallScreenAdjustment = screenType.isSmallPhone ? 0.9 : 1;
  
  return Object.fromEntries(
    Object.entries(baseFontSizes).map(([key, value]) => [
      key, 
      Math.round(PixelRatio.roundToNearestPixel(value * scale * smallScreenAdjustment))
    ])
  );
};

// Enhanced layout dimensions
const createLayoutDimensions = (width: number, height: number, deviceSize: DeviceSize, screenType: any) => {
  const padding = screenType.isSmallPhone ? 12 : 16;
  const cardMargin = screenType.isSmallPhone ? 8 : 16;
  
  return {
    // Container widths
    fullWidth: width,
    contentWidth: width - (padding * 2),
    cardWidth: width - (cardMargin * 2),
    
    // Modal and sheet dimensions
    modalWidth: Math.min(width * 0.9, screenType.isTablet ? 500 : 400),
    sheetHeight: height * (screenType.isSmallPhone ? 0.85 : 0.75),
    
    // Navigation
    headerHeight: screenType.isSmallPhone ? 50 : 60,
    tabBarHeight: screenType.isSmallPhone ? 65 : 80,
    
    // Grid columns
    gridColumns: screenType.isSmallPhone ? 1 : screenType.isPhone ? 2 : screenType.isTablet ? 3 : 4,
    
    // Minimum touch targets
    minTouchTarget: 44,
    buttonHeight: screenType.isSmallPhone ? 40 : 48,
    inputHeight: screenType.isSmallPhone ? 42 : 48,
  };
};

// Hook to get current device information and responsive utilities
export const useResponsive = () => {
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  const deviceSize = getDeviceSize(dimensions.width);
  const screenType = getScreenType(dimensions.width, dimensions.height);
  const spacing = createResponsiveSpacing(deviceSize, screenType);
  const fontSize = createResponsiveFontSizes(deviceSize, screenType);
  const layout = createLayoutDimensions(dimensions.width, dimensions.height, deviceSize, screenType);

  return {
    // Device info
    ...dimensions,
    deviceSize,
    ...screenType,
    
    // Responsive values
    spacing,
    fontSize,
    layout,
    
    // Utility functions
    scale: getScale(deviceSize),
    
    // Helper functions
    wp: (percentage: number) => (dimensions.width * percentage) / 100,
    hp: (percentage: number) => (dimensions.height * percentage) / 100,
    
    // Breakpoint checks
    isXs: deviceSize === 'xs',
    isSm: deviceSize === 'sm',
    isMd: deviceSize === 'md',
    isLg: deviceSize === 'lg',
    isXl: deviceSize === 'xl',
    isXxl: deviceSize === 'xxl',
    
    // Legacy compatibility
    isSmall: deviceSize === 'xs' || deviceSize === 'sm',
    isMedium: deviceSize === 'md',
    isLarge: deviceSize === 'lg' || deviceSize === 'xl' || deviceSize === 'xxl',
    
    // Legacy device object - for backward compatibility
    device: {
      width: dimensions.width,
      height: dimensions.height,
      screenSize: deviceSize,
      isSmall: deviceSize === 'xs' || deviceSize === 'sm',
      isMedium: deviceSize === 'md',
      isLarge: deviceSize === 'lg' || deviceSize === 'xl' || deviceSize === 'xxl',
    },
    
    // Legacy touchTarget - for backward compatibility
    touchTarget: {
      minSize: 44,
      minHeight: 44,
      minWidth: 44,
    },
  };
};

// Responsive spacing system
export const responsiveSpacing = {
  // Base spacing unit
  unit: 4,
  
  // Responsive multipliers by device size
  multipliers: {
    xs: 0.85,     // Very small phones
    sm: 0.95,     // Standard phones
    md: 1.0,      // Base size (large phones)
    lg: 1.1,      // Small tablets / large phones in landscape
    xl: 1.2,      // Tablets in portrait
    xxl: 1.3,     // Tablets in landscape / Desktop
  },
  
  // Get responsive spacing value
  get: (size: keyof typeof spacing, deviceSize: DeviceSize) => {
    const baseValue = spacing[size];
    const multiplier = responsiveSpacing.multipliers[deviceSize];
    return Math.round(baseValue * multiplier);
  },
};

// Responsive typography system
export const responsiveTypography = {
  // Font size scales by device size
  scales: {
    xs: 0.85,     // Very small phones
    sm: 0.95,     // Standard phones
    md: 1.0,      // Base size (large phones)
    lg: 1.1,      // Small tablets / large phones in landscape
    xl: 1.2,      // Tablets in portrait
    xxl: 1.3,     // Tablets in landscape / Desktop
  },
  
  // Get responsive font size
  getFontSize: (baseSize: number, deviceSize: DeviceSize) => {
    const scale = responsiveTypography.scales[deviceSize];
    return Math.round(baseSize * scale);
  },
  
  // Minimum touch target sizes (accessibility)
  minTouchTarget: {
    width: 44,
    height: 44,
  },
};

// Responsive padding/margin helpers
export const responsivePadding = {
  // Container padding by device size
  container: {
    xs: { horizontal: 8, vertical: 6 },     // Very small phones
    sm: { horizontal: 12, vertical: 8 },    // Standard phones
    md: { horizontal: 16, vertical: 12 },   // Base size (large phones)
    lg: { horizontal: 20, vertical: 14 },   // Small tablets
    xl: { horizontal: 24, vertical: 16 },   // Tablets in portrait
    xxl: { horizontal: 32, vertical: 20 },  // Tablets in landscape / Desktop
  },
  
  // Button padding by device size
  button: {
    xs: { horizontal: 8, vertical: 6 },
    sm: { horizontal: 12, vertical: 8 },
    md: { horizontal: 16, vertical: 12 },
    lg: { horizontal: 20, vertical: 14 },
    xl: { horizontal: 24, vertical: 16 },
    xxl: { horizontal: 28, vertical: 18 },
  },
  
  // Input padding by device size
  input: {
    xs: { horizontal: 8, vertical: 8 },
    sm: { horizontal: 12, vertical: 10 },
    md: { horizontal: 16, vertical: 12 },
    lg: { horizontal: 18, vertical: 14 },
    xl: { horizontal: 20, vertical: 16 },
    xxl: { horizontal: 24, vertical: 18 },
  },
};

// Layout utilities
export const layout = {
  // Safe area insets
  safeArea: {
    top: 44,    // Status bar height
    bottom: 34, // Home indicator height (iPhone X+)
  },
  
  // Message bubble constraints
  messageBubble: {
    maxWidthPercent: 0.85, // 85% of screen width
    minWidth: 60,
    borderRadius: {
      xs: 10,
      sm: 12,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
    },
  },
  
  // Header heights
  header: {
    xs: 48,
    sm: 52,
    md: 56,
    lg: 60,
    xl: 64,
    xxl: 72,
  },
};

// Responsive component styles generator
export const createResponsiveStyles = (deviceSize: DeviceSize) => ({
  // Container styles
  container: {
    paddingHorizontal: responsivePadding.container[deviceSize].horizontal,
    paddingVertical: responsivePadding.container[deviceSize].vertical,
  },
  
  // Button styles
  button: {
    paddingHorizontal: responsivePadding.button[deviceSize].horizontal,
    paddingVertical: responsivePadding.button[deviceSize].vertical,
    minHeight: responsiveTypography.minTouchTarget.height,
    minWidth: responsiveTypography.minTouchTarget.width,
  },
  
  // Input styles
  input: {
    paddingHorizontal: responsivePadding.input[deviceSize].horizontal,
    paddingVertical: responsivePadding.input[deviceSize].vertical,
    minHeight: responsiveTypography.minTouchTarget.height,
  },
  
  // Header styles
  header: {
    height: layout.header[deviceSize],
    paddingHorizontal: responsivePadding.container[deviceSize].horizontal,
  },
  
  // Typography styles
  typography: {
    display: {
      fontSize: responsiveTypography.getFontSize(32, deviceSize),
    },
    h1: {
      fontSize: responsiveTypography.getFontSize(26, deviceSize),
    },
    h2: {
      fontSize: responsiveTypography.getFontSize(22, deviceSize),
    },
    h3: {
      fontSize: responsiveTypography.getFontSize(20, deviceSize),
    },
    body: {
      fontSize: responsiveTypography.getFontSize(16, deviceSize),
    },
    caption: {
      fontSize: responsiveTypography.getFontSize(14, deviceSize),
    },
    small: {
      fontSize: responsiveTypography.getFontSize(12, deviceSize),
    },
  },
  
  // Message bubble styles
  messageBubble: {
    borderRadius: layout.messageBubble.borderRadius[deviceSize],
    paddingHorizontal: responsivePadding.container[deviceSize].horizontal,
    paddingVertical: responsivePadding.container[deviceSize].vertical * 0.75,
  },
});

// Hook to get responsive styles
export const useResponsiveStyles = () => {
  const { deviceSize } = useResponsive();
  return createResponsiveStyles(deviceSize);
};

// Accessibility helpers
export const accessibility = {
  // Minimum contrast ratios
  contrast: {
    normal: 4.5,  // WCAG AA standard
    large: 3.0,   // For text 18sp+ or 14sp+ bold
  },
  
  // Touch target guidelines
  touchTarget: {
    minimum: 44,  // Apple/Material minimum
    recommended: 48, // Better for accessibility
  },
  
  // Focus indicators
  focus: {
    width: 2,
    color: '#3B82F6', // Primary blue
    offset: 2,
  },
};

// Animation timing for different device performance
export const responsiveAnimations = {
  // Duration multipliers based on device performance
  durations: {
    xs: 0.7,    // Fastest on smallest devices
    sm: 0.8,    // Fast on small devices
    md: 1.0,    // Standard timing
    lg: 1.05,   // Slightly longer
    xl: 1.1,    // Longer on tablets
    xxl: 1.15,  // Longest on large devices
  },
  
  // Spring configurations by device
  springs: {
    xs: { damping: 22, stiffness: 230 },  // Most damped
    sm: { damping: 20, stiffness: 250 },  // More damped
    md: { damping: 18, stiffness: 300 },  // Balanced
    lg: { damping: 16, stiffness: 320 },  // More bouncy
    xl: { damping: 15, stiffness: 350 },  // Bouncier
    xxl: { damping: 14, stiffness: 380 }, // Most bouncy
  },
  
  // Stagger delays
  stagger: {
    xs: 40,    // Fastest reveals
    sm: 50,    // Faster reveals
    md: 70,    // Standard
    lg: 100,   // More dramatic
    xl: 130,   // Most dramatic
    xxl: 150,  // Longest for largest screens
  },
};
