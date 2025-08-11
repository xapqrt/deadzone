import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { NetworkService } from './network';
import { SupabaseService } from './supabase';
import { ErrorService } from './errorService';
import { DirectMessage } from '../types';

interface QueuedMessage {
  id: string;
  message: DirectMessage;
  retryCount: number;
  lastAttempt: Date;
  nextRetry: Date;
  priority: number; // 1 = highest, 5 = lowest
}

interface QueueStats {
  total: number;
  pending: number;
  failed: number;
  retrying: number;
}

export class OfflineQueueService {
  private static readonly QUEUE_KEY = '@nozone_message_queue';
  private static readonly MAX_RETRIES = 5;
  private static readonly RETRY_INTERVALS = [1, 5, 15, 60, 300]; // minutes
  private static queue: QueuedMessage[] = [];
  private static isProcessing = false;
  private static processingTimer: NodeJS.Timeout | null = null;
  private static emitChange() {
    try { DeviceEventEmitter.emit('offlineQueueChanged'); } catch {}
  }

  /**
   * Initialize the queue service
   */
  static async initialize(): Promise<void> {
    try {
      await this.loadQueue();
      await this.startProcessing();
    } catch (error) {
      ErrorService.handleError(error, 'OfflineQueue initialization', false);
    }
  }

  /**
   * Add message to offline queue
   */
  static async addMessage(message: DirectMessage, priority = 3): Promise<void> {
    try {
      const queuedMessage: QueuedMessage = {
        id: message.id,
        message,
        retryCount: 0,
        lastAttempt: new Date(0), // Never attempted
        nextRetry: new Date(), // Try immediately
        priority,
      };

      this.queue.push(queuedMessage);
      this.queue.sort((a, b) => a.priority - b.priority); // Sort by priority
      
  await this.saveQueue();
  this.emitChange();
      
      // Try to process immediately if online
      const networkStatus = await NetworkService.getCurrentStatus();
      if (networkStatus.isConnected) {
        this.processQueue();
      }
    } catch (error) {
      ErrorService.handleError(error, 'Adding message to queue', false);
    }
  }

  /**
   * Remove message from queue
   */
  static async removeMessage(messageId: string): Promise<void> {
    try {
      this.queue = this.queue.filter(item => item.id !== messageId);
  await this.saveQueue();
  this.emitChange();
    } catch (error) {
      ErrorService.handleError(error, 'Removing message from queue', false);
    }
  }

  /**
   * Get queue statistics
   */
  static getStats(): QueueStats {
    const total = this.queue.length;
    const failed = this.queue.filter(item => item.retryCount >= this.MAX_RETRIES).length;
    const retrying = this.queue.filter(item => 
      item.retryCount > 0 && item.retryCount < this.MAX_RETRIES
    ).length;
    const pending = total - failed - retrying;

    return { total, pending, failed, retrying };
  }

  /**
   * Get all queued messages
   */
  static getQueuedMessages(): QueuedMessage[] {
    return [...this.queue];
  }

  /**
   * Retry failed messages
   */
  static async retryFailedMessages(): Promise<number> {
    try {
      const failedMessages = this.queue.filter(item => item.retryCount >= this.MAX_RETRIES);
      let retriedCount = 0;

      for (const queuedMessage of failedMessages) {
        queuedMessage.retryCount = 0;
        queuedMessage.nextRetry = new Date();
        retriedCount++;
      }

      if (retriedCount > 0) {
  await this.saveQueue();
        this.processQueue();
  this.emitChange();
      }

      return retriedCount;
    } catch (error) {
      ErrorService.handleError(error, 'Retrying failed messages', false);
      return 0;
    }
  }

  /**
   * Clear all messages from queue
   */
  static async clearQueue(): Promise<void> {
    try {
  this.queue = [];
  await this.saveQueue();
  this.emitChange();
    } catch (error) {
      ErrorService.handleError(error, 'Clearing queue', false);
    }
  }

  /**
   * Process the queue
   */
  private static async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;

