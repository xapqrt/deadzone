import React from 'react';
import { Text, StyleSheet, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

interface BrandTitleProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  accessibilityLabel?: string;
}

const sizeMap = {
  sm: 18,
  md: 28,
  lg: 38,
  xl: 48,
};

export const BrandTitle: React.FC<BrandTitleProps> = ({ size = 'md', accessibilityLabel = 'DEADZONE brand title' }) => {
  const fontSize = sizeMap[size];
  return (
    <View style={styles.wrapper} accessibilityRole="header" accessibilityLabel={accessibilityLabel}>
      <MaskedView
        maskElement={
          <Text style={[styles.textBase, { fontSize }]}>DEADZONE</Text>
        }
      >
        <LinearGradient
          colors={[ '#FF3131', '#FF6A00', '#FFB800' ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={[styles.textBase, styles.gradientFill, { fontSize }]}>DEADZONE</Text>
        </LinearGradient>
      </MaskedView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBase: {
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
    color: '#000', // acts as mask color
  },
  gradientFill: {
    color: 'transparent',
  },
});

export default BrandTitle;
