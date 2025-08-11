import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme, typography } from '../utils/theme';
import { BrandTitle } from '../components/BrandTitle';
import { useResponsive } from '../utils/responsive';
import {
  MessageStatusBadge,
  ProgressBar,
  StatCard,
  NotificationBanner,
} from '../components/UIComponents';
import {
  SearchBar,
  TabBar,
  FloatingActionButton,
} from '../components/InteractiveComponents';
import {
  AnimatedButton,
  SlideInView,
} from '../components/AnimatedComponents';

interface EnhancedHomeScreenProps {
  navigation?: any;
}

export const EnhancedHomeScreen: React.FC<EnhancedHomeScreenProps> = ({
  navigation,
}) => {
  const [searchText, setSearchText] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('messages');
  const [showNotification, setShowNotification] = React.useState(false);
  const [stats, setStats] = React.useState({
    totalMessages: 1247,
    unreadMessages: 23,
    activeChats: 15,
    queuedMessages: 5,
  });

  const { fontSize, spacing, deviceSize } = useResponsive();

  const tabs = [
    { id: 'messages', label: 'Messages', icon: 'message-circle', badge: stats.unreadMessages },
    { id: 'contacts', label: 'Contacts', icon: 'users' },
    { id: 'queue', label: 'Queue', icon: 'clock', badge: stats.queuedMessages },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const handleNavigate = (screen: string) => {
    try {
      if (navigation?.navigate) {
        navigation.navigate(screen);
      } else {
        console.log(`Navigate to ${screen}`);
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'compose':
        handleNavigate('ComposeScreen');
        break;
      case 'contacts':
        handleNavigate('ContactsScreen');
        break;
      case 'settings':
        handleNavigate('SettingsScreen');
        break;
      default:
        setShowNotification(true);
        break;
    }
  };

  const renderQuickStats = () => (
    <View style={[styles.statsContainer, { padding: spacing.md, marginBottom: spacing.lg }]}>
      <Text style={[styles.sectionTitle, { fontSize: fontSize.lg, marginBottom: spacing.md }]}>
        Quick Stats
      </Text>
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Messages"
          value={stats.totalMessages.toLocaleString()}
          subtitle="All time"
          icon="send"
          color={theme.colors.primary}
          onPress={() => handleNavigate('InboxScreen')}
        />
        <StatCard
          title="Unread"
          value={stats.unreadMessages}
          subtitle="Pending"
          icon="mail"
          color={theme.colors.warning}
          trend="up"
          trendValue="+3"
          onPress={() => handleNavigate('InboxScreen')}
        />
        <StatCard
          title="Active Chats"
          value={stats.activeChats}
          subtitle="Online now"
          icon="message-square"
          color={theme.colors.success}
          onPress={() => handleNavigate('DirectInboxScreen')}
        />
        <StatCard
          title="Queue"
          value={stats.queuedMessages}
          subtitle="Pending send"
          icon="clock"
          color={theme.colors.error}
          onPress={() => handleNavigate('QueueScreen')}
        />
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={[styles.actionsContainer, { padding: spacing.md, marginBottom: spacing.lg }]}>
      <Text style={[styles.sectionTitle, { fontSize: fontSize.lg, marginBottom: spacing.md }]}>
        Quick Actions
      </Text>
      <View style={styles.actionsGrid}>
        <SlideInView direction="left" delay={200}>
          <TouchableOpacity
            style={[styles.actionCard, { padding: spacing.lg }]}
            onPress={() => handleQuickAction('compose')}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.colors.primaryAlpha }]}>
              <Feather name="edit-3" size={24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.actionTitle, { fontSize: fontSize.md }]}>
              Compose
            </Text>
            <Text style={[styles.actionSubtitle, { fontSize: fontSize.sm }]}>
              New message
            </Text>
          </TouchableOpacity>
        </SlideInView>

        <SlideInView direction="right" delay={400}>
          <TouchableOpacity
            style={[styles.actionCard, { padding: spacing.lg }]}
            onPress={() => handleQuickAction('contacts')}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.colors.successAlpha }]}>
              <Feather name="users" size={24} color={theme.colors.success} />
            </View>
            <Text style={[styles.actionTitle, { fontSize: fontSize.md }]}>
              Contacts
            </Text>
            <Text style={[styles.actionSubtitle, { fontSize: fontSize.sm }]}>
              Manage contacts
            </Text>
          </TouchableOpacity>
        </SlideInView>

        <SlideInView direction="left" delay={600}>
          <TouchableOpacity
            style={[styles.actionCard, { padding: spacing.lg }]}
            onPress={() => handleNavigate('DirectInboxScreen')}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.colors.primaryAlpha }]}>
              <Feather name="message-circle" size={24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.actionTitle, { fontSize: fontSize.md }]}>
              Direct Chat
            </Text>
            <Text style={[styles.actionSubtitle, { fontSize: fontSize.sm }]}>
              Private messages
            </Text>
          </TouchableOpacity>
        </SlideInView>

        <SlideInView direction="right" delay={800}>
          <TouchableOpacity
            style={[styles.actionCard, { padding: spacing.lg }]}
            onPress={() => handleQuickAction('settings')}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.colors.warningAlpha }]}>
              <Feather name="settings" size={24} color={theme.colors.warning} />
            </View>
            <Text style={[styles.actionTitle, { fontSize: fontSize.md }]}>
              Settings
            </Text>
            <Text style={[styles.actionSubtitle, { fontSize: fontSize.sm }]}>
              App preferences
            </Text>
          </TouchableOpacity>
        </SlideInView>
      </View>
    </View>
  );

  const renderRecentActivity = () => (
    <View style={[styles.activityContainer, { padding: spacing.md }]}>
      <Text style={[styles.sectionTitle, { fontSize: fontSize.lg, marginBottom: spacing.md }]}>
        Recent Activity
      </Text>
      <View style={[styles.activityList, { gap: spacing.sm }]}>
        {[
          { id: 1, type: 'sent', message: 'Message sent to John', time: '2 min ago', status: 'delivered' },
          { id: 2, type: 'received', message: 'New message from Sarah', time: '5 min ago', status: 'read' },
          { id: 3, type: 'failed', message: 'Failed to send to +1234567890', time: '10 min ago', status: 'failed' },
          { id: 4, type: 'sent', message: 'Bulk message sent to 15 contacts', time: '1 hour ago', status: 'sent' },
        ].map((activity, index) => (
          <SlideInView key={activity.id} direction="up" delay={index * 100}>
            <View style={[styles.activityItem, { padding: spacing.md }]}>
              <View style={styles.activityContent}>
                <Text style={[styles.activityMessage, { fontSize: fontSize.sm }]}>
                  {activity.message}
                </Text>
                <Text style={[styles.activityTime, { fontSize: fontSize.xs }]}>
                  {activity.time}
                </Text>
              </View>
              <MessageStatusBadge status={activity.status as any} size="small" />
            </View>
          </SlideInView>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}>
        <View style={styles.headerContent}>
          <BrandTitle size="md" />
          <Text style={[styles.headerSubtitle, { fontSize: fontSize.sm }]}>
            Secure SMS Platform
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.headerAction, { padding: spacing.xs }]}
          onPress={() => handleNavigate('ProfileScreen')}
        >
          <Feather name="user" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: spacing.md }}>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search messages, contacts..."
          showFilter
          onFilter={() => console.log('Filter pressed')}
        />
      </View>

      {/* Tab Navigation */}
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabPress={setActiveTab}
        variant="pills"
      />

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {renderQuickStats()}
        {renderQuickActions()}
        {renderRecentActivity()}
      </ScrollView>

      {/* Floating Action Button */}
      <FloatingActionButton
        icon="plus"
        onPress={() => handleQuickAction('compose')}
        label="Compose"
        color={theme.colors.primary}
      />

      {/* Notification Banner */}
      <NotificationBanner
        visible={showNotification}
        type="info"
        title="Feature Coming Soon"
        message="This feature is under development."
        onDismiss={() => setShowNotification(false)}
        autoHide
        duration={3000}
      />
    </View>
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
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: typography.fonts.bold,
    color: theme.colors.onBackground,
  },
  headerSubtitle: {
    fontFamily: typography.fonts.regular,
    color: theme.colors.textSecondary,
  },
  headerAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: typography.fonts.bold,
    color: theme.colors.onBackground,
  },
  statsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.md,
    ...theme.shadows.sm,
  },
  statsGrid: {
    gap: theme.spacing.md,
  },
  actionsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.md,
    ...theme.shadows.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  actionCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  actionTitle: {
    fontFamily: typography.fonts.medium,
    color: theme.colors.onBackground,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontFamily: typography.fonts.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  activityContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.md,
    ...theme.shadows.sm,
  },
  activityList: {
    gap: theme.spacing.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontFamily: typography.fonts.medium,
    color: theme.colors.onBackground,
    marginBottom: 2,
  },
  activityTime: {
    fontFamily: typography.fonts.regular,
    color: theme.colors.textMuted,
  },
});