    try {
      const now = new Date();
      const networkStatus = await NetworkService.getCurrentStatus();
      const isOnline = networkStatus.isConnected;

      if (!isOnline) {
        this.isProcessing = false;
        return;
      }

      // Get messages ready to be processed
      const readyMessages = this.queue.filter(item => 
        item.nextRetry <= now && item.retryCount < this.MAX_RETRIES
      );

      for (const queuedMessage of readyMessages) {
        try {
          await this.sendMessage(queuedMessage);
          await this.removeMessage(queuedMessage.id);
        } catch (error) {
          await this.handleSendFailure(queuedMessage, error);
        }
      }

  await this.saveQueue();
  this.emitChange();
    } catch (error) {
      ErrorService.handleError(error, 'Processing queue', false);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send a single message
   */
  private static async sendMessage(queuedMessage: QueuedMessage): Promise<void> {
    const { message } = queuedMessage;
    
    // Update attempt info
    queuedMessage.lastAttempt = new Date();
    queuedMessage.retryCount++;

    // Try to send the message
    // Need recipient username to use sendDirectMessage; fallback: attempt conversation send if conversationId exists.
    try {
      if (message.conversationId) {
        await SupabaseService.sendMessageToConversation(message.conversationId, message.senderId, message.messageText);
      } else {
        throw new Error('Missing conversationId for queued message');
      }
    } catch (e) {
      throw e;
    }
  }

  /**
   * Handle send failure
   */
  private static async handleSendFailure(queuedMessage: QueuedMessage, error: any): Promise<void> {
    const retryCount = queuedMessage.retryCount;

    if (retryCount >= this.MAX_RETRIES) {
      // Mark as permanently failed
      queuedMessage.message.status = 'failed';
      ErrorService.handleError(error, `Message ${queuedMessage.id} permanently failed`, false);
      return;
    }

    // Schedule next retry
    const retryDelayMinutes = this.RETRY_INTERVALS[Math.min(retryCount - 1, this.RETRY_INTERVALS.length - 1)];
    queuedMessage.nextRetry = new Date(Date.now() + retryDelayMinutes * 60 * 1000);
    
    ErrorService.handleError(error, `Message ${queuedMessage.id} failed, retry in ${retryDelayMinutes}m`, false);
  }

  /**
   * Start automatic processing
   */
  private static async startProcessing(): Promise<void> {
    // Process immediately
    this.processQueue();

    // Set up periodic processing
    this.processingTimer = setInterval(() => {
      this.processQueue();
    }, 30000); // Check every 30 seconds

    // Listen for network changes
    NetworkService.addListener((status) => {
      if (status.isConnected && this.queue.length > 0) {
        this.processQueue();
      }
    });
  }

  /**
   * Stop automatic processing
   */
  static stopProcessing(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
  }

  /**
   * Load queue from storage
   */
  private static async loadQueue(): Promise<void> {
    try {
      const queueJson = await AsyncStorage.getItem(this.QUEUE_KEY);
      if (queueJson) {
        const queue = JSON.parse(queueJson);
        this.queue = queue.map((item: any) => ({
          ...item,
          lastAttempt: new Date(item.lastAttempt),
          nextRetry: new Date(item.nextRetry),
          message: {
            ...item.message,
            createdAt: new Date(item.message.createdAt),
            deliverAfter: new Date(item.message.deliverAfter),
            deliveredAt: item.message.deliveredAt ? new Date(item.message.deliveredAt) : undefined,
            readAt: item.message.readAt ? new Date(item.message.readAt) : undefined,
            updatedAt: item.message.updatedAt ? new Date(item.message.updatedAt) : undefined,
          },
        }));
      }
    } catch (error) {
      ErrorService.handleError(error, 'Loading queue from storage', false);
      this.queue = [];
    }
  }

  /**
   * Save queue to storage
   */
  private static async saveQueue(): Promise<void> {
    try {
      const queueJson = JSON.stringify(this.queue);
      await AsyncStorage.setItem(this.QUEUE_KEY, queueJson);
    } catch (error) {
      ErrorService.handleError(error, 'Saving queue to storage', false);
    }
  }

  /**
   * Force process queue (for manual sync)
   */
  static async forceProcess(): Promise<{ success: boolean; processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    try {
      const networkStatus = await NetworkService.getCurrentStatus();
      const isOnline = networkStatus.isConnected;
      
      if (!isOnline) {
        return { success: false, processed: 0, failed: 0 };
      }

      const pendingMessages = this.queue.filter(item => item.retryCount < this.MAX_RETRIES);

      for (const queuedMessage of pendingMessages) {
        try {
          await this.sendMessage(queuedMessage);
          await this.removeMessage(queuedMessage.id);
          processed++;
        } catch (error) {
          await this.handleSendFailure(queuedMessage, error);
          failed++;
        }
      }

  await this.saveQueue();
  this.emitChange();
      return { success: true, processed, failed };
    } catch (error) {
      ErrorService.handleError(error, 'Force processing queue', false);
      return { success: false, processed, failed };
    }
  }
}
