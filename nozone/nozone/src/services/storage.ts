import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { Message, User, AppSettings } from '../types';

const KEYS = {
  MESSAGES: '@nozone_messages',
  USER: '@nozone_user',
  SETTINGS: '@nozone_settings',
  LAST_SYNC: '@nozone_last_sync',
  DRAFTS: '@nozone_drafts',
  DAILY_OPEN: '@nozone_daily_open', // JSON: { date: 'YYYY-MM-DD', count: number }
  DAILY_OPEN_HISTORY: '@nozone_daily_open_history', // JSON: { [date]: count }
};

// Shape of a saved draft. We keep this local (not exported) to avoid leaking into domain types
// and to allow evolution without breaking external imports.
interface DraftRecord {
  text: string;
  selectedDelay: number; // same semantics as UI (minutes; -1 = custom date; 0 = immediate)
  customDate?: string; // ISO string for custom scheduled date
  updatedAt: string; // ISO timestamp
}

export class StorageService {
  // Simple in-memory listener set for message change subscriptions
  private static messageListeners: Set<() => void> = new Set();

  static onMessagesChanged(listener: () => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  private static emitMessagesChanged() {
    // Fire and forget; swallow individual listener errors
    this.messageListeners.forEach(l => {
      try { l(); } catch (e) { /* noop */ }
    });
  // Also emit over RN DeviceEventEmitter for cross-hook reliability
  try { DeviceEventEmitter.emit('messagesChanged'); } catch (e) { /* noop */ }
  }
  // Messages
  static async getMessages(userId?: string): Promise<Message[]> {
    try {
      const messagesJson = await AsyncStorage.getItem(KEYS.MESSAGES);
      if (!messagesJson) return [];
      
      const messages = JSON.parse(messagesJson);
      return messages.map((msg: any) => ({
        ...msg,
        deliverAfter: new Date(msg.deliverAfter),
        createdAt: new Date(msg.createdAt),
        updatedAt: msg.updatedAt ? new Date(msg.updatedAt) : undefined,
      }));
    } catch (error) {
      console.error('Error getting messages from storage:', error);
      return [];
    }
  }

  static async saveMessages(messages: Message[]): Promise<void> {
    try {
      const messagesJson = JSON.stringify(messages);
      await AsyncStorage.setItem(KEYS.MESSAGES, messagesJson);
  this.emitMessagesChanged();
    } catch (error) {
      console.error('Error saving messages to storage:', error);
      throw error;
    }
  }

  static async addMessage(message: Message): Promise<void> {
    try {
      const messages = await this.getMessages();
      messages.unshift(message); // Add to beginning
      await this.saveMessages(messages);
  // saveMessages already emits
    } catch (error) {
      console.error('Error adding message to storage:', error);
      throw error;
    }
  }

  static async updateMessage(messageId: string, updates: Partial<Message>): Promise<void>;
  static async updateMessage(userId: string, messageId: string, updates: Partial<Message>): Promise<void>;
  static async updateMessage(messageIdOrUserId: string, updatesOrMessageId?: string | Partial<Message>, updates?: Partial<Message>): Promise<void> {
    try {
      // Handle both signatures
      const messageId = typeof updatesOrMessageId === 'string' && typeof updatesOrMessageId === 'string' && updates 
        ? updatesOrMessageId as string
        : messageIdOrUserId;
      const messageUpdates = updates || (typeof updatesOrMessageId === 'object' ? updatesOrMessageId : {}) as Partial<Message>;

      const messages = await this.getMessages();
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      
      if (messageIndex >= 0) {
        messages[messageIndex] = { 
          ...messages[messageIndex], 
          ...messageUpdates,
          updatedAt: new Date()
        };
        await this.saveMessages(messages);
  // saveMessages emits
      }
    } catch (error) {
      console.error('Error updating message in storage:', error);
      throw error;
    }
  }

  static async deleteMessage(messageId: string): Promise<void>;
  static async deleteMessage(userId: string, messageId: string): Promise<void>;
  static async deleteMessage(messageIdOrUserId: string, messageId?: string): Promise<void> {
    try {
      const id = messageId || messageIdOrUserId;
      const messages = await this.getMessages();
      const filteredMessages = messages.filter(msg => msg.id !== id);
      await this.saveMessages(filteredMessages);
  // saveMessages emits
    } catch (error) {
      console.error('Error deleting message from storage:', error);
      throw error;
    }
  }

  static async saveMessage(userId: string, message: Message): Promise<void> {
    try {
      await this.addMessage(message);
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  static async clearMessages(userId: string): Promise<void> {
    try {
      await this.saveMessages([]);
  // saveMessages emits
    } catch (error) {
      console.error('Error clearing messages:', error);
      throw error;
    }
  }

  // User
  static async getUser(): Promise<User | null> {
    try {
      const userJson = await AsyncStorage.getItem(KEYS.USER);
      if (!userJson) return null;
      
      const user = JSON.parse(userJson);
      return {
        ...user,
        createdAt: new Date(user.createdAt),
      };
    } catch (error) {
      console.error('Error getting user from storage:', error);
      return null;
    }
  }

  static async saveUser(user: User): Promise<void> {
    try {
      const userJson = JSON.stringify(user);
      await AsyncStorage.setItem(KEYS.USER, userJson);
    } catch (error) {
      console.error('Error saving user to storage:', error);
      throw error;
    }
  }

  static async clearUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.USER);
    } catch (error) {
      console.error('Error clearing user from storage:', error);
      throw error;
    }
  }

