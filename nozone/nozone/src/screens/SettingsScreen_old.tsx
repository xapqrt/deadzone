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
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { User, AppSettings } from '../types';
import { StorageService } from '../services/storage';
import { PhoneVerificationService } from '../services/verification';
import { SyncService } from '../services/sync';
import { theme } from '../utils/theme';
import { BrandTitle } from '../components/BrandTitle';

export interface SettingsScreenProps {
  user: User;
  onBack: () => void;
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  onBack,
  onLogout,
}) => {
  const [settings, setSettings] = useState<AppSettings>({
    autoSync: true,
    darkMode: true,
    notificationsEnabled: true,
    retryFailedMessages: true,
    maxRetryAttempts: 3,
  });
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncInProgress, setSyncInProgress] = useState(false);

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await StorageService.getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadStats = async () => {
    try {
      const count = await SyncService.getPendingMessageCount();
      setPendingCount(count);
      setSyncInProgress(SyncService.isSyncInProgress());
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const updateSetting = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await StorageService.saveSettings(newSettings);
    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to save setting');
    }
  };

  const handleManualSync = async () => {
    if (syncInProgress) return;

    setLoading(true);
    try {
      const result = await SyncService.performSync(user);
      
      if (result.success) {
        await loadStats();
        if (result.syncedCount > 0) {
          Alert.alert(
            'Sync Complete',
            `${result.syncedCount} message${result.syncedCount === 1 ? '' : 's'} sent successfully!`
          );
        } else {
          Alert.alert('Sync Complete', 'No messages to sync');
        }
      } else {
        Alert.alert('Sync Failed', result.error || 'Failed to sync messages');
      }
    } catch (error) {
      console.error('Manual sync error:', error);
      Alert.alert('Sync Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your messages and settings. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.clearAllData();
              Alert.alert('Data Cleared', 'All data has been removed', [
                { text: 'OK', onPress: onLogout }
              ]);
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? Your messages will remain stored locally.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'default',
          onPress: async () => {
            try {
              await PhoneVerificationService.logout();
              onLogout();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle: string,
    value: boolean,
    onToggle: (value: boolean) => void
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Ionicons name={icon as any} size={24} color={theme.colors.primary} />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.primary,
        }}
        thumbColor={value ? theme.colors.onPrimary : theme.colors.textMuted}
      />
    </View>
  );

  const renderActionItem = (
    icon: string,
    title: string,
    subtitle: string,
    onPress: () => void,
    destructive?: boolean
  ) => (
    <TouchableOpacity style={styles.actionItem} onPress={onPress}>
      <View style={styles.settingInfo}>
        <Ionicons
          name={icon as any}
          size={24}
          color={destructive ? theme.colors.error : theme.colors.primary}
        />
        <View style={styles.settingText}>
          <Text style={[
            styles.settingTitle,
            destructive && { color: theme.colors.error }
          ]}>
            {title}
          </Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={theme.colors.textMuted}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
        
        <Text style={styles.title}>Settings</Text>
        
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.userInfo}>
            <Ionicons name="person-circle" size={48} color={theme.colors.primary} />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>Verified User</Text>
              <Text style={styles.userPhone}>{user.phone}</Text>
            </View>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          {renderSettingItem(
            'sync',
            'Auto Sync',
            'Automatically send messages when online',
            settings.autoSync,
            (value) => updateSetting('autoSync', value)
          )}

          {renderSettingItem(
            'notifications',
            'Notifications',
            'Show notifications when messages are sent',
            settings.notificationsEnabled,
            (value) => updateSetting('notificationsEnabled', value)
          )}

          {renderSettingItem(
            'moon',
            'Dark Mode',
            'Use dark theme (always enabled)',
            settings.darkMode,
            (value) => updateSetting('darkMode', value)
          )}
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending Messages</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          {renderActionItem(
            'sync',
            'Manual Sync',
            `Force sync all pending messages`,
            handleManualSync
          )}

          {renderActionItem(
            'trash',
            'Clear All Data',
            'Delete all messages and settings',
            handleClearData,
            true
          )}

          {renderActionItem(
            'log-out',
            'Logout',
            'Sign out of your account',
            handleLogout,
            true
          )}
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.appInfo}>
            <BrandTitle size="md" />
            <Text style={styles.appVersion}>Version 1.0.0</Text>
            <Text style={styles.appDescription}>
              Offline-first messaging with scheduled delivery
            </Text>
          </View>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },

  title: {
    flex: 1,
    fontSize: theme.fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.onBackground,
    textAlign: 'center',
  },

  headerSpacer: {
    width: 40,
  },

  content: {
    flex: 1,
  },

  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },

  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '600',
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.md,
  },

  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },

  userDetails: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },

  userName: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },

  userPhone: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },

  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },

  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  settingText: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },

  settingTitle: {
    fontSize: theme.fontSizes.md,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },

  settingSubtitle: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  statsContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    fontSize: theme.fontSizes.xxxl,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },

  statLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },

  appInfo: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },

  appName: {
    fontSize: theme.fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },

  appVersion: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },

  appDescription: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 20,
  },
});
