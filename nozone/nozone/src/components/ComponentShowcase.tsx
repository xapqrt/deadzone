import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme, typography } from '../utils/theme';
import { useResponsive } from '../utils/responsive';
import {
  StatCard,
  EmptyState,
  MessageStatusBadge,
  ProgressBar,
  NotificationBanner,
} from './UIComponents';
import {
  FloatingActionButton,
  SearchBar,
  TabBar,
  BottomSheet,
} from './InteractiveComponents';
import {
  AnimatedButton,
  GlassCard,
  AnimatedModal,
  SlideInView,
  PulseAnimation,
} from './AnimatedComponents';

const { width: screenWidth } = Dimensions.get('window');

interface ComponentShowcaseProps {
  onNavigateBack?: () => void;
}

// Component Showcase Screen for testing and demonstration
export const ComponentShowcase: React.FC<ComponentShowcaseProps> = ({
  onNavigateBack,
}) => {
  const [activeTab, setActiveTab] = React.useState('ui');
  const [searchText, setSearchText] = React.useState('');
  const [showBottomSheet, setShowBottomSheet] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);
  const [showNotification, setShowNotification] = React.useState(false);
  const [progress, setProgress] = React.useState(0.3);

  const { fontSize, spacing, deviceSize } = useResponsive();

  const tabs = [
    { id: 'ui', label: 'UI Components', icon: 'grid' },
    { id: 'interactive', label: 'Interactive', icon: 'zap', badge: 3 },
    { id: 'animated', label: 'Animated', icon: 'play-circle' },
    { id: 'layouts', label: 'Layouts', icon: 'layout' },
  ];

  const handleProgressIncrease = () => {
    setProgress(prev => Math.min(prev + 0.2, 1));
  };

  const handleProgressDecrease = () => {
    setProgress(prev => Math.max(prev - 0.2, 0));
  };

  const renderUIComponents = () => (
    <View style={[styles.section, { padding: spacing.md }]}>
      <Text style={[styles.sectionTitle, { fontSize: fontSize.lg, marginBottom: spacing.lg }]}>
        UI Components
      </Text>

      {/* Status Badges */}
      <View style={[styles.componentGroup, { marginBottom: spacing.xl }]}>
        <Text style={[styles.componentTitle, { fontSize: fontSize.md, marginBottom: spacing.md }]}>
          Status Badges
        </Text>
        <View style={styles.badgeRow}>
          <MessageStatusBadge status="pending" showText size="small" />
          <MessageStatusBadge status="sent" showText size="medium" />
          <MessageStatusBadge status="delivered" showText size="large" />
          <MessageStatusBadge status="read" showText />
          <MessageStatusBadge status="failed" showText />
        </View>
      </View>

      {/* Progress Bars */}
      <View style={[styles.componentGroup, { marginBottom: spacing.xl }]}>
        <Text style={[styles.componentTitle, { fontSize: fontSize.md, marginBottom: spacing.md }]}>
          Progress Bar ({Math.round(progress * 100)}%)
        </Text>
        <ProgressBar progress={progress} showPercentage />
        <View style={[styles.progressControls, { marginTop: spacing.sm }]}>
          <TouchableOpacity
            style={[styles.progressButton, { marginRight: spacing.sm }]}
            onPress={handleProgressDecrease}
          >
            <Text style={styles.progressButtonText}>-20%</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.progressButton}
            onPress={handleProgressIncrease}
          >
            <Text style={styles.progressButtonText}>+20%</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stat Cards */}
      <View style={[styles.componentGroup, { marginBottom: spacing.xl }]}>
        <Text style={[styles.componentTitle, { fontSize: fontSize.md, marginBottom: spacing.md }]}>
          Statistics Cards
        </Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Messages Sent"
            value="1,234"
            subtitle="This month"
            icon="send"
            color={theme.colors.primary}
            trend="up"
            trendValue="+12%"
            onPress={() => console.log('Messages pressed')}
          />
          <StatCard
            title="Active Users"
            value="567"
            subtitle="Online now"
            icon="users"
            color={theme.colors.success}
            trend="up"
            trendValue="+8%"
            onPress={() => console.log('Users pressed')}
          />
          <StatCard
            title="Storage Used"
            value="2.4 GB"
            subtitle="of 10 GB"
            icon="hard-drive"
            color={theme.colors.warning}
            trend="neutral"
            onPress={() => console.log('Storage pressed')}
          />
          <StatCard
            title="Error Rate"
            value="0.02%"
            subtitle="Last 24h"
            icon="alert-circle"
            color={theme.colors.error}
            trend="down"
            trendValue="-0.01%"
            onPress={() => console.log('Errors pressed')}
          />
        </View>
      </View>

      {/* Empty State */}
      <View style={[styles.componentGroup, { marginBottom: spacing.xl }]}>
        <Text style={[styles.componentTitle, { fontSize: fontSize.md, marginBottom: spacing.md }]}>
          Empty State
        </Text>
        <View style={styles.emptyStateContainer}>
          <EmptyState
            icon="inbox"
            title="No messages yet"
            subtitle="Start a conversation to see your messages here"
            actionText="Compose Message"
            onAction={() => console.log('Compose pressed')}
          />
        </View>
      </View>
    </View>
  );

  const renderInteractiveComponents = () => (
    <View style={[styles.section, { padding: spacing.md }]}>
      <Text style={[styles.sectionTitle, { fontSize: fontSize.lg, marginBottom: spacing.lg }]}>
        Interactive Components
      </Text>

      {/* Search Bar */}
      <View style={[styles.componentGroup, { marginBottom: spacing.xl }]}>
        <Text style={[styles.componentTitle, { fontSize: fontSize.md, marginBottom: spacing.md }]}>
          Search Bar
        </Text>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search messages..."
          showFilter
          onFilter={() => console.log('Filter pressed')}
        />
      </View>

      {/* Buttons */}
      <View style={[styles.componentGroup, { marginBottom: spacing.xl }]}>
        <Text style={[styles.componentTitle, { fontSize: fontSize.md, marginBottom: spacing.md }]}>
          Action Buttons
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.demoButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowBottomSheet(true)}
          >
            <Text style={[styles.demoButtonText, { color: theme.colors.onPrimary }]}>
              Show Bottom Sheet
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.demoButton, { backgroundColor: theme.colors.secondary }]}
            onPress={() => setShowModal(true)}
          >
            <Text style={[styles.demoButtonText, { color: theme.colors.onSecondary }]}>
              Show Modal
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.demoButton, { backgroundColor: theme.colors.success, marginTop: spacing.sm }]}
          onPress={() => setShowNotification(true)}
        >
          <Text style={[styles.demoButtonText, { color: theme.colors.onPrimary }]}>
            Show Notification
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Bar Preview */}
      <View style={[styles.componentGroup, { marginBottom: spacing.xl }]}>
        <Text style={[styles.componentTitle, { fontSize: fontSize.md, marginBottom: spacing.md }]}>
          Tab Navigation
        </Text>
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabPress={setActiveTab}
          variant="pills"
        />
      </View>
    </View>
  );

  const renderAnimatedComponents = () => (
    <View style={[styles.section, { padding: spacing.md }]}>
      <Text style={[styles.sectionTitle, { fontSize: fontSize.lg, marginBottom: spacing.lg }]}>
        Animated Components
      </Text>

      {/* Animated Buttons */}
      <View style={[styles.componentGroup, { marginBottom: spacing.xl }]}>
        <Text style={[styles.componentTitle, { fontSize: fontSize.md, marginBottom: spacing.md }]}>
          Animated Buttons
        </Text>
        <View style={styles.animatedButtonsContainer}>
          <AnimatedButton
            title="Primary"
            onPress={() => console.log('Primary pressed')}
            variant="primary"
            icon="check"
            style={{ marginBottom: spacing.sm }}
          />
          <AnimatedButton
            title="Secondary"
            onPress={() => console.log('Secondary pressed')}
            variant="secondary"
            icon="arrow-right"
            iconPosition="right"
            style={{ marginBottom: spacing.sm }}
          />
          <AnimatedButton
            title="Outline"
            onPress={() => console.log('Outline pressed')}
            variant="outline"
            icon="heart"
            style={{ marginBottom: spacing.sm }}
          />
          <AnimatedButton
            title="Ghost"
            onPress={() => console.log('Ghost pressed')}
            variant="ghost"
            icon="star"
          />
        </View>
      </View>

      {/* Glass Card */}
      <View style={[styles.componentGroup, { marginBottom: spacing.xl }]}>
        <Text style={[styles.componentTitle, { fontSize: fontSize.md, marginBottom: spacing.md }]}>
          Glass Morphism Card
        </Text>
        <GlassCard style={[styles.glassCardDemo, { padding: spacing.lg }]}>
          <Feather name="layers" size={32} color={theme.colors.primary} />
          <Text style={[styles.glassCardTitle, { fontSize: fontSize.md, marginTop: spacing.sm }]}>
            Glass Effect
          </Text>
          <Text style={[styles.glassCardText, { fontSize: fontSize.sm, marginTop: spacing.xs }]}>
            Beautiful glass morphism effect with backdrop blur
          </Text>
        </GlassCard>
      </View>

      {/* Slide In Animation */}
      <View style={[styles.componentGroup, { marginBottom: spacing.xl }]}>
        <Text style={[styles.componentTitle, { fontSize: fontSize.md, marginBottom: spacing.md }]}>
          Slide In Animation
        </Text>
        <SlideInView direction="right" delay={500}>
          <View style={[styles.slideInDemo, { padding: spacing.md }]}>
            <Feather name="zap" size={24} color={theme.colors.warning} />
            <Text style={[styles.slideInText, { fontSize: fontSize.sm, marginLeft: spacing.sm }]}>
              This element slides in from the right!
            </Text>
          </View>
        </SlideInView>
      </View>

      {/* Pulse Animation */}
      <View style={[styles.componentGroup, { marginBottom: spacing.xl }]}>
        <Text style={[styles.componentTitle, { fontSize: fontSize.md, marginBottom: spacing.md }]}>
          Pulse Animation
        </Text>
        <PulseAnimation duration={2000}>
          <View style={[styles.pulseDemo, { padding: spacing.lg }]}>
            <Feather name="bell" size={24} color={theme.colors.info} />
            <Text style={[styles.pulseText, { fontSize: fontSize.sm, marginTop: spacing.sm }]}>
              Pulsing notification
            </Text>
          </View>
        </PulseAnimation>
      </View>
    </View>
  );

  const renderLayoutComponents = () => (
    <View style={[styles.section, { padding: spacing.md }]}>
      <Text style={[styles.sectionTitle, { fontSize: fontSize.lg, marginBottom: spacing.lg }]}>
        Layout Components
      </Text>

      {/* Device Info */}
      <View style={[styles.componentGroup, { marginBottom: spacing.xl }]}>
        <Text style={[styles.componentTitle, { fontSize: fontSize.md, marginBottom: spacing.md }]}>
          Device Information
        </Text>
        <View style={[styles.deviceInfo, { padding: spacing.md }]}>
          <Text style={[styles.deviceInfoText, { fontSize: fontSize.sm }]}>
            Device Type: {deviceSize}
          </Text>
          <Text style={[styles.deviceInfoText, { fontSize: fontSize.sm }]}>
            Screen Width: {screenWidth}px
          </Text>
          <Text style={[styles.deviceInfoText, { fontSize: fontSize.sm }]}>
            Font Scale: {fontSize.md}px
          </Text>
          <Text style={[styles.deviceInfoText, { fontSize: fontSize.sm }]}>
            Spacing Base: {spacing.md}px
          </Text>
        </View>
      </View>

      {/* Responsive Grid */}
      <View style={[styles.componentGroup, { marginBottom: spacing.xl }]}>
        <Text style={[styles.componentTitle, { fontSize: fontSize.md, marginBottom: spacing.md }]}>
          Responsive Grid
        </Text>
        <View style={styles.responsiveGrid}>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={[styles.gridItem, { padding: spacing.sm }]}>
              <Text style={[styles.gridItemText, { fontSize: fontSize.xs }]}>
                Item {i + 1}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'interactive':
        return renderInteractiveComponents();
      case 'animated':
        return renderAnimatedComponents();
      case 'layouts':
        return renderLayoutComponents();
      default:
        return renderUIComponents();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}>
        {onNavigateBack && (
          <TouchableOpacity
            style={[styles.backButton, { padding: spacing.xs }]}
            onPress={onNavigateBack}
          >
            <Feather name="arrow-left" size={24} color={theme.colors.onBackground} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { fontSize: fontSize.xl }]}>
          Component Showcase
        </Text>
      </View>

      {/* Tab Navigation */}
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabPress={setActiveTab}
        variant="underline"
      />

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderActiveTabContent()}
      </ScrollView>

      {/* Floating Action Button */}
      <FloatingActionButton
        icon="plus"
        onPress={() => console.log('FAB pressed')}
        label="Add Item"
      />

      {/* Bottom Sheet */}
      <BottomSheet
        visible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title="Bottom Sheet Example"
      >
        <View style={{ padding: spacing.md }}>
          <Text style={{ fontSize: fontSize.md, marginBottom: spacing.md }}>
            This is a bottom sheet component with smooth animations.
          </Text>
          <AnimatedButton
            title="Close Sheet"
            onPress={() => setShowBottomSheet(false)}
            variant="outline"
            fullWidth
          />
        </View>
      </BottomSheet>

      {/* Animated Modal */}
      <AnimatedModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title="Animated Modal"
        animationType="zoom"
      >
        <View style={{ padding: spacing.md }}>
          <Text style={{ fontSize: fontSize.md, marginBottom: spacing.lg }}>
            This modal has smooth zoom animations and backdrop blur.
          </Text>
          <AnimatedButton
            title="Got it!"
            onPress={() => setShowModal(false)}
            variant="primary"
            fullWidth
          />
        </View>
      </AnimatedModal>

      {/* Notification Banner */}
      <NotificationBanner
        visible={showNotification}
        type="success"
        title="Success!"
        message="Your action was completed successfully."
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
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    fontFamily: typography.fonts.bold,
    color: theme.colors.onBackground,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: typography.fonts.bold,
    color: theme.colors.onBackground,
  },
  componentGroup: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  componentTitle: {
    fontFamily: typography.fonts.semibold,
    color: theme.colors.onSurface,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  progressControls: {
    flexDirection: 'row',
  },
  progressButton: {
    backgroundColor: theme.colors.primaryAlpha,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  progressButtonText: {
    fontFamily: typography.fonts.medium,
    color: theme.colors.primary,
    fontSize: 12,
  },
  statsGrid: {
    gap: theme.spacing.md,
  },
  emptyStateContainer: {
    height: 200,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  demoButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  demoButtonText: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
  },
  animatedButtonsContainer: {
    gap: theme.spacing.sm,
  },
  glassCardDemo: {
    alignItems: 'center',
    backgroundColor: theme.colors.primaryAlpha,
    borderRadius: theme.borderRadius.lg,
  },
  glassCardTitle: {
    fontFamily: typography.fonts.bold,
    color: theme.colors.onBackground,
  },
  glassCardText: {
    fontFamily: typography.fonts.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  slideInDemo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warningAlpha,
    borderRadius: theme.borderRadius.md,
  },
  slideInText: {
    fontFamily: typography.fonts.medium,
    color: theme.colors.onBackground,
  },
  pulseDemo: {
    alignItems: 'center',
    backgroundColor: theme.colors.infoAlpha,
    borderRadius: theme.borderRadius.lg,
  },
  pulseText: {
    fontFamily: typography.fonts.medium,
    color: theme.colors.onBackground,
  },
  deviceInfo: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
  },
  deviceInfoText: {
    fontFamily: typography.fonts.mono,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  responsiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  gridItem: {
    flex: 1,
    minWidth: 100,
    backgroundColor: theme.colors.primaryAlpha,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1,
  },
  gridItemText: {
    fontFamily: typography.fonts.medium,
    color: theme.colors.primary,
  },
});
