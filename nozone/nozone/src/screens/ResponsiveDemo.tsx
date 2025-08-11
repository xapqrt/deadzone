import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../utils/theme';
import { useResponsive } from '../utils/responsive';
import { BackButton } from '../components/BackButton';
import { DirectInboxScreenEnhanced } from './DirectInboxScreenEnhanced';
import { DirectChatScreenEnhanced } from './DirectChatScreenEnhanced';
import { DirectComposeScreenEnhanced } from './DirectComposeScreenEnhanced';

type Screen = 'menu' | 'inbox' | 'chat' | 'compose';

interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  isOnline: boolean;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  isSelected: boolean;
}

interface ResponsiveDemoProps {
  onBack: () => void;
}

export const ResponsiveDemo: React.FC<ResponsiveDemoProps> = ({ onBack }) => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  
  const responsive = useResponsive();
  const styles = createResponsiveStyles(responsive);

  const handleConversationPress = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setCurrentScreen('chat');
  };

  const handleComposePress = () => {
    setCurrentScreen('compose');
  };

  const handleSend = (recipients: Contact[], message: string) => {
    Alert.alert(
      'Message Sent!',
      `Sent "${message}" to ${recipients.length} recipient(s)`,
      [
        {
          text: 'OK',
          onPress: () => setCurrentScreen('inbox'),
        },
      ]
    );
  };

  const renderMenu = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <BackButton onPress={onBack} color={theme.colors.onPrimary} />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Responsive Demo</Text>
          </View>
        </View>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceInfoText}>
            {responsive.deviceSize} ({responsive.width}x{responsive.height})
          </Text>
          <Text style={styles.deviceInfoSubtext}>
            {responsive.isPhone ? 'Phone' : 'Tablet'} • {responsive.isLandscape ? 'Landscape' : 'Portrait'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enhanced Screens</Text>
          <Text style={styles.sectionDescription}>
            All screens are now optimized for different device sizes with proper scaling, 
            spacing, and touch targets.
          </Text>
        </View>

        <View style={styles.demoGrid}>
          <TouchableOpacity
            style={styles.demoCard}
            onPress={() => setCurrentScreen('inbox')}
          >
            <View style={styles.demoIcon}>
              <Ionicons 
                name="chatbubbles" 
                size={responsive.fontSize.xl} 
                color={theme.colors.primary} 
              />
            </View>
            <Text style={styles.demoTitle}>Enhanced Inbox</Text>
            <Text style={styles.demoDescription}>
              Responsive conversation list with adaptive sizing and animations
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.demoCard}
            onPress={() => {
              setSelectedConversation({
                id: 'demo',
                contactName: 'Demo Contact',
                contactPhone: '+1234567890',
                lastMessage: 'This is a demo message',
                timestamp: new Date(),
                unreadCount: 0,
                isOnline: true,
              });
              setCurrentScreen('chat');
            }}
          >
            <View style={styles.demoIcon}>
              <Ionicons 
                name="chatbubble-ellipses" 
                size={responsive.fontSize.xl} 
                color={theme.colors.success} 
              />
            </View>
            <Text style={styles.demoTitle}>Enhanced Chat</Text>
            <Text style={styles.demoDescription}>
              Optimized message bubbles and input area for all screen sizes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.demoCard}
            onPress={() => setCurrentScreen('compose')}
          >
            <View style={styles.demoIcon}>
              <Ionicons 
                name="create" 
                size={responsive.fontSize.xl} 
                color={theme.colors.warning} 
              />
            </View>
            <Text style={styles.demoTitle}>Enhanced Compose</Text>
            <Text style={styles.demoDescription}>
              Smart contact selection and responsive message composition
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Responsive Features</Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons 
                name="phone-portrait" 
                size={responsive.fontSize.md} 
                color={theme.colors.primary} 
              />
              <Text style={styles.featureText}>
                Adaptive layouts for different screen sizes (XS to XXL)
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons 
                name="resize" 
                size={responsive.fontSize.md} 
                color={theme.colors.primary} 
              />
              <Text style={styles.featureText}>
                Dynamic spacing and font scaling based on device size
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons 
                name="finger-print" 
                size={responsive.fontSize.md} 
                color={theme.colors.primary} 
              />
              <Text style={styles.featureText}>
                Minimum 44px touch targets with proper hit slops
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons 
                name="eye" 
                size={responsive.fontSize.md} 
                color={theme.colors.primary} 
              />
              <Text style={styles.featureText}>
                Enhanced visual hierarchy and readability
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons 
                name="flash" 
                size={responsive.fontSize.md} 
                color={theme.colors.primary} 
              />
              <Text style={styles.featureText}>
                Smooth animations and haptic feedback
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.deviceSpecs}>
          <Text style={styles.sectionTitle}>Current Device</Text>
          <View style={styles.specGrid}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Size</Text>
              <Text style={styles.specValue}>{responsive.deviceSize.toUpperCase()}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Type</Text>
              <Text style={styles.specValue}>
                {responsive.isSmallPhone ? 'Small Phone' : 
                 responsive.isPhone ? 'Phone' : 'Tablet'}
              </Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Orientation</Text>
              <Text style={styles.specValue}>
                {responsive.isLandscape ? 'Landscape' : 'Portrait'}
              </Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Scale</Text>
              <Text style={styles.specValue}>{responsive.scale.toFixed(2)}x</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Render current screen
  switch (currentScreen) {
    case 'inbox':
      return (
        <DirectInboxScreenEnhanced
          onConversationPress={handleConversationPress}
          onComposePress={handleComposePress}
        />
      );
    
    case 'chat':
      return selectedConversation ? (
        <DirectChatScreenEnhanced
          contactName={selectedConversation.contactName}
          contactPhone={selectedConversation.contactPhone}
          onBack={() => setCurrentScreen('inbox')}
        />
      ) : null;
    
    case 'compose':
      return (
        <DirectComposeScreenEnhanced
          onBack={() => setCurrentScreen('inbox')}
          onSend={handleSend}
        />
      );
    
    default:
      return renderMenu();
  }
};

