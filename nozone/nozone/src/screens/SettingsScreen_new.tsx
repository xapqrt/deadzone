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
import { User, AppSettings } from '../types';
import { StorageService } from '../services/storage';
import { theme } from '../utils/theme';
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
        color={destructive ? theme.colors.error : theme.colors.primary}
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
  const { actions: syncActions, isSyncing } = useSyncEngine(user.id);
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
      await syncActions.syncMessages();
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
      {/* Header */}
      <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Feather name="arrow-left" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
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
              subtitle={`${stats.pending} pending messages`}
              onPress={handleManualSync}
              showChevron
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
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSizes.xl,
    fontFamily: theme.fonts.bold,
    color: theme.colors.onBackground,
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
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.md,
  },
  sectionContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryAlpha,
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
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.xs,
  },
  settingSubtitle: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
  settingAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  appName: {
    fontSize: theme.fontSizes.xxl,
    fontFamily: theme.fonts.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  appVersion: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  appDescription: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
