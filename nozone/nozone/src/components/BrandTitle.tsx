import React from 'react';
import { Text, StyleSheet, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface BrandTitleProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  accessibilityLabel?: string;
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 28,
  xl: 32,
};

export const BrandTitle: React.FC<BrandTitleProps> = ({ size = 'md', accessibilityLabel = 'DEADZONE brand title' }) => {
  const fontSize = sizeMap[size];
  
  // Fallback version without MaskedView to prevent crashes
  return (
    <View style={styles.wrapper} accessibilityRole="header" accessibilityLabel={accessibilityLabel}>
      <LinearGradient
        colors={[ '#FF3131', '#FF6A00', '#FFB800' ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientBackground}
      >
        <Text style={[styles.textBase, styles.gradientText, { fontSize }]}>DEADZONE</Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientBackground: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  textBase: {
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  gradientText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default BrandTitle;
