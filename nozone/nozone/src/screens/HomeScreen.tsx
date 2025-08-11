import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import Animated, { FadeInUp, FadeInDown, useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useLocalMessages } from '../hooks/useLocalMessages';
import { useMessageStats } from '../hooks/useMessageStats';
import { useSyncEngine } from '../hooks/useSyncEngine';
import { NetworkStatusBar } from '../components/NetworkStatusBar';
import { showError, showSuccess } from '../services/errorService';
import { theme } from '../utils/theme';
import { useResponsive } from '../utils/responsive';
import { User } from '../types';
import { StorageService } from '../services/storage';


interface HomeScreenProps {
  user: User;
  onCompose: () => void;
  onComposeWithUsers?: () => void;
  onQueue: () => void;
  onSettings: () => void;
  onProfile: () => void;
  onDirectInbox?: () => void;
  onDirectCompose?: (username?: string) => void;
  // Deprecated (UI cleanup): kept for backward compatibility but no longer rendered
  onUIShowcase?: () => void;
  onResponsiveDemo?: () => void;
  onEnhancementsDemo?: () => void;
}


export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  onCompose,
  onComposeWithUsers,
  onQueue,
  onSettings,
  onProfile,
  onDirectInbox,
  onDirectCompose,
  onUIShowcase, // unused
  onResponsiveDemo, // unused
  onEnhancementsDemo, // unused
}) => {
  const { isOnline } = useOnlineStatus();
  const { loading } = useLocalMessages(user.id); // keep for message list side-effects
  const stats = useMessageStats(user.id);
  const syncEngine = useSyncEngine(user.id);
  const { isSyncing, actions } = syncEngine;
  const { spacing, fontSize, deviceSize } = useResponsive();

  const syncButtonScale = useSharedValue(1);
  const [activeStreak, setActiveStreak] = useState<number>(0);
  const heroOpacity = useSharedValue(0);
  const heroTranslate = useSharedValue(20);
  const actionsOpacity = useSharedValue(0);
  const actionsTranslate = useSharedValue(30);

  const handleSyncPress = async () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    syncButtonScale.value = withSpring(0.95, { duration: 100 }, () => {
      syncButtonScale.value = withSpring(1);
    });

    if (isOnline) {
      try {
        await actions.syncMessages();
        // Success haptic
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showSuccess('Messages synced successfully');
      } catch (error) {
        showError(error, 'Sync failed');
        // Error haptic
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } else {
      // Warning haptic for offline
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const syncButtonAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: syncButtonScale.value }] }));
  const heroAnimatedStyle = useAnimatedStyle(() => ({ opacity: heroOpacity.value, transform: [{ translateY: heroTranslate.value }] }));
  const actionsAnimatedStyle = useAnimatedStyle(() => ({ opacity: actionsOpacity.value, transform: [{ translateY: actionsTranslate.value }] }));

  useEffect(() => {
    heroOpacity.value = withTiming(1, { duration: 600 });
    heroTranslate.value = withSpring(0, { damping: 18 });
  actionsOpacity.value = withDelay(150, withTiming(1, { duration: 700 }));
    actionsTranslate.value = withSpring(0, { damping: 18, mass: 0.8 });
  }, [heroOpacity, heroTranslate, actionsOpacity, actionsTranslate]);

  // Load active streak once (doesn't need to update live unless we implement day rollover event)
  useEffect(() => {
    (async () => {
      try { setActiveStreak(await StorageService.getActiveDayStreak()); } catch(e) {}
    })();
    const sub = DeviceEventEmitter.addListener('activeStreakUpdated', (s?: number) => {
      if (typeof s === 'number') setActiveStreak(s);
    });
    return () => { try { sub.remove(); } catch(e){} };
  }, []);

  // No coarse ticking needed now that last sync tile removed.

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <NetworkStatusBar />
      <LinearGradient
        colors={['#F0FDF4', '#FFFFFF']} // soft mint to white
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBg}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl + 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero / Header */}
        <Animated.View style={[styles.heroSection, heroAnimatedStyle]}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { fontSize: fontSize.xxl, color: '#000000' }]}>Hi {user.name?.split(' ')[0] || 'there'} 👋</Text>
              <Text style={[styles.tagline, { fontSize: fontSize.md, color: '#000000' }]}>Stay connected & in control</Text>
            </View>
            <TouchableOpacity style={styles.avatarButton} onPress={onProfile}>
              <Feather name="user" size={24} color={'#000000'} />
            </TouchableOpacity>
          </View>

          {/* Sync pill */}
            <Animated.View style={[styles.syncPillWrapper, syncButtonAnimatedStyle]}>
              <TouchableOpacity
                style={[styles.syncPill, !isOnline && styles.syncPillOffline, isSyncing && { opacity: 0.8 }]}
                onPress={handleSyncPress}
                disabled={isSyncing}
              >
                <Feather
                  name={isOnline ? (isSyncing ? 'rotate-cw' : 'wifi') : 'wifi-off'}
                  size={18}
                  color={isOnline ? '#000000' : '#000000'}
                />
                <Text style={[styles.syncPillText, { color: '#000000' }]}>
                  {isSyncing ? 'Syncing…' : isOnline ? 'Synced' : 'Offline'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
        </Animated.View>

        {/* Sync / Connectivity Overview */}
        <View style={styles.sectionContainer}>
          <Animated.Text entering={FadeInDown.duration(500)} style={[styles.sectionTitle, { fontSize: fontSize.lg, color: '#000000' }]}>Status</Animated.Text>
          <View style={styles.statsRow}>
            {[
              {
                key: 'streak',
                label: 'Active Streak',
                value: activeStreak.toString() + 'd',
                icon: 'zap',
                color: '#F59E0B'
              },
              {
                key: 'onlineStatus',
                label: 'Connectivity',
                value: isOnline ? 'Online' : 'Offline',
                icon: isOnline ? 'wifi' : 'wifi-off',
                color: isOnline ? '#16A34A' : '#DC2626'
              }
            ].map((s, i) => (
              <Animated.View
                key={s.key}
                entering={FadeInUp.delay(120 * i)}
                style={[styles.statGlass]}
              >
                <View style={[styles.statIconCircle, { backgroundColor: s.color + '20' }]}> 
                  <Feather name={s.icon as any} size={20} color={s.color} />
                </View>
                <Text style={[styles.statValue, { fontSize: fontSize.xl, color: '#000000' }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { fontSize: fontSize.sm, color: '#000000' }]}>{s.label}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Primary CTA */}
        <Animated.View entering={FadeInUp.delay(350)} style={styles.primaryCtaWrapper}>
          <TouchableOpacity
            style={styles.primaryCta}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onDirectCompose?.(); }}
          >
            <LinearGradient
              colors={['#16A34A', '#22C55E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryCtaGradient}
            >
              <Feather name="message-circle" size={24} color={'#FFFFFF'} />
              <Text style={[styles.primaryCtaText, { fontSize: fontSize.md, color: '#FFFFFF' }]}>New Direct Message</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Actions Grid */}
        <Animated.View style={[styles.sectionContainer, actionsAnimatedStyle]}>
          <Text style={[styles.sectionTitle, { fontSize: fontSize.lg, marginBottom: spacing.sm, color: '#000000' }]}>Quick Actions</Text>
          <View style={styles.actionsGridNew}>
            {[
              { key: 'conversations', label: 'Conversations', icon: 'inbox', onPress: () => onDirectInbox?.(), accent: '#16A34A', badge: stats.inbound > 0 ? stats.inbound : undefined },
              { key: 'compose', label: 'Send Message', icon: 'edit-3', onPress: () => (onComposeWithUsers ? onComposeWithUsers() : onCompose()), accent: '#22C55E' },
              { key: 'queue', label: 'Queue', icon: 'list', onPress: () => onQueue(), accent: '#059669' },
              { key: 'settings', label: 'Settings', icon: 'settings', onPress: () => onSettings(), accent: '#10B981' },
            ].map((a, i) => (
              <Animated.View key={a.key} entering={FadeInUp.delay(120 * i)} style={styles.actionCardNew}>
                <TouchableOpacity
                  style={styles.actionInner}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); a.onPress(); }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.actionIconCircleNew, { backgroundColor: a.accent + '26', borderWidth:1, borderColor: a.accent + '55' }]}> 
                    <Feather name={a.icon as any} size={22} color={'#000000'} />
                    {a.badge !== undefined && (
                      <View style={styles.badgeBubble}>
                        <Text style={styles.badgeText}>{a.badge > 99 ? '99+' : a.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.actionLabel, { fontSize: fontSize.sm, color: '#000000' }]}>{a.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  gradientBg: { ...StyleSheet.absoluteFillObject },
  heroSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  greeting: { fontFamily: theme.fonts.bold, color: '#065F46' },
  tagline: { fontFamily: theme.fonts.medium, color: '#0F172A' },
  avatarButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  syncPillWrapper: { marginTop: theme.spacing.sm },
  syncPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 999,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  syncPillOffline: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', borderWidth: 1 },
  syncPillText: { fontFamily: theme.fonts.medium },
  sectionContainer: { paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg },
  sectionTitle: { fontFamily: theme.fonts.semibold, color: theme.colors.onBackground },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.md },
  statGlass: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.xs,
  },
  statIconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontFamily: theme.fonts.bold, color: '#064E3B' },
  statLabel: { fontFamily: theme.fonts.medium, color: '#475569' },
  primaryCtaWrapper: { paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.xl },
  primaryCta: { borderRadius: theme.borderRadius.xl, overflow: 'hidden' },
  primaryCtaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.lg, gap: theme.spacing.sm },
  primaryCtaText: { fontFamily: theme.fonts.semibold, color: '#FFFFFF', marginLeft: theme.spacing.sm },
  actionsGridNew: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: theme.spacing.md },
  actionCardNew: { width: '48%', marginBottom: theme.spacing.md },
  actionInner: { backgroundColor: '#FFFFFF', borderRadius: theme.borderRadius.lg, paddingVertical: theme.spacing.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', ...theme.shadows.xs },
  actionIconCircleNew: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm },
  actionLabel: { fontFamily: theme.fonts.medium, color: '#0F172A' },
  badgeBubble: { position:'absolute', top: -4, right: -4, minWidth:20, paddingHorizontal:4, height:20, borderRadius:10, backgroundColor:'#DC2626', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#FFFFFF' },
  badgeText: { color:'#FFFFFF', fontSize:10, fontFamily: theme.fonts.bold },
  /* Legacy styles kept below for reference / potential fallback (not used in redesigned UI) */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
  },
});
