import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInRight,
  SlideOutRight,
  Layout,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useLocalMessages } from '../hooks/useLocalMessages';
import { MessageCard } from '../components/MessageCard';
import { Message, User } from '../types';
import { theme } from '../utils/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface QueueScreenProps {
  user: User;
  onBack: () => void;
  onEditMessage: (message: Message) => void;
}

export const QueueScreen: React.FC<QueueScreenProps> = ({
  user,
  onBack,
  onEditMessage,
}) => {
  const { messages, loading, stats, actions } = useLocalMessages(user.id);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'sent' | 'failed'>('all');

  const filterOptions = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'pending', label: 'Pending', count: stats.pending },
    { key: 'sent', label: 'Sent', count: stats.sent },
    { key: 'failed', label: 'Failed', count: stats.failed },
  ];

  const filteredMessages = messages.filter(message => {
    if (selectedFilter === 'all') return true;
    return message.status === selectedFilter;
  });

  const handleDeleteMessage = (message: Message) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await actions.deleteMessage(message.id);
              Toast.show({
                type: 'success',
                text1: 'Message Deleted',
                text2: 'Message has been removed from queue',
              });
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Delete Failed',
                text2: 'Could not delete message. Please try again.',
              });
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <Animated.View
      entering={SlideInRight.delay(index * 100)}
      exiting={SlideOutRight}
      layout={Layout.springify()}
    >
      <MessageCard
        message={item}
        onEdit={() => onEditMessage(item)}
        onDelete={() => handleDeleteMessage(item)}
      />
    </Animated.View>
  );

  const renderEmptyState = () => (
    <Animated.View entering={FadeIn.delay(300)} style={styles.emptyState}>
      <Feather name="inbox" size={64} color={theme.colors.textMuted} />
      <Text style={styles.emptyTitle}>
        {selectedFilter === 'all' 
          ? 'No messages yet' 
          : `No ${selectedFilter} messages`}
      </Text>
      <Text style={styles.emptySubtitle}>
        {selectedFilter === 'all'
          ? 'Start by composing your first message'
          : `You don't have any ${selectedFilter} messages`}
      </Text>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#F0FDF4', '#FFFFFF']} style={styles.gradientBg} start={{x:0,y:0}} end={{x:1,y:1}} />
      {/* Header */}
      <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Feather name="arrow-left" size={24} color={'#065F46'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Message Queue</Text>
        <View style={styles.placeholder} />
      </Animated.View>

      {/* Filter Tabs */}
  <Animated.View entering={SlideInRight.delay(200)} style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterOptions}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterTab,
                selectedFilter === item.key && styles.filterTabActive,
              ]}
              onPress={() => setSelectedFilter(item.key as any)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedFilter === item.key && styles.filterTabTextActive,
                ]}
              >
                {item.label}
              </Text>
              {item.count > 0 && (
                <View
                  style={[
                    styles.filterBadge,
                    selectedFilter === item.key && styles.filterBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterBadgeText,
                      selectedFilter === item.key && styles.filterBadgeTextActive,
                    ]}
                  >
                    {item.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      </Animated.View>

      {/* Messages List */}
      <View style={styles.messagesContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : filteredMessages.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesList}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>

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
    borderColor: '#BBF7D0',
  },
  headerTitle: {
    fontSize: theme.fontSizes.xl,
    fontFamily: theme.fonts.bold,
    color: '#065F46',
  },
  placeholder: {
    width: 40,
  },
  filterContainer: { paddingVertical: theme.spacing.md },
  filterList: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.round,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width:0, height:2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterTabActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  filterTabText: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
    color: '#065F46',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#16A34A',
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    marginLeft: theme.spacing.xs,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  filterBadgeText: {
    fontSize: theme.fontSizes.xs,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
  },
  filterBadgeTextActive: {
    color: '#16A34A',
  },
  messagesContainer: {
    flex: 1,
  },
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSizes.xl,
    fontFamily: theme.fonts.bold,
    color: '#065F46',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  messagesList: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  separator: {
    height: theme.spacing.sm,
  },
});