const createResponsiveStyles = (responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  header: {
    paddingHorizontal: responsive.spacing.md,
    paddingVertical: responsive.spacing.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsive.spacing.xs,
  },
  
  headerContent: {
    flex: 1,
    marginLeft: responsive.spacing.sm,
  },
  
  headerTitle: {
    fontSize: responsive.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  
  deviceInfo: {
    marginTop: responsive.spacing.xs,
  },
  
  deviceInfoText: {
    fontSize: responsive.fontSize.md,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  
  deviceInfoSubtext: {
    fontSize: responsive.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  
  content: {
    flex: 1,
    padding: responsive.spacing.md,
  },
  
  section: {
    marginBottom: responsive.spacing.xl,
  },
  
  sectionTitle: {
    fontSize: responsive.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: responsive.spacing.sm,
  },
  
  sectionDescription: {
    fontSize: responsive.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: responsive.fontSize.md * 1.4,
  },
  
  demoGrid: {
    flexDirection: responsive.isSmallPhone ? 'column' : 'row',
    flexWrap: 'wrap',
    marginHorizontal: responsive.isSmallPhone ? 0 : -responsive.spacing.xs,
  },
  
  demoCard: {
    flex: responsive.isSmallPhone ? undefined : 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: responsive.spacing.lg,
    padding: responsive.spacing.md,
    marginHorizontal: responsive.isSmallPhone ? 0 : responsive.spacing.xs,
    marginBottom: responsive.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: responsive.isSmallPhone ? undefined : 150,
  },
  
  demoIcon: {
    width: responsive.isSmallPhone ? 48 : 56,
    height: responsive.isSmallPhone ? 48 : 56,
    borderRadius: responsive.isSmallPhone ? 24 : 28,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: responsive.spacing.md,
  },
  
  demoTitle: {
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: responsive.spacing.xs,
  },
  
  demoDescription: {
    fontSize: responsive.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: responsive.fontSize.sm * 1.4,
  },
  
  featuresSection: {
    marginBottom: responsive.spacing.xl,
  },
  
  featuresList: {
    marginTop: responsive.spacing.sm,
  },
  
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsive.spacing.sm,
  },
  
  featureText: {
    flex: 1,
    fontSize: responsive.fontSize.md,
    color: theme.colors.text,
    marginLeft: responsive.spacing.sm,
    lineHeight: responsive.fontSize.md * 1.4,
  },
  
  deviceSpecs: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: responsive.spacing.lg,
    padding: responsive.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: responsive.spacing.sm,
  },
  
  specItem: {
    width: '50%',
    paddingVertical: responsive.spacing.sm,
  },
  
  specLabel: {
    fontSize: responsive.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: responsive.spacing.xs,
  },
  
  specValue: {
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
