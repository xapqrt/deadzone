import React, { useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Keyboard, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, withSpring, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { theme } from '../utils/theme';

export interface UserSearchResult {
  id: string;
  username: string;
  name: string;
  lastActive?: Date;
  isOnline?: boolean;
}

interface Props {
  recipientUsername: string;
  onRecipientUsernameChange: (value: string) => void;
  searchResults: UserSearchResult[];
  loading: boolean;
  selectedUser: UserSearchResult | null;
  onSelectUser: (u: UserSearchResult) => void;
  onClearSelected: () => void;
  onStartDirectChat?: () => void;
}

export const UserSearchSection: React.FC<Props> = ({
  recipientUsername,
  onRecipientUsernameChange,
  searchResults,
  loading,
  selectedUser,
  onSelectUser,
  onClearSelected,
  onStartDirectChat,
}) => {
  const dropdownHeight = useSharedValue(0);

  const dropdownAnimatedStyle = useAnimatedStyle(() => ({
    height: dropdownHeight.value,
    opacity: dropdownHeight.value > 0 ? 1 : 0,
  }));

  const renderUserItem = ({ item }: { item: UserSearchResult }) => (
    <Animated.View entering={FadeInDown.delay(100)}>
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => {
          onSelectUser(item);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Toast.show({ type: 'success', text1: 'User Selected', text2: `Ready to send to ${item.name}`, visibilityTime: 2000 });
        }}
      >
        <View style={styles.userInfo}>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userUsername}>@{item.username}</Text>
          </View>
          <View style={styles.userStatus}>
            <View style={[styles.statusDot, { backgroundColor: item.isOnline ? theme.colors.success : theme.colors.textMuted }]} />
            <Text style={styles.statusText}>{item.isOnline ? 'Online' : 'Offline'}</Text>
          </View>
        </View>
        <Feather name="arrow-right" size={16} color={theme.colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionTitle}>Send To</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.usernameInput}
          value={recipientUsername}
          onChangeText={onRecipientUsernameChange}
          placeholder="Type username to search..."
          placeholderTextColor={'#64748B'}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loading && (
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        )}
        {selectedUser && (
          <TouchableOpacity style={styles.directChatButton} onPress={onStartDirectChat}>
            <Feather name="message-circle" size={16} color={'#16A34A'} />
            <Text style={styles.directChatText}>Chat Now</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dropdown */}
      {searchResults.length > 0 && !selectedUser && (
        <Animated.View style={[styles.dropdown, dropdownAnimatedStyle]}
          onLayout={() => {
            dropdownHeight.value = withSpring(Math.min(searchResults.length * 60, 300));
          }}
        >
          <FlatList
            data={searchResults}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={searchResults.length > 4}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      )}

      {/* Selected User Preview */}
      {selectedUser && (
        <Animated.View entering={FadeInDown} style={styles.selectedUserPreview}>
          <View style={styles.selectedUserInfo}>
            <Feather name="user" size={16} color={theme.colors.primary} />
            <Text style={styles.selectedUserText}>
              Sending to: {selectedUser.name} (@{selectedUser.username})
            </Text>
          </View>
          <TouchableOpacity onPress={onClearSelected} accessibilityLabel="Clear selected user" accessibilityRole="button">
            <Feather name="x" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginVertical: theme.spacing.lg },
  sectionTitle: { fontSize: theme.fontSizes.lg, fontFamily: theme.fonts.bold, color: '#065F46', marginBottom: theme.spacing.md },
  inputContainer: { backgroundColor: '#FFFFFF', borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: {width:0,height:2}, shadowOpacity:1, shadowRadius:4 },
  usernameInput: { fontSize: theme.fontSizes.md, fontFamily: theme.fonts.regular, color: '#065F46', padding: theme.spacing.md, borderRadius: theme.borderRadius.lg },
  loadingIcon: { position: 'absolute', right: theme.spacing.md, top: theme.spacing.md },
  directChatButton: { position: 'absolute', right: theme.spacing.md, top: theme.spacing.md, flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.sm },
  directChatText: { fontSize: theme.fontSizes.sm, fontFamily: theme.fonts.medium, color: '#16A34A', marginLeft: theme.spacing.xs },
  dropdown: { backgroundColor: '#FFFFFF', borderRadius: theme.borderRadius.lg, marginTop: theme.spacing.xs, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: {width:0,height:3}, shadowOpacity:1, shadowRadius:6 },
  userItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  userInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userDetails: { flex: 1 },
  userName: { fontSize: theme.fontSizes.md, fontFamily: theme.fonts.medium, color: '#065F46' },
  userUsername: { fontSize: theme.fontSizes.sm, fontFamily: theme.fonts.regular, color: '#64748B' },
  userStatus: { flexDirection: 'row', alignItems: 'center', marginLeft: theme.spacing.md },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: theme.spacing.xs },
  statusText: { fontSize: theme.fontSizes.xs, fontFamily: theme.fonts.regular, color: '#64748B' },
  selectedUserPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#DCFCE7', padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, marginTop: theme.spacing.sm },
  selectedUserInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  selectedUserText: { fontSize: theme.fontSizes.sm, fontFamily: theme.fonts.medium, color: '#16A34A', marginLeft: theme.spacing.sm },
});

export default UserSearchSection;
