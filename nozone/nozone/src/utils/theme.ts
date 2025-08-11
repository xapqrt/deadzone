// Base interface (implicit) so we don't lock mode to 'light'
export const lightTheme = {
  colors: {
    // Calm theme light colors
    background: '#F9FAFB',
    backgroundSecondary: '#F3F4F6',
    surface: '#FFFFFF',
    surfaceVariant: '#F3F4F6',
    card: '#FFFFFF',
    cardSecondary: 'rgba(255, 255, 255, 0.8)',
    primary: '#3B82F6',
    primaryVariant: '#2563EB',
    secondary: '#6366F1',
    secondaryVariant: '#4F46E5',
    
    // Text colors
    text: '#111827',
    onBackground: '#111827',
    onSurface: '#111827',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onError: '#FFFFFF',
    onSurfaceVariant: '#374151',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    muted: '#6B7280',
    textMuted: '#9CA3AF',
    
    // Status colors
    success: '#10B981', // Green ✅
    warning: '#F59E0B', // Yellow 🕒
    error: '#EF4444', // Red ❌
    info: '#3B82F6',
    
    // Message status colors
    pending: '#F59E0B',
    sent: '#10B981',
    failed: '#EF4444',
    
    // Border and divider
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    outline: '#D1D5DB',
    divider: '#F3F4F6',
    
    // Input colors
    inputBackground: '#FFFFFF',
    inputBorder: '#D1D5DB',
    inputFocused: '#3B82F6',
    
  // (removed duplicate text hierarchy keys)
    
    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
    
    // Shadow colors for calm theme
    shadowLight: 'rgba(0, 0, 0, 0.05)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    
    // Transparent variants
    primaryAlpha: 'rgba(59, 130, 246, 0.1)',
    successAlpha: 'rgba(16, 185, 129, 0.1)',
    warningAlpha: 'rgba(245, 158, 11, 0.1)',
    errorAlpha: 'rgba(239, 68, 68, 0.1)',
    infoAlpha: 'rgba(59, 130, 246, 0.1)',
  },
  
  fonts: {
    regular: 'Inter',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
    light: 'Inter-Light',
    mono: 'Courier New',
  },
  
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  lineHeights: {
    xs: 16,      // 12 * 1.33
    sm: 18,      // 14 * 1.29
    md: 22,      // 16 * 1.38
    lg: 25,      // 18 * 1.39
    xl: 28,      // 20 * 1.40
    xxl: 32,     // 24 * 1.33
    xxxl: 42,    // 32 * 1.31
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 50,
  },
  
  shadows: {
    // Calm theme with subtle shadows
    xs: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 0.5,
      },
      shadowOpacity: 0.03,
      shadowRadius: 1,
      elevation: 1,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  
  animations: {
    fast: 160,
    medium: 260,
    slow: 420,
  },
  mode: 'light',
};

// Dark theme overriding only what differs for a pleasant contrast (calm dark)
export const darkTheme: typeof lightTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    background: '#0F1115',
    backgroundSecondary: '#161A20',
    surface: '#1D232B',
    surfaceVariant: '#222A33',
    card: '#1D232B',
    cardSecondary: 'rgba(255,255,255,0.05)',
    primary: '#3B82F6',
    primaryVariant: '#1E3A8A',
    secondary: '#6366F1',
    secondaryVariant: '#4338CA',
    text: '#F3F4F6',
    onBackground: '#F3F4F6',
    onSurface: '#F9FAFB',
    onSurfaceVariant: '#CBD5E1',
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    muted: '#64748B',
    textMuted: '#64748B',
    border: '#2A333D',
    borderLight: '#1E252C',
    outline: '#33404D',
    divider: '#1E252C',
    inputBackground: '#1D232B',
    inputBorder: '#33404D',
    inputFocused: '#3B82F6',
    shadowLight: 'rgba(0,0,0,0.4)',
    shadow: 'rgba(0,0,0,0.6)',
    primaryAlpha: 'rgba(59,130,246,0.15)',
    successAlpha: 'rgba(16,185,129,0.15)',
    warningAlpha: 'rgba(245,158,11,0.15)',
    errorAlpha: 'rgba(239,68,68,0.15)',
    infoAlpha: 'rgba(59,130,246,0.15)',
  },
  mode: 'dark',
};

export type Theme = typeof lightTheme & { mode: 'light' | 'dark' };

// Typography helper object that matches the theme structure
export const typography = {
  fonts: lightTheme.fonts,
  fontSizes: lightTheme.fontSizes,
  lineHeights: lightTheme.lineHeights,
};

export type Typography = typeof typography;

// Backwards compatibility: existing imports expect `theme`
export const theme = lightTheme;

export const buildTheme = (mode: 'light' | 'dark') => (mode === 'dark' ? darkTheme : lightTheme);