  // Settings
  static async getSettings(): Promise<AppSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem(KEYS.SETTINGS);
      if (!settingsJson) {
        return {
          autoSync: true,
          darkMode: true,
          notificationsEnabled: true,
          retryFailedMessages: true,
          maxRetryAttempts: 3,
        };
      }
      
      return JSON.parse(settingsJson);
    } catch (error) {
      console.error('Error getting settings from storage:', error);
      return {
        autoSync: true,
        darkMode: true,
        notificationsEnabled: true,
        retryFailedMessages: true,
        maxRetryAttempts: 3,
      };
    }
  }

  static async saveSettings(settings: AppSettings): Promise<void> {
    try {
      const settingsJson = JSON.stringify(settings);
      await AsyncStorage.setItem(KEYS.SETTINGS, settingsJson);
    } catch (error) {
      console.error('Error saving settings to storage:', error);
      throw error;
    }
  }

  // Last sync timestamp
  static async getLastSync(): Promise<Date | null> {
    try {
      const lastSyncJson = await AsyncStorage.getItem(KEYS.LAST_SYNC);
      return lastSyncJson ? new Date(JSON.parse(lastSyncJson)) : null;
    } catch (error) {
      console.error('Error getting last sync from storage:', error);
      return null;
    }
  }

  static async setLastSync(date: Date): Promise<void> {
    try {
      const lastSyncJson = JSON.stringify(date.toISOString());
      await AsyncStorage.setItem(KEYS.LAST_SYNC, lastSyncJson);
  try { DeviceEventEmitter.emit('lastSyncUpdated', date.toISOString()); } catch (e) { /* noop */ }
    } catch (error) {
      console.error('Error setting last sync in storage:', error);
      throw error;
    }
  }

  static async storeUser(user: User): Promise<void> {
    return this.saveUser(user);
  }

  // Clear all data
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.MESSAGES,
        KEYS.USER,
        KEYS.SETTINGS,
        KEYS.LAST_SYNC,
  KEYS.DRAFTS,
  KEYS.DAILY_OPEN,
      ]);
    } catch (error) {
      console.error('Error clearing all data from storage:', error);
      throw error;
    }
  }

  // New enhanced methods for the improved settings screen
  static async getAppSettings(): Promise<any> {
    return this.getSettings();
  }

  static async saveAppSettings(settings: any): Promise<void> {
    return this.saveSettings(settings);
  }

  static async exportUserData(userId: string): Promise<any> {
    try {
      const messages = await this.getMessages(userId);
      const user = await this.getUser();
      const settings = await this.getSettings();
      const lastSync = await this.getLastSync();

      return {
        user,
        messages,
        settings,
        lastSync,
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  // -------------------- Draft Persistence -------------------- //
  // Drafts are stored in a single object keyed by recipient identifier (username preferred).
  // { [recipientKey: string]: DraftRecord }
  static async getAllDrafts(): Promise<Record<string, DraftRecord>> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.DRAFTS);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return {};
      return parsed;
    } catch (e) {
      console.error('Error reading drafts from storage', e);
      return {};
    }
  }

  static async getDraft(recipientKey: string): Promise<DraftRecord | null> {
    const drafts = await this.getAllDrafts();
    return drafts[recipientKey] || null;
  }

  static async saveDraft(recipientKey: string, draft: Omit<DraftRecord, 'updatedAt'>): Promise<void> {
    try {
      const drafts = await this.getAllDrafts();
      drafts[recipientKey] = { ...draft, updatedAt: new Date().toISOString() };
      await AsyncStorage.setItem(KEYS.DRAFTS, JSON.stringify(drafts));
    } catch (e) {
      console.error('Error saving draft', e);
    }
  }

  static async clearDraft(recipientKey: string): Promise<void> {
    try {
      const drafts = await this.getAllDrafts();
      if (drafts[recipientKey]) {
        delete drafts[recipientKey];
        await AsyncStorage.setItem(KEYS.DRAFTS, JSON.stringify(drafts));
      }
    } catch (e) {
      console.error('Error clearing draft', e);
    }
  }

  // -------------------- Daily App Open Count -------------------- //
  static async incrementDailyOpenCount(): Promise<number> {
    try {
      const today = new Date().toISOString().slice(0,10); // YYYY-MM-DD
      const raw = await AsyncStorage.getItem(KEYS.DAILY_OPEN);
      let record: { date: string; count: number } = raw ? JSON.parse(raw) : { date: today, count: 0 };
      if (record.date !== today) {
        record = { date: today, count: 0 };
      }
      record.count += 1;
      await AsyncStorage.setItem(KEYS.DAILY_OPEN, JSON.stringify(record));

      // Update history map
      let streak = 1;
      try {
        const historyRaw = await AsyncStorage.getItem(KEYS.DAILY_OPEN_HISTORY);
        let history: Record<string, number> = historyRaw ? JSON.parse(historyRaw) : {};
        history[today] = (history[today] || 0) + 1;
        // Prune to last 60 days to cap size
        const dates = Object.keys(history).sort();
        if (dates.length > 60) {
          const excess = dates.length - 60;
          for (let i=0;i<excess;i++) delete history[dates[i]];
        }
        await AsyncStorage.setItem(KEYS.DAILY_OPEN_HISTORY, JSON.stringify(history));
        // Compute streak locally to emit (avoid extra read)
        const todayDate = new Date();
        streak = 0;
        for (let offset=0; offset<365; offset++) {
          const d = new Date(todayDate.getTime() - offset*86400000);
            const key = d.toISOString().slice(0,10);
            if (history[key]) streak++; else break;
        }
      } catch (e) { /* ignore history errors */ }

      try { DeviceEventEmitter.emit('dailyOpenCountUpdated', record.count); } catch (e) { /* noop */ }
      try { DeviceEventEmitter.emit('activeStreakUpdated', streak); } catch (e) { /* noop */ }
      return record.count;
    } catch (e) {
      console.error('Error incrementing daily open count', e);
      return 0;
    }
  }

  static async getDailyOpenCount(): Promise<number> {
    try {
      const today = new Date().toISOString().slice(0,10);
      const raw = await AsyncStorage.getItem(KEYS.DAILY_OPEN);
      if (!raw) return 0;
      const record = JSON.parse(raw);
      if (record.date !== today) return 0;
      return typeof record.count === 'number' ? record.count : 0;
    } catch (e) {
      console.error('Error reading daily open count', e);
      return 0;
    }
  }

  static async getActiveDayStreak(): Promise<number> {
    try {
      const today = new Date();
      const historyRaw = await AsyncStorage.getItem(KEYS.DAILY_OPEN_HISTORY);
      if (!historyRaw) return 0;
      const history: Record<string, number> = JSON.parse(historyRaw);
      let streak = 0;
      for (let offset = 0; offset < 365; offset++) { // hard cap 1 year
        const d = new Date(today.getTime() - offset * 86400000);
        const key = d.toISOString().slice(0,10);
        const count = history[key];
        if (count && count > 0) streak += 1; else break;
      }
      return streak;
    } catch (e) {
      return 0;
    }
  }
}
