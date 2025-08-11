import { Message, User } from '../types';
import { StorageService } from './storage';
import { SupabaseService } from './supabase';
import { NetworkService } from './network';
import { NotificationService } from './notifications';
import { isMessageDue } from '../utils/helpers';

export class SyncService {
  private static syncInProgress = false;
  private static backgroundSyncInterval: NodeJS.Timeout | null = null;

  static async performSync(user: User): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (this.syncInProgress) {
      return { success: false, syncedCount: 0, error: 'Sync already in progress' };
    }

    if (!NetworkService.isOnline()) {
      return { success: false, syncedCount: 0, error: 'No internet connection' };
    }

    this.syncInProgress = true;

    try {
      // Get local messages
      const localMessages = await StorageService.getMessages();
      
      // Filter messages that need to be synced (pending and due for delivery)
      const messagesToSync = localMessages.filter(msg => 
        msg.status === 'pending' && isMessageDue(msg.deliverAfter)
      );

      if (messagesToSync.length === 0) {
        await StorageService.setLastSync(new Date());
        return { success: true, syncedCount: 0 };
      }

      // Sync messages to Supabase
      await SupabaseService.syncMessages(messagesToSync);

      // Update message statuses to 'sent'
      const updatedMessages = localMessages.map(msg => {
        if (messagesToSync.find(syncMsg => syncMsg.id === msg.id)) {
          return { ...msg, status: 'sent' as const, updatedAt: new Date() };
        }
        return msg;
      });

      // Save updated messages
      await StorageService.saveMessages(updatedMessages);

      // Update last sync timestamp
      await StorageService.setLastSync(new Date());

      // Send notification about successful sync
      if (messagesToSync.length > 0) {
        await NotificationService.sendSyncNotification(messagesToSync.length);
        
        // Send individual delivery notifications
        for (const message of messagesToSync) {
          await NotificationService.sendImmediateNotification(message.text);
        }
      }

      return { success: true, syncedCount: messagesToSync.length };

    } catch (error) {
      console.error('Sync error:', error);
      
      // Mark failed messages
      const localMessages = await StorageService.getMessages();
      const updatedMessages = localMessages.map(msg => {
        if (msg.status === 'pending' && isMessageDue(msg.deliverAfter)) {
          return { ...msg, status: 'failed' as const, updatedAt: new Date() };
        }
        return msg;
      });
      
      await StorageService.saveMessages(updatedMessages);

      return { 
        success: false, 
        syncedCount: 0, 
        error: error instanceof Error ? error.message : 'Unknown sync error' 
      };

    } finally {
      this.syncInProgress = false;
    }
  }

  static async startBackgroundSync(user: User, intervalMinutes: number = 10): Promise<void> {
    // Clear existing interval
    if (this.backgroundSyncInterval) {
      clearInterval(this.backgroundSyncInterval);
    }

    // Set up new interval
    this.backgroundSyncInterval = setInterval(async () => {
      try {
        const settings = await StorageService.getSettings();
        if (settings.autoSync && NetworkService.isOnline()) {
          await this.performSync(user);
        }
      } catch (error) {
        console.error('Background sync error:', error);
      }
    }, intervalMinutes * 60 * 1000);

    // Perform initial sync
    const settings = await StorageService.getSettings();
    if (settings.autoSync && NetworkService.isOnline()) {
      setTimeout(() => this.performSync(user), 1000);
    }
  }

  static stopBackgroundSync(): void {
    if (this.backgroundSyncInterval) {
      clearInterval(this.backgroundSyncInterval);
      this.backgroundSyncInterval = null;
    }
  }

  static async syncOnNetworkReconnect(user: User): Promise<void> {
    // Set up network listener for auto-sync on reconnection
    NetworkService.addListener(async (status) => {
      if (status.isConnected && status.isInternetReachable !== false) {
        const settings = await StorageService.getSettings();
        if (settings.autoSync) {
          // Wait a bit for connection to stabilize
          setTimeout(() => this.performSync(user), 2000);
        }
      }
    });
  }

  static isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  static async getNextSyncTime(): Promise<Date | null> {
    try {
      const messages = await StorageService.getMessages();
      const pendingMessages = messages.filter(msg => msg.status === 'pending');
      
      if (pendingMessages.length === 0) {
        return null;
      }

      // Find the earliest delivery time
      const nextDelivery = pendingMessages.reduce((earliest, msg) => {
        return msg.deliverAfter < earliest ? msg.deliverAfter : earliest;
      }, pendingMessages[0].deliverAfter);

      return nextDelivery;
    } catch (error) {
      console.error('Error getting next sync time:', error);
      return null;
    }
  }

  static async getPendingMessageCount(): Promise<number> {
    try {
      const messages = await StorageService.getMessages();
      return messages.filter(msg => msg.status === 'pending').length;
    } catch (error) {
      console.error('Error getting pending message count:', error);
      return 0;
    }
  }

  static async getDueMessageCount(): Promise<number> {
    try {
      const messages = await StorageService.getMessages();
      return messages.filter(msg => 
        msg.status === 'pending' && isMessageDue(msg.deliverAfter)
      ).length;
    } catch (error) {
      console.error('Error getting due message count:', error);
      return 0;
    }
  }

  static async syncPendingMessages(userId: string): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    const user = { id: userId } as User; // Minimal user object for sync
    return await this.performSync(user);
  }

  static async enableAutoSync(userId: string): Promise<void> {
    try {
      const settings = await StorageService.getSettings();
      await StorageService.saveSettings({ ...settings, autoSync: true });
      
      // Start background sync if not already running
      const user = { id: userId } as User;
      await this.startBackgroundSync(user);
    } catch (error) {
      console.error('Error enabling auto sync:', error);
      throw error;
    }
  }

  static async disableAutoSync(userId: string): Promise<void> {
    try {
      const settings = await StorageService.getSettings();
      await StorageService.saveSettings({ ...settings, autoSync: false });
      
      // Stop background sync
      this.stopBackgroundSync();
    } catch (error) {
      console.error('Error disabling auto sync:', error);
      throw error;
    }
  }

  static async retryFailedMessages(userId: string): Promise<void> {
    try {
      const messages = await StorageService.getMessages();
      const failedMessages = messages.filter(msg => msg.status === 'failed');
      
      // Reset failed messages to pending
      const updatedMessages = messages.map(msg => {
        if (msg.status === 'failed') {
          return { ...msg, status: 'pending' as const, updatedAt: new Date() };
        }
        return msg;
      });
      
      await StorageService.saveMessages(updatedMessages);
      
      // Trigger sync
      const user = { id: userId } as User;
      await this.performSync(user);
    } catch (error) {
      console.error('Error retrying failed messages:', error);
      throw error;
    }
  }
}
