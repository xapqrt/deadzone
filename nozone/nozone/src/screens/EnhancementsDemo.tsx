import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { theme, typography } from '../utils/theme';
import { useResponsive } from '../utils/responsive';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/ui/Card';
import { EnhancedInput } from '../components/EnhancedInput';
import { BackButton } from '../components/BackButton';
import { BrandTitle } from '../components/BrandTitle';

interface EnhancementsDemoProps {
  onBack: () => void;
}

export const EnhancementsDemo: React.FC<EnhancementsDemoProps> = ({ onBack }) => {
  const { 
    deviceSize, 
    spacing, 
    fontSize, 
    isSmall, 
    isMd, 
    isLarge, 
    isXs, 
    isSm, 
    isLg, 
    isXl, 
    isXxl 
  } = useResponsive();
  
  const [activeSection, setActiveSection] = useState('responsive');
  const cardScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  
  // Animation for demonstration
  useEffect(() => {
    const interval = setInterval(() => {
      cardScale.value = withSequence(
        withTiming(1.05, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(1, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
      );
      buttonScale.value = withSequence(
        withTiming(1.1, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(1, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));
  
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));
  
  const renderResponsiveSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { fontSize: fontSize.xl }]}>
        Enhanced Responsive System
      </Text>
      <Text style={[styles.sectionDescription, { fontSize: fontSize.md, marginBottom: spacing.lg }]}>
        The responsive system now supports more granular device sizes with clear flags for each size.
      </Text>
      
      <View style={styles.deviceSizeCard}>
        <Text style={[styles.cardTitle, { fontSize: fontSize.lg }]}>
          Current Device Size: <Text style={styles.highlight}>{deviceSize}</Text>
        </Text>
        
        <View style={[styles.breakpointsContainer, { marginTop: spacing.md }]}>
          <View style={[styles.breakpointItem, isXs && styles.activeBreakpoint]}>
            <Text style={[styles.breakpointText, isXs && styles.activeBreakpointText]}>xs</Text>
            <Text style={styles.breakpointDescription}>Very Small Phones</Text>
          </View>
          
          <View style={[styles.breakpointItem, isSm && styles.activeBreakpoint]}>
            <Text style={[styles.breakpointText, isSm && styles.activeBreakpointText]}>sm</Text>
            <Text style={styles.breakpointDescription}>Small Phones</Text>
          </View>
          
          <View style={[styles.breakpointItem, isMd && styles.activeBreakpoint]}>
            <Text style={[styles.breakpointText, isMd && styles.activeBreakpointText]}>md</Text>
            <Text style={styles.breakpointDescription}>Medium Phones</Text>
          </View>
          
          <View style={[styles.breakpointItem, isLg && styles.activeBreakpoint]}>
            <Text style={[styles.breakpointText, isLg && styles.activeBreakpointText]}>lg</Text>
            <Text style={styles.breakpointDescription}>Large Phones</Text>
          </View>
          
          <View style={[styles.breakpointItem, isXl && styles.activeBreakpoint]}>
            <Text style={[styles.breakpointText, isXl && styles.activeBreakpointText]}>xl</Text>
            <Text style={styles.breakpointDescription}>Tablets (Portrait)</Text>
          </View>
          
          <View style={[styles.breakpointItem, isXxl && styles.activeBreakpoint]}>
            <Text style={[styles.breakpointText, isXxl && styles.activeBreakpointText]}>xxl</Text>
            <Text style={styles.breakpointDescription}>Tablets (Landscape)</Text>
          </View>
        </View>
        
        <View style={[styles.legacyMappingContainer, { marginTop: spacing.lg }]}>
          <Text style={[styles.legacyTitle, { fontSize: fontSize.md }]}>
            Legacy Support:
          </Text>
          <View style={styles.legacyMapping}>
            <View style={styles.legacyItem}>
              <Text style={styles.legacyLabel}>isSmall:</Text>
              <Text style={styles.legacyValue}>{isSmall ? 'true' : 'false'}</Text>
            </View>
            <View style={styles.legacyItem}>
              <Text style={styles.legacyLabel}>isMedium:</Text>
              <Text style={styles.legacyValue}>{isMd ? 'true' : 'false'}</Text>
            </View>
            <View style={styles.legacyItem}>
              <Text style={styles.legacyLabel}>isLarge:</Text>
              <Text style={styles.legacyValue}>{isLarge ? 'true' : 'false'}</Text>
            </View>
          </View>
        </View>
      </View>
      
      <Animated.View style={[styles.responsiveDemo, { marginTop: spacing.xl }, cardAnimatedStyle]}>
        <Text style={[styles.cardTitle, { fontSize: fontSize.lg, marginBottom: spacing.md }]}>
          Responsive Elements Demo
        </Text>
        
        <View style={styles.responsiveElements}>
          <View style={styles.elementCard}>
            <Text style={styles.elementTitle}>Spacing</Text>
            <View style={styles.spacingDemo}>
              <View style={[styles.spacingBox, { margin: spacing.xs }]}>
                <Text style={styles.spacingText}>xs</Text>
              </View>
              <View style={[styles.spacingBox, { margin: spacing.sm }]}>
                <Text style={styles.spacingText}>sm</Text>
              </View>
              <View style={[styles.spacingBox, { margin: spacing.md }]}>
                <Text style={styles.spacingText}>md</Text>
              </View>
              <View style={[styles.spacingBox, { margin: spacing.lg }]}>
                <Text style={styles.spacingText}>lg</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.elementCard}>
            <Text style={styles.elementTitle}>Font Sizes</Text>
            <View style={styles.fontSizeDemo}>
              <Text style={[styles.fontSample, { fontSize: fontSize.xs }]}>Extra Small</Text>
              <Text style={[styles.fontSample, { fontSize: fontSize.sm }]}>Small</Text>
              <Text style={[styles.fontSample, { fontSize: fontSize.md }]}>Medium</Text>
              <Text style={[styles.fontSample, { fontSize: fontSize.lg }]}>Large</Text>
              <Text style={[styles.fontSample, { fontSize: fontSize.xl }]}>Extra Large</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
  
  const renderThemeSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { fontSize: fontSize.xl }]}>
        Consistent Theme System
      </Text>
      <Text style={[styles.sectionDescription, { fontSize: fontSize.md, marginBottom: spacing.lg }]}>
        The theme system now uses consistent color references across all components.
      </Text>
      
      <View style={styles.colorPaletteContainer}>
        <Text style={[styles.cardTitle, { fontSize: fontSize.lg, marginBottom: spacing.md }]}>
          Color Palette
        </Text>
        
        <View style={styles.colorGrid}>
          <View style={styles.colorCard}>
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.primary }]} />
            <Text style={styles.colorName}>primary</Text>
          </View>
          
          <View style={styles.colorCard}>
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.secondary }]} />
            <Text style={styles.colorName}>secondary</Text>
          </View>
          
          <View style={styles.colorCard}>
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.success }]} />
            <Text style={styles.colorName}>success</Text>
          </View>
          
          <View style={styles.colorCard}>
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.warning }]} />
            <Text style={styles.colorName}>warning</Text>
          </View>
          
          <View style={styles.colorCard}>
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.error }]} />
            <Text style={styles.colorName}>error</Text>
          </View>
          
          <View style={styles.colorCard}>
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.info }]} />
            <Text style={styles.colorName}>info</Text>
          </View>
          
          <View style={styles.colorCard}>
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.background }]} />
            <Text style={styles.colorName}>background</Text>
          </View>
          
          <View style={styles.colorCard}>
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.surface }]} />
            <Text style={styles.colorName}>surface</Text>
          </View>
          
          <View style={styles.colorCard}>
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.shadow }]} />
            <Text style={styles.colorName}>shadow</Text>
          </View>
        </View>
      </View>
      
      <Animated.View style={[styles.shadowDemoContainer, { marginTop: spacing.xl }, cardAnimatedStyle]}>
        <Text style={[styles.cardTitle, { fontSize: fontSize.lg, marginBottom: spacing.md }]}>
          Shadow Standardization Demo
        </Text>
        
        <View style={styles.shadowCards}>
          <View style={[styles.shadowCard, styles.shadowSmall]}>
            <Text style={styles.shadowText}>Small Shadow</Text>
            <Text style={styles.shadowCode}>theme.shadows.sm</Text>
          </View>
          
          <View style={[styles.shadowCard, styles.shadowMedium]}>
            <Text style={styles.shadowText}>Medium Shadow</Text>
            <Text style={styles.shadowCode}>theme.shadows.md</Text>
          </View>
          
          <View style={[styles.shadowCard, styles.shadowLarge]}>
            <Text style={styles.shadowText}>Large Shadow</Text>
            <Text style={styles.shadowCode}>theme.shadows.lg</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
  
  const renderComponentsSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { fontSize: fontSize.xl }]}>
        Enhanced Components
      </Text>
      <Text style={[styles.sectionDescription, { fontSize: fontSize.md, marginBottom: spacing.lg }]}>
        Components now use responsive sizing and standardized theme properties.
      </Text>
      
      <View style={styles.componentsContainer}>
        <View style={styles.componentGroup}>
          <Text style={[styles.componentTitle, { fontSize: fontSize.lg }]}>Buttons</Text>
          <View style={styles.componentDemo}>
            <Animated.View style={buttonAnimatedStyle}>
              <Button 
                title="Primary Button" 
                onPress={() => {}} 
                style={{ marginBottom: spacing.sm }}
              />
            </Animated.View>
            <Button 
              title="Secondary" 
              variant="secondary" 
              onPress={() => {}} 
              style={{ marginBottom: spacing.sm }}
            />
            <Button 
              title="Outline" 
              variant="outline" 
              onPress={() => {}} 
              style={{ marginBottom: spacing.sm }}
            />
            <Button 
              title="Ghost" 
              variant="ghost" 
              onPress={() => {}} 
            />
          </View>
        </View>
        
        <View style={[styles.componentGroup, { marginTop: spacing.xl }]}>
          <Text style={[styles.componentTitle, { fontSize: fontSize.lg }]}>Inputs</Text>
          <View style={styles.componentDemo}>
            <Input 
              label="Standard Input" 
              placeholder="Enter text..." 
              style={{ marginBottom: spacing.md }}
            />
            <EnhancedInput 
              label="With Icon" 
              placeholder="Search..." 
              leftIcon="search"
              style={{ marginBottom: spacing.md }}
            />
            <Input 
              label="Error State" 
              placeholder="Error example" 
              error="This field has an error"
            />
          </View>
        </View>
        
        <View style={[styles.componentGroup, { marginTop: spacing.xl }]}>
          <Text style={[styles.componentTitle, { fontSize: fontSize.lg }]}>Cards</Text>
          <View style={styles.componentDemo}>
            <Animated.View style={[cardAnimatedStyle]}>
              <Card
                title="Enhanced Card"
                description="Cards now use consistent shadow and theme properties"
                style={{ marginBottom: spacing.md }}
              />
            </Animated.View>
            <Card
              title="Card with Actions"
              description="Interactive elements with standardized styles"
              footerActions={
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <Button title="Action" size="small" onPress={() => {}} />
                </View>
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <BackButton onPress={onBack} color={theme.colors.text} />
          <View style={styles.headerContent}>
            <BrandTitle size="sm" />
            <Text style={styles.headerSubtitle}>Visual Demo of Improvements</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'responsive' && styles.activeTab]}
          onPress={() => setActiveSection('responsive')}
        >
          <Feather 
            name="layout" 
            size={18} 
            color={activeSection === 'responsive' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text 
            style={[
              styles.tabText, 
              activeSection === 'responsive' && styles.activeTabText
            ]}
          >
            Responsive
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeSection === 'theme' && styles.activeTab]}
          onPress={() => setActiveSection('theme')}
        >
          <Feather 
            name="droplet" 
            size={18} 
            color={activeSection === 'theme' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text 
            style={[
              styles.tabText, 
              activeSection === 'theme' && styles.activeTabText
            ]}
          >
            Theme
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeSection === 'components' && styles.activeTab]}
          onPress={() => setActiveSection('components')}
        >
          <Feather 
            name="grid" 
            size={18} 
            color={activeSection === 'components' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text 
            style={[
              styles.tabText, 
              activeSection === 'components' && styles.activeTabText
            ]}
          >
            Components
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={{ padding: spacing.lg }}>
        {activeSection === 'responsive' && renderResponsiveSection()}
        {activeSection === 'theme' && renderThemeSection()}
        {activeSection === 'components' && renderComponentsSection()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  
  headerTitle: {
    fontSize: 22,
    fontFamily: typography.fonts.bold,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: typography.fonts.regular,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: typography.fonts.medium,
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: typography.fonts.bold,
    color: theme.colors.text,
  },
  sectionDescription: {
    fontFamily: typography.fonts.regular,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  deviceSizeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.md,
  },
  cardTitle: {
    fontFamily: typography.fonts.semibold,
    color: theme.colors.text,
  },
  highlight: {
    color: theme.colors.primary,
    fontFamily: typography.fonts.bold,
  },
  breakpointsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  breakpointItem: {
    width: '48%',
    backgroundColor: theme.colors.surfaceVariant,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  activeBreakpoint: {
    backgroundColor: theme.colors.primaryAlpha,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  breakpointText: {
    fontSize: 16,
    fontFamily: typography.fonts.bold,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  activeBreakpointText: {
    color: theme.colors.primary,
  },
  breakpointDescription: {
    fontSize: 12,
    fontFamily: typography.fonts.regular,
    color: theme.colors.textTertiary,
  },
  legacyMappingContainer: {
    backgroundColor: theme.colors.surfaceVariant,
    padding: 12,
    borderRadius: 8,
  },
  legacyTitle: {
    fontFamily: typography.fonts.medium,
    color: theme.colors.text,
    marginBottom: 8,
  },
  legacyMapping: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  legacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '30%',
    marginBottom: 8,
  },
  legacyLabel: {
    fontSize: 14,
    fontFamily: typography.fonts.medium,
    color: theme.colors.textSecondary,
    marginRight: 4,
  },
  legacyValue: {
    fontSize: 14,
    fontFamily: typography.fonts.regular,
    color: theme.colors.primary,
  },
  responsiveDemo: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.md,
  },
  responsiveElements: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  elementCard: {
    width: '48%',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  elementTitle: {
    fontSize: 16,
    fontFamily: typography.fonts.medium,
    color: theme.colors.text,
    marginBottom: 12,
  },
  spacingDemo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  spacingBox: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.primaryAlpha,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacingText: {
    fontSize: 12,
    fontFamily: typography.fonts.medium,
    color: theme.colors.primary,
  },
  fontSizeDemo: {
    flexDirection: 'column',
  },
  fontSample: {
    fontFamily: typography.fonts.medium,
    color: theme.colors.text,
    marginBottom: 4,
  },
  colorPaletteContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.md,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorCard: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  colorSwatch: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  colorName: {
    fontSize: 12,
    fontFamily: typography.fonts.medium,
    color: theme.colors.textSecondary,
  },
  shadowDemoContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.md,
  },
  shadowCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shadowCard: {
    width: '30%',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  shadowSmall: {
    ...theme.shadows.sm,
  },
  shadowMedium: {
    ...theme.shadows.md,
  },
  shadowLarge: {
    ...theme.shadows.lg,
  },
  shadowText: {
    fontSize: 14,
    fontFamily: typography.fonts.medium,
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  shadowCode: {
    fontSize: 10,
    fontFamily: typography.fonts.mono,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  componentsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.md,
  },
  componentGroup: {
    marginBottom: 24,
  },
  componentTitle: {
    fontFamily: typography.fonts.semibold,
    color: theme.colors.text,
    marginBottom: 16,
  },
  componentDemo: {},
});
