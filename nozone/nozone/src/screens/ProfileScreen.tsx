import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useLocalMessages } from '../hooks/useLocalMessages';
import { theme } from '../utils/theme';
import { User } from '../types';

interface ProfileScreenProps {
  user: User;
  onBack: () => void;
  onLogout: () => void;
}

const InfoCard: React.FC<{
  icon: string;
  title: string;
  value: string;
  delay: number;
}> = ({ icon, title, value, delay }) => {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12 });
  }, [delay, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.infoCard, animatedStyle]}>
      <View style={styles.infoCardContent}>
        <View style={[styles.infoIcon, { backgroundColor: theme.colors.primaryAlpha }]}>
          <Feather name={icon as any} size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.infoText}>
          <Text style={styles.infoTitle}>{title}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onBack,
  onLogout,
}) => {
  const { stats } = useLocalMessages(user.id);
  const avatarScale = useSharedValue(0);

  useEffect(() => {
    avatarScale.value = withSpring(1, { damping: 12 });
  }, [avatarScale]);

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const getInitials = (phone: string) => {
    return phone.slice(-2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Feather name="arrow-left" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <Animated.View style={[styles.avatarSection, avatarAnimatedStyle]}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
          </View>
          <Text style={styles.phoneNumber}>{user.name}</Text>
          <View style={styles.verificationBadge}>
            <Feather name="check-circle" size={16} color={theme.colors.success} />
            <Text style={styles.verificationText}>Verified</Text>
          </View>
        </Animated.View>

        {/* Info Cards */}
        <Animated.View entering={SlideInDown.delay(400)} style={styles.infoSection}>
          <InfoCard
            icon="calendar"
            title="Member Since"
            value={formatDate(user.createdAt)}
            delay={100}
          />
          
          <InfoCard
            icon="send"
            title="Messages Sent"
            value={stats.sent.toString()}
            delay={200}
          />
          
          <InfoCard
            icon="clock"
            title="Pending Messages"
            value={stats.pending.toString()}
            delay={300}
          />
          
          <InfoCard
            icon="alert-circle"
            title="Failed Messages"
            value={stats.failed.toString()}
            delay={400}
          />
          
          <InfoCard
            icon="archive"
            title="Total Messages"
            value={stats.total.toString()}
            delay={500}
          />
        </Animated.View>

        {/* Stats Summary */}
        <Animated.View entering={SlideInDown.delay(600)} style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Quick Stats</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{stats.sent + stats.failed}</Text>
              <Text style={styles.summaryLabel}>Attempted</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                {stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0}%
              </Text>
              <Text style={styles.summaryLabel}>Success Rate</Text>
            </View>
          </View>
        </Animated.View>

        {/* Logout Button */}
        <Animated.View entering={SlideInDown.delay(800)} style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <Feather name="log-out" size={20} color={theme.colors.error} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
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
  avatarSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.md,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.lg,
  },
  avatarText: {
    fontSize: theme.fontSizes.xxxl,
    fontFamily: theme.fonts.bold,
    color: theme.colors.onPrimary,
  },
  phoneNumber: {
    fontSize: theme.fontSizes.xl,
    fontFamily: theme.fonts.medium,
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.sm,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.successAlpha,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.round,
  },
  verificationText: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
    color: theme.colors.success,
    marginLeft: theme.spacing.xs,
  },
  infoSection: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  infoCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  infoValue: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    color: theme.colors.onSurface,
  },
  summarySection: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  summaryTitle: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.bold,
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: theme.fontSizes.xxl,
    fontFamily: theme.fonts.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  summaryLabel: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  logoutSection: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.error,
    borderWidth: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  logoutText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.error,
    marginLeft: theme.spacing.sm,
  },
});
