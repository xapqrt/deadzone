import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useLocalMessages } from '../hooks/useLocalMessages';
import { useSyncEngine } from '../hooks/useSyncEngine';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { User, AppSettings } from '../types';
import { StorageService } from '../services/storage';
import { theme } from '../utils/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandTitle } from '../components/BrandTitle';

export interface SettingsScreenProps {
  user: User;
  onBack: () => void;
  onLogout: () => void;
}

const SettingItem: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}> = ({ icon, title, subtitle, value, onValueChange, onPress, destructive, showChevron }) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    disabled={!onPress && !onValueChange}
    activeOpacity={onPress ? 0.7 : 1}
  >
  <View style={styles.settingIcon}>
      <Feather
        name={icon as any}
    size={20}
    color={destructive ? '#DC2626' : '#16A34A'}
      />
    </View>
    
    <View style={styles.settingContent}>
      <Text style={[styles.settingTitle, destructive && { color: theme.colors.error }]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      )}
    </View>

    <View style={styles.settingAction}>
      {onValueChange && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary + '80',
          }}
          thumbColor={value ? theme.colors.primary : theme.colors.textMuted}
        />
      )}
      {showChevron && (
        <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
      )}
    </View>
  </TouchableOpacity>
);

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  onBack,
  onLogout,
}) => {
  const { stats, actions } = useLocalMessages(user.id);
  const syncEngine = useSyncEngine(user.id);
  const { isSyncing, lastSyncTime, coarseTick } = syncEngine;
  const { isOnline } = useOnlineStatus();
  const [settings, setSettings] = useState<AppSettings>({
    autoSync: true,
    darkMode: true,
    notificationsEnabled: true,
    retryFailedMessages: true,
    maxRetryAttempts: 3,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await StorageService.getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSetting = async (key: keyof AppSettings, value: any) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await StorageService.saveSettings(newSettings);
      
      Toast.show({
        type: 'success',
        text1: 'Settings Updated',
        text2: 'Your preferences have been saved',
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Could not save settings. Please try again.',
      });
    }
  };

  const handleManualSync = async () => {
    try {
      await syncEngine.actions.syncMessages();
      Toast.show({
        type: 'success',
        text1: '✅ Synced!',
        text2: 'All messages have been synced',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: '❌ Sync Failed',
        text2: 'Could not sync messages. Please try again.',
      });
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your saved messages. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await actions.clearAllMessages();
              Toast.show({
                type: 'success',
                text1: 'Data Cleared',
                text2: 'All messages have been deleted',
              });
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Clear Failed',
                text2: 'Could not clear data. Please try again.',
              });
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Simple logout - just clear local data
              onLogout();
            } catch (error) {
              console.error('Logout error:', error);
              onLogout(); // Force logout even if there's an error
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient colors={['#F0FDF4', '#FFFFFF']} style={styles.gradientBg} start={{x:0,y:0}} end={{x:1,y:1}} />
      {/* Header */}
      <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Feather name="arrow-left" size={24} color={'#065F46'} />
        </TouchableOpacity>
  <BrandTitle size="sm" />
        <View style={styles.placeholder} />
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sync Settings */}
        <Animated.View entering={SlideInDown.delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Sync & Data</Text>
          
          <View style={styles.sectionContent}>
            <SettingItem
              icon="refresh-cw"
              title="Auto Sync"
              subtitle="Automatically sync messages when online"
              value={settings.autoSync}
              onValueChange={(value) => updateSetting('autoSync', value)}
            />
            
            <SettingItem
              icon="wifi"
              title="Sync Now"
              subtitle={(() => {
                if (isSyncing) return 'Syncing…';
                if (!lastSyncTime) return 'Never synced';
                const diffMs = Date.now() - lastSyncTime.getTime();
                const sec = Math.floor(diffMs / 1000);
                if (sec < 60) return `Last sync ${sec}s ago`;
                const m = Math.floor(sec / 60);
                if (m < 60) return `Last sync ${m}m ago`;
                const h = Math.floor(m / 60);
                if (h < 24) return `Last sync ${h}h ago`;
                const d = Math.floor(h / 24);
                return `Last sync ${d}d ago`;
              })()}
              onPress={handleManualSync}
              showChevron
            />
            <SettingItem
              icon={isOnline ? 'check-circle' : 'alert-circle'}
              title="Connectivity"
              subtitle={isOnline ? 'Online' : 'Offline'}
            />
          </View>
        </Animated.View>

        {/* Notifications */}
        <Animated.View entering={SlideInDown.delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.sectionContent}>
            <SettingItem
              icon="bell"
              title="Notifications"
              subtitle="Enable push notifications for message delivery"
              value={settings.notificationsEnabled}
              onValueChange={(value) => updateSetting('notificationsEnabled', value)}
            />
          </View>
        </Animated.View>

        {/* Data Management */}
        <Animated.View entering={SlideInDown.delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <View style={styles.sectionContent}>
            <SettingItem
              icon="trash-2"
              title="Clear All Messages"
              subtitle={`Delete all ${stats.total} messages`}
              onPress={handleClearData}
              destructive
              showChevron
            />
          </View>
        </Animated.View>

        {/* Account */}
        <Animated.View entering={SlideInDown.delay(500)} style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.sectionContent}>
            <SettingItem
              icon="user"
              title="Name"
              subtitle={user.name}
              showChevron={false}
            />
            
            <SettingItem
              icon="log-out"
              title="Sign Out"
              subtitle="Sign out of your account"
              onPress={handleLogout}
              destructive
              showChevron
            />
          </View>
        </Animated.View>

        {/* App Info */}
        <Animated.View entering={SlideInDown.delay(600)} style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.infoCard}>
            <BrandTitle size="md" />
            <Text style={styles.appVersion}>Version 1.0.0</Text>
            <Text style={styles.appDescription}>
              Offline-first messaging app for scheduled message delivery
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradientBg: { ...StyleSheet.absoluteFillObject },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderBottomWidth: 0,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0'
  },
  headerTitle: {
    fontSize: theme.fontSizes.xl,
    fontFamily: theme.fonts.bold,
    color: '#065F46',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.bold,
    color: '#065F46',
    marginBottom: theme.spacing.md,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width:0, height:2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: '#065F46',
    marginBottom: theme.spacing.xs,
  },
  settingSubtitle: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: '#64748B',
  },
  settingAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width:0, height:2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  appName: {
    fontSize: theme.fontSizes.xxl,
    fontFamily: theme.fonts.bold,
    color: '#16A34A',
    marginBottom: theme.spacing.xs,
  },
  appVersion: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
    color: '#64748B',
    marginBottom: theme.spacing.sm,
  },
  appDescription: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
