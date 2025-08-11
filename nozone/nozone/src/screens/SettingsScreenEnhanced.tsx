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
  Linking,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useLocalMessages } from '../hooks/useLocalMessages';
import { useSyncEngine } from '../hooks/useSyncEngine';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { NetworkService } from '../services/network';
import { StorageService } from '../services/storage';
import { ErrorService, showError, showSuccess, showWarning } from '../services/errorService';
import { LoadingService, useLoadingStates } from '../services/loadingService';
import { theme, typography } from '../utils/theme';
import BrandTitle from '../components/BrandTitle';
import { useResponsive } from '../utils/responsive';
import { User } from '../types';

interface SettingsScreenProps {
  user: User;
  onBack: () => void;
  onLogout: () => void;
}

interface AppSettings {
  autoSync: boolean;
  silentMode: boolean;
  publicInbox: boolean;
  autoDeleteDays: number;
  dataSaver: boolean;
  analytics: boolean;
}

interface SettingItemProps {
  title: string;
  subtitle?: string;
  icon: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  subtitle,
  icon,
  value,
  onValueChange,
  onPress,
  showChevron = false,
  destructive = false,
  disabled = false,
}) => {
  const { spacing, fontSize, touchTarget } = useResponsive();

  return (
    <TouchableOpacity
      style={[
        styles.settingItem,
        {
          minHeight: touchTarget.minHeight,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          opacity: disabled ? 0.5 : 1,
        }
      ]}
      onPress={onPress}
      disabled={disabled || (!onPress && !onValueChange)}
    >
      <View style={styles.settingIcon}>
        <Feather
          name={icon as any}
          size={20}
          color={destructive ? theme.colors.error : theme.colors.primary}
        />
      </View>
      
      <View style={styles.settingContent}>
        <Text style={[
          styles.settingTitle,
          { fontSize: fontSize.md },
          destructive && { color: theme.colors.error }
        ]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[
            styles.settingSubtitle,
            { fontSize: fontSize.sm }
          ]}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.settingAction}>
        {onValueChange && (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary + '40',
            }}
            thumbColor={value ? theme.colors.primary : theme.colors.textMuted}
            disabled={disabled}
          />
        )}
        {showChevron && (
          <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  onBack,
  onLogout,
}) => {
  const { stats } = useLocalMessages(user.id);
  const { isSyncing, lastSyncTime, actions: syncActions } = useSyncEngine(user.id);
  const { isOnline } = useOnlineStatus();
  const [opensToday, setOpensToday] = useState(0);
  const { setLoading, isLoading } = useLoadingStates(['settings', 'sync', 'clear', 'export']);
  const { spacing, fontSize, touchTarget } = useResponsive();

  const [settings, setSettings] = useState<AppSettings>({
    autoSync: true,
    silentMode: false,
    publicInbox: false,
    autoDeleteDays: 30,
    dataSaver: false,
    analytics: true,
  });

  useEffect(() => {
    loadSettings();
    (async () => { setOpensToday(await StorageService.getDailyOpenCount()); })();
    const sub = (async () => {
      try {
        // listen for daily open updates
        const { DeviceEventEmitter } = await import('react-native');
        const listener = DeviceEventEmitter.addListener('dailyOpenCountUpdated', (count:number) => setOpensToday(count));
        return () => { try { listener.remove(); } catch(e){} };
      } catch(e) {}
    })();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading('settings', true);
      const savedSettings = await StorageService.getAppSettings();
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (error) {
      showError(error, 'Failed to load settings');
    } finally {
      setLoading('settings', false);
    }
  };

  const updateSetting = async (key: keyof AppSettings, value: boolean | number) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await StorageService.saveAppSettings(newSettings);
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Apply setting immediately
      if (key === 'autoSync') {
        if (value) {
          await syncActions.enableAutoSync();
        } else {
          await syncActions.disableAutoSync();
        }
      }
      
    } catch (error) {
      showError(error, 'Failed to save setting');
      // Revert the change
      loadSettings();
    }
  };

  const handleManualSync = async () => {
    if (isSyncing) return;
    
    try {
      setLoading('sync', true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const result = await syncActions.syncMessages();
      
      if (result && result.success) {
        const syncedCount = result.syncedCount || 0;
        showSuccess(
          'Sync completed',
          syncedCount > 0 ? `Synced ${syncedCount} messages` : 'No messages to sync'
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const errorMessage = result?.error || 'Unknown sync error';
        showError(new Error(errorMessage), 'Sync failed');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      showError(error, 'Sync failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading('sync', false);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your messages, conversations, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading('clear', true);
              
              // Clear all data
              await StorageService.clearAllData();
              
              showSuccess('All data cleared', 'Your data has been permanently deleted');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              // Navigate back to login
              setTimeout(() => {
                onLogout();
              }, 1000);
              
            } catch (error) {
              showError(error, 'Failed to clear data');
            } finally {
              setLoading('clear', false);
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      setLoading('export', true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const exportData = await StorageService.exportUserData(user.id);
      
      // In a real app, you'd use react-native-share or similar
      // For now, just show success message
      showSuccess(
        'Data exported',
        'Your data has been prepared for export. Check your downloads folder.'
      );
      
    } catch (error) {
      showError(error, 'Failed to export data');
    } finally {
      setLoading('export', false);
    }
  };

  const handleOpenSupport = () => {
    Linking.openURL('mailto:support@deadzone.app?subject=Support Request');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://deadzone.app/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://deadzone.app/terms');
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your messages will remain on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'default',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onLogout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View 
        entering={FadeIn.duration(300)}
        style={[
          styles.header,
          {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              minWidth: touchTarget.minSize,
              minHeight: touchTarget.minSize,
            }
          ]}
          onPress={onBack}
        >
          <Feather name="arrow-left" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
        
  <BrandTitle size="sm" />
        
        <View style={{ width: touchTarget.minSize }} />
      </Animated.View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info */}
        <Animated.View 
          entering={SlideInDown.delay(100)}
          style={[
            styles.section,
            { marginBottom: spacing.lg }
          ]}
        >
          <View style={[
            styles.userCard,
            {
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.lg,
              marginHorizontal: spacing.md,
            }
          ]}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[
                styles.userName,
                { fontSize: fontSize.lg }
              ]}>
                {user.name || 'User'}
              </Text>
              <Text style={[
                styles.userSubtitle,
                { fontSize: fontSize.sm }
              ]}>
                @{user.username || user.email || 'user'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Messaging Settings */}
        <Animated.View entering={SlideInDown.delay(200)}>
          <Text style={[
            styles.sectionTitle,
            {
              fontSize: fontSize.md,
              marginHorizontal: spacing.md,
              marginBottom: spacing.sm,
            }
          ]}>
            Messaging
          </Text>
          
          <View style={styles.settingsGroup}>
            <SettingItem
              title="Auto Sync"
              subtitle="Automatically sync messages when online"
              icon="refresh-cw"
              value={settings.autoSync}
              onValueChange={(value) => updateSetting('autoSync', value)}
              disabled={isLoading('settings')}
            />
            
            <SettingItem
              title="Silent Mode"
              subtitle="Disable haptics and sounds"
              icon="volume-x"
              value={settings.silentMode}
              onValueChange={(value) => updateSetting('silentMode', value)}
              disabled={isLoading('settings')}
            />
            
            <SettingItem
              title="Manual Sync"
              subtitle={isSyncing ? 'Syncing messages...' : 'Sync messages now'}
              icon="download"
              onPress={handleManualSync}
              disabled={isSyncing || isLoading('sync')}
              showChevron
            />
          </View>
        </Animated.View>

  {/* Statistics (Connectivity & Usage) */}
        <Animated.View entering={SlideInDown.delay(300)}>
          <Text style={[
            styles.sectionTitle,
            {
              fontSize: fontSize.md,
              marginHorizontal: spacing.md,
              marginTop: spacing.lg,
              marginBottom: spacing.sm,
            }
          ]}>
            Statistics
          </Text>
          
          <View style={[
            styles.statsGrid,
            { marginHorizontal: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.lg }
          ]}>
            <View style={styles.statItem}>
              <Text style={[ styles.statValue, { fontSize: fontSize.xl, color: isOnline ? theme.colors.success : theme.colors.error } ]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
              <Text style={[ styles.statLabel, { fontSize: fontSize.sm } ]}>Connectivity</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[ styles.statValue, { fontSize: fontSize.xl } ]}>
                {(() => {
                  if (isSyncing) return 'Syncing…';
                  if (!lastSyncTime) return 'Never';
                  const diff = Date.now() - lastSyncTime.getTime();
                  const m = Math.floor(diff/60000);
                  if (m < 1) return '<1m ago';
                  if (m < 60) return m + 'm ago';
                  const h = Math.floor(m/60); if (h < 24) return h + 'h ago';
                  const d = Math.floor(h/24); return d + 'd ago';
                })()}
              </Text>
              <Text style={[ styles.statLabel, { fontSize: fontSize.sm } ]}>Last Sync</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[ styles.statValue, { fontSize: fontSize.xl } ]}>{opensToday}</Text>
              <Text style={[ styles.statLabel, { fontSize: fontSize.sm } ]}>Opens Today</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[ styles.statValue, { fontSize: fontSize.xl } ]}>{stats.total}</Text>
              <Text style={[ styles.statLabel, { fontSize: fontSize.sm } ]}>Total Messages</Text>
            </View>
          </View>
        </Animated.View>

        {/* Data & Privacy */}
        <Animated.View entering={SlideInDown.delay(400)}>
          <Text style={[
            styles.sectionTitle,
            {
              fontSize: fontSize.md,
              marginHorizontal: spacing.md,
              marginTop: spacing.lg,
              marginBottom: spacing.sm,
            }
          ]}>
            Data & Privacy
          </Text>
          
          <View style={styles.settingsGroup}>
            <SettingItem
              title="Export Data"
              subtitle="Download your messages as JSON"
              icon="download"
              onPress={handleExportData}
              disabled={isLoading('export')}
              showChevron
            />
            
            <SettingItem
              title="Clear All Data"
              subtitle="Permanently delete all data"
              icon="trash-2"
              onPress={handleClearAllData}
              disabled={isLoading('clear')}
              destructive
              showChevron
            />
          </View>
        </Animated.View>

        {/* About */}
        <Animated.View entering={SlideInDown.delay(500)}>
          <Text style={[
            styles.sectionTitle,
            {
              fontSize: fontSize.md,
              marginHorizontal: spacing.md,
              marginTop: spacing.lg,
              marginBottom: spacing.sm,
            }
          ]}>
            About
          </Text>
          
          <View style={styles.settingsGroup}>
            <SettingItem
              title="Support"
              subtitle="Get help and send feedback"
              icon="help-circle"
              onPress={handleOpenSupport}
              showChevron
            />
            
            <SettingItem
              title="Privacy Policy"
              subtitle="How we handle your data"
              icon="shield"
              onPress={handlePrivacyPolicy}
              showChevron
            />
            
            <SettingItem
              title="Terms of Service"
              subtitle="App usage terms"
              icon="file-text"
              onPress={handleTermsOfService}
              showChevron
            />
          </View>
        </Animated.View>

        {/* Sign Out */}
        <Animated.View entering={SlideInDown.delay(600)}>
          <View style={[
            styles.settingsGroup,
            { marginTop: spacing.lg, marginBottom: spacing.xxl }
          ]}>
            <SettingItem
              title="Sign Out"
              subtitle="Sign out of your account"
              icon="log-out"
              onPress={handleLogout}
              destructive
              showChevron
            />
          </View>
        </Animated.View>
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
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: typography.fonts.bold,
    color: theme.colors.onBackground,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.fonts.medium,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  userAvatarText: {
    fontSize: 24,
    fontFamily: typography.fonts.bold,
    color: theme.colors.onPrimary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: typography.fonts.medium,
    color: theme.colors.onBackground,
    marginBottom: 2,
  },
  userSubtitle: {
    fontFamily: typography.fonts.regular,
    color: theme.colors.textSecondary,
  },
  settingsGroup: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  settingIcon: {
    marginRight: theme.spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontFamily: typography.fonts.medium,
    color: theme.colors.onBackground,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontFamily: typography.fonts.regular,
    color: theme.colors.textSecondary,
  },
  settingAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    ...theme.shadows.sm,
  },
  statItem: {
    alignItems: 'center',
    width: '47%',
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontFamily: typography.fonts.bold,
    color: theme.colors.onBackground,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: typography.fonts.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
