import { createClient } from '@supabase/supabase-js';
import { Env } from '../utils/env';
import { logger } from '../utils/logger';
import { DeviceEventEmitter } from 'react-native';
import { Message, User, DirectMessage, InboxConversation } from '../types';

// Centralized env access (placeholders should be overridden in .env / app config)
const SUPABASE_URL = Env.SUPABASE_URL;
const SUPABASE_ANON_KEY = Env.SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export class SupabaseService {
  // ============================================
  // CONNECTION AND HEALTH CHECKS
  // ============================================
  
  static async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('Supabase connection test failed:', error.message);
        return false;
      }
      
  logger.info('Supabase connected');
      return true;
    } catch (error) {
      console.error('❌ Supabase connection error:', error);
      return false;
    }
  }

  static async getDatabaseStats() {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) throw new Error('No user ID found');
      // Updated to use direct_messages (generic messages table removed in COMPLETE schema)
      const { data, error } = await supabase
        .from('direct_messages')
        .select('status, sender_id')
        .eq('sender_id', userId);
      if (error) throw error;
      const base = {
        total_messages: 0,
        pending_messages: 0,
        sent_messages: 0,
        failed_messages: 0,
        scheduled_messages: 0,
      };
      if (!data) return base;
      return data.reduce((acc: any, m: any) => {
        acc.total_messages++;
        switch (m.status) {
          case 'pending':
            acc.pending_messages++; break;
          case 'queued':
          case 'sent':
            acc.sent_messages++; break;
          case 'delivered':
          case 'read':
            acc.sent_messages++; break;
          case 'failed':
            acc.failed_messages++; break;
        }
        return acc;
      }, base);
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return null;
    }
  }

  // ============================================
  // DIRECT MESSAGE STATS (AGGREGATED COUNTS)
  // ============================================
  /**
   * Get aggregated counts for direct messages (both outbound and inbound for a user).
   * Counts mirror the local MessageCounters interface: pending, sent, failed, delivered, read, inbound, total.
   * Sent includes messages in statuses: sent | delivered | read (outbound only).
   */
  static async getDirectMessageStats(userId: string): Promise<{
    pending: number;
    sent: number;
    failed: number;
    delivered: number;
    read: number;
    inbound: number;
    total: number;
  }> {
    try {
      const base = { pending:0, sent:0, failed:0, delivered:0, read:0, inbound:0, total:0 };
      // Fetch minimal columns only for the user (sender or recipient)
      const { data, error } = await supabase
        .from('direct_messages')
        .select('id,status,sender_id,recipient_id')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
      if (error) throw error;
      if (!data) return base;
      for (const m of data as any[]) {
        const mine = m.sender_id === userId;
        base.total++;
        if (!mine && m.recipient_id === userId) base.inbound++;
        const rawStatus = (m.status || '').toLowerCase();
        // Normalize a broader vocabulary to our counters.
        // Pending-like: created | queued | pending | processing | scheduled
        // Sent-like: sent | delivered | read
        // Failed-like: failed | error | cancelled
        if (mine) {
          if (['created','queued','pending','processing','scheduled'].includes(rawStatus)) {
            base.pending++;
            continue;
          }
          if (['failed','error','cancelled'].includes(rawStatus)) {
            base.failed++;
            continue;
          }
          if (['sent','delivered','read'].includes(rawStatus)) {
            base.sent++;
            if (rawStatus === 'delivered' || rawStatus === 'read') base.delivered++;
            if (rawStatus === 'read') base.read++;
            continue;
          }
          // Fallback: treat unknown statuses conservatively as pending so they surface
          base.pending++;
        }
      }
      return base;
    } catch (e) {
      console.error('Failed to get direct message stats', e);
      return { pending:0, sent:0, failed:0, delivered:0, read:0, inbound:0, total:0 };
    }
  }

  // ============================================
  // USER MANAGEMENT
  // ============================================
  
  static async registerUser(name: string, username: string, phone?: string, password?: string): Promise<{
    user: User | null;
    usernameTaken: boolean;
    success: boolean;
    message: string;
  }> {
    try {
      // COMPLETE schema removed upsert_user – use register_user with password hashing
      const effectivePassword = password || process.env.EXPO_PUBLIC_DEFAULT_USER_PASSWORD || 'password123';
      const { data, error } = await supabase.rpc('register_user', {
        p_name: name.trim(),
        p_username: username.toLowerCase().trim(),
        p_password: effectivePassword,
        p_email: null,
        p_phone: phone || null
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) {
        return { user: null, usernameTaken: result?.username_taken || false, success: false, message: result?.message || 'Registration failed' };
      }
      const user = await this.getUserById(result.user_id);
      return { user, usernameTaken: false, success: true, message: result.message };
    } catch (error) {
      return {
        user: null,
        usernameTaken: false,
        success: false,
        message: `Failed to register user: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_username_availability', {
        p_username: username.toLowerCase().trim()
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to check username availability:', error);
      return false;
    }
  }

  static async getActiveUsers(excludeUserId?: string, searchTerm?: string, limit = 50): Promise<User[]> {
    try {
      const { data, error } = await supabase.rpc('get_active_users', {
        p_exclude_user_id: excludeUserId || null,
        p_search_term: searchTerm || null,
        p_limit: limit
      });

      if (error) throw error;

      return data.map((user: any) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        isVerified: true,
        lastActive: user.last_active ? new Date(user.last_active) : undefined,
        isOnline: user.is_online,
        createdAt: new Date(), // We don't have this in the function result
      }));
    } catch (error) {
      console.error('Failed to get active users:', error);
      return [];
    }
  }

  static async updateUserActivity(userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_user_activity', {
        p_user_id: userId
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update user activity:', error);
    }
  }

  static async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers24h: number;
    activeUsers7d: number;
    onlineUsers: number;
  } | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_stats');

      if (error) throw error;

      const stats = data[0];
      return {
        totalUsers: parseInt(stats.total_users),
        activeUsers24h: parseInt(stats.active_users_24h),
        activeUsers7d: parseInt(stats.active_users_7d),
        onlineUsers: parseInt(stats.online_users),
      };
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return null;
    }
  }
  
  static async createUser(name: string, phone?: string): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          name: name.trim(),
          phone: phone || null,
          is_verified: phone ? false : true, // Name-only users are auto-verified
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        phone: data.phone,
        isVerified: data.is_verified,
        createdAt: new Date(data.created_at),
      };
    } catch (error) {
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getUserByPhone(phone: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        phone: data.phone,
        isVerified: data.is_verified,
        createdAt: new Date(data.created_at),
      };
    } catch (error) {
      throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        phone: data.phone,
        isVerified: data.is_verified,
        createdAt: new Date(data.created_at),
      };
    } catch (error) {
      throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async updateUserLastActive(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update last active:', error);
    }
  }

  // ============================================
  // OTP VERIFICATION
  // ============================================
  
  static async storeOTP(phone: string, hashedOTP: string, expiresAt: Date): Promise<void> {
    try {
      // Clean up old OTPs for this phone
      await supabase
        .from('otp_verifications')
        .delete()
        .eq('phone', phone);

      const { error } = await supabase
        .from('otp_verifications')
        .insert({
          phone,
          hashed_otp: hashedOTP,
          expires_at: expiresAt.toISOString(),
          is_used: false,
          attempts: 0,
        });

      if (error) throw error;
    } catch (error) {
      throw new Error(`Failed to store OTP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async verifyOTP(phone: string, hashedOTP: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('phone', phone)
        .eq('hashed_otp', hashedOTP)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) return false;

      // Mark OTP as used
      await supabase
        .from('otp_verifications')
        .update({ is_used: true })
        .eq('id', data.id);

      return true;
    } catch (error) {
      console.error('OTP verification error:', error);
      return false;
    }
  }

  // ============================================
  // LEGACY MESSAGE MANAGEMENT (Removed in COMPLETE schema)
  // Stubbed to avoid runtime errors if legacy screens still call them.
  // ============================================
  static async syncMessages(_messages: Message[]): Promise<void> { /* no-op */ }
  static async createMessage(_message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>): Promise<Message> { throw new Error('Generic messages disabled – update UI to use direct messages'); }
  static async getMessages(_userId: string, _status?: string, _limit = 50): Promise<Message[]> { return []; }
  static async updateMessageStatus(_messageId: string): Promise<void> { /* no-op */ }
  static async retryMessage(_messageId: string): Promise<void> { /* no-op */ }
  static async deleteMessage(_messageId: string): Promise<void> { /* no-op */ }
  static async getPendingMessages(_limit = 10): Promise<Message[]> { return []; }

  // ============================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================
  
  static subscribeToConversationMessages(conversationId: string, onMessage: (message: DirectMessage) => void) {
    // Redirect to direct messages subscription using conversation filter
    return supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg: any = payload.new;
            onMessage({
              id: msg.id,
              conversationId: msg.conversation_id,
              senderId: msg.sender_id,
              recipientId: msg.recipient_id,
              messageText: msg.message_text,
              messageType: msg.message_type || 'text',
              status: msg.status,
              deliverAfter: new Date(msg.deliver_after),
              deliveredAt: msg.delivered_at ? new Date(msg.delivered_at) : undefined,
              readAt: msg.read_at ? new Date(msg.read_at) : undefined,
              retryCount: msg.retry_count || 0,
              maxRetries: msg.max_retries || 3,
              isQueuedLocally: msg.is_queued_locally || false,
              syncStatus: msg.sync_status || 'synced',
              metadata: msg.metadata,
              createdAt: new Date(msg.created_at),
              updatedAt: msg.updated_at ? new Date(msg.updated_at) : undefined,
            });
        }
      )
      .subscribe();
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  static async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('Failed to get current user ID:', error);
      return null;
    }
  }

  static async cleanupExpiredOTPs(): Promise<number> {
    try {
      // Since cleanup_expired_otps function doesn't exist, do manual cleanup
      const { data, error } = await supabase
        .from('otp_verifications')
        .delete()
        .lt('expires_at', new Date().toISOString());
        
      if (error) throw error;
      return 0; // Can't get exact count from delete operation
    } catch (error) {
      console.error('Failed to cleanup expired OTPs:', error);
      return 0;
    }
  }

  static async getMessageQueue(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('message_queue')
        .select('*')
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get message queue:', error);
      return [];
    }
  }

  static async getRecentDeliveries(limit = 20) {
    try {
      const { data, error } = await supabase
        .from('recent_deliveries')
        .select('*')
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get recent deliveries:', error);
      return [];
    }
  }

  // ============================================
  // DIRECT MESSAGING FUNCTIONS
  // ============================================

  static async sendDirectMessage(
    senderId: string,
    recipientUsername: string,
    messageText: string,
    deliverAfter: Date = new Date()
  ): Promise<{
    success: boolean;
    messageId?: string;
    conversationId?: string;
    recipientExists: boolean;
    message: string;
  }> {
    try {
      console.log('📤 Sending direct message:', {
        senderId,
        recipientUsername,
        messageText: messageText.substring(0, 50) + '...',
        deliverAfter
      });

      // Use the send_direct_message function from our schema
      const { data: sendResult, error: sendError } = await supabase
        .rpc('send_direct_message', {
          p_sender_id: senderId,
          p_recipient_username: recipientUsername,
          p_message_text: messageText,
          p_deliver_after: deliverAfter.toISOString()
        });

      if (sendError) {
        console.error('❌ Failed to send direct message:', sendError);
        throw sendError;
      }

      console.log('✅ Send result:', sendResult);
      const result = sendResult?.[0];
      // Optimistic event dispatch: decide pending vs sent.
      if (result?.success) {
        // If deliver_after is in the future treat as pending, else sent
        const pendingLike = deliverAfter.getTime() > Date.now();
        DeviceEventEmitter.emit(pendingLike ? 'directMessagePending' : 'directMessageSent', {
          messageId: result?.message_id,
          conversationId: result?.conversation_id,
          at: Date.now(),
          optimistic: true,
          source: 'sendDirectMessage'
        });
        // Schedule a light reconciliation to nudge stats refresh
        setTimeout(() => {
          DeviceEventEmitter.emit('forceStatsRefresh', { reason: 'postSendReconcile' });
        }, 1500);
      }
      return {
        success: result?.success || false,
        messageId: result?.message_id,
        conversationId: result?.conversation_id,
        recipientExists: result?.recipient_exists || false,
        message: result?.message || 'Message sent successfully'
      };
    } catch (error) {
      console.error('❌ Failed to send direct message:', error);
      DeviceEventEmitter.emit('directMessageFailed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        at: Date.now(),
        source: 'sendDirectMessage'
      });
      return {
        success: false,
        recipientExists: false,
        conversationId: undefined,
        message: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static async getUserInbox(userId: string): Promise<InboxConversation[]> {
    try {
      console.log('📥 Getting user inbox for:', userId);
      
      // Use get_user_inbox function from our schema
      const { data, error } = await supabase.rpc('get_user_inbox', {
        p_user_id: userId
      });

      if (error) {
        console.error('❌ Failed to get user inbox:', error);
        throw error;
      }

      console.log('✅ Got inbox data:', data);

      return data.map((row: any) => ({
        conversationId: row.conversation_id,
        otherUserId: row.other_user_id,
        otherUsername: row.other_username,
        otherName: row.other_name,
        lastMessageText: row.last_message_text,
        lastMessageAt: new Date(row.last_message_at),
        lastMessageSenderId: row.last_message_sender_id,
        unreadCount: parseInt(row.unread_count || '0'),
        isVisible: row.is_visible
      }));
    } catch (error) {
      console.error('❌ Failed to get user inbox:', error);
      return [];
    }
  }

  static async getConversationMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<DirectMessage[]> {
    try {
      console.log('💬 Getting conversation messages:', {
        conversationId,
        userId,
        limit,
        offset
      });

      // Use get_conversation_messages function from our schema
      const { data, error } = await supabase.rpc('get_conversation_messages', {
        p_conversation_id: conversationId,
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        console.error('❌ Failed to get conversation messages:', error);
        throw error;
      }

      console.log('✅ Got conversation messages:', data?.length || 0);

      return data.map((row: any) => ({
        id: row.message_id,
        conversationId: conversationId,
        senderId: row.sender_id,
  // recipientId isn't returned by function; keep null to avoid incorrect placeholder
  recipientId: row.sender_id === userId ? null : userId,
        messageText: row.message_text,
        messageType: row.message_type as 'text',
        status: row.status,
  // Use deliver_after if the RPC returns it (scheduled messages), fallback to created_at
  deliverAfter: row.deliver_after ? new Date(row.deliver_after) : new Date(row.created_at),
        deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
        readAt: row.read_at ? new Date(row.read_at) : undefined,
        retryCount: 0,
        maxRetries: 3,
        isQueuedLocally: false,
        syncStatus: 'synced' as const,
        createdAt: new Date(row.created_at)
      }));
    } catch (error) {
      console.error('❌ Failed to get conversation messages:', error);
      return [];
    }
  }

  static async checkUsernameExists(username: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('Failed to check username:', error);
      return false;
    }
  }

  // Additional direct messaging methods for responsive screens
  static async searchUserByUsername(username: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, name, phone, created_at, last_active')
        .eq('username', username)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) return null;
      
      return {
        id: data.id,
        username: data.username,
        name: data.name,
        phone: data.phone,
        createdAt: new Date(data.created_at),
        lastActive: data.last_active ? new Date(data.last_active) : undefined
      };
    } catch (error) {
      console.error('Failed to search user by username:', error);
      return null;
    }
  }

  static async createDirectConversation(
    senderId: string,
    recipientId: string,
    messageText: string
  ): Promise<{ id: string }> {
    try {
      console.log('🆕 Creating direct conversation:', {
        senderId,
        recipientId,
        messageText: messageText.substring(0, 50) + '...'
      });

      // Get recipient username first
      const { data: recipientData, error: recipientError } = await supabase
        .from('users')
        .select('username')
        .eq('id', recipientId)
        .single();

      if (recipientError || !recipientData) {
        throw new Error('Recipient not found');
      }

      // Use the send_direct_message function which creates conversations automatically
      const { data: sendResult, error: sendError } = await supabase
        .rpc('send_direct_message', {
          p_sender_id: senderId,
          p_recipient_username: recipientData.username,
          p_message_text: messageText,
          p_deliver_after: new Date().toISOString()
        });

      if (sendError) {
        console.error('❌ Failed to create conversation:', sendError);
        throw sendError;
      }

      const result = sendResult?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to create conversation');
      }

      console.log('✅ Created conversation:', result.conversation_id);
      // Emit optimistic sent event (first message already created by RPC)
      DeviceEventEmitter.emit('directMessageSent', {
        messageId: result.message_id,
        conversationId: result.conversation_id,
        at: Date.now(),
        optimistic: true,
        source: 'createDirectConversation'
      });
      setTimeout(() => {
        DeviceEventEmitter.emit('forceStatsRefresh', { reason: 'postCreateConversation' });
      }, 1500);
      
      return { id: result.conversation_id };
    } catch (error) {
      console.error('❌ Failed to create direct conversation:', error);
      DeviceEventEmitter.emit('directMessageFailed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        at: Date.now(),
        source: 'createDirectConversation'
      });
      throw error;
    }
  }

  static async getDirectMessages(conversationId: string, userId?: string): Promise<DirectMessage[]> {
    try {
  logger.debug('Get direct messages', conversationId);
      
      // If userId is not provided, we need to get it from the current user
      const actualUserId = userId || await this.getCurrentUserId();
      if (!actualUserId) {
        throw new Error('No user ID available');
      }

      // Use the existing getConversationMessages method with proper userId
      const messages = await this.getConversationMessages(conversationId, actualUserId, 50, 0);
      return messages;
    } catch (error) {
      console.error('❌ Failed to get direct messages:', error);
      return [];
    }
  }

  // Method for sending messages to existing conversations
  static async sendMessageToConversation(
    conversationId: string,
    senderId: string,
    content: string
  ): Promise<DirectMessage> {
  // Basic idempotency key (hash could be added; using first 32 chars + length + conversation)
  const idemKey = `${conversationId}:${senderId}:${content.substring(0,32)}:${content.length}`;
  try {
  logger.debug('Send message', { conversationId, senderId, preview: content.substring(0,50) });

      // Get conversation participants to find recipient
      const { data: conversationData, error: convError } = await supabase
        .from('conversations')
        .select('participant_one_id, participant_two_id')
        .eq('id', conversationId)
        .single();

      if (convError || !conversationData) {
        console.error('❌ Conversation not found:', convError);
        throw new Error('Conversation not found');
      }

      const recipientId = conversationData.participant_one_id === senderId 
        ? conversationData.participant_two_id 
        : conversationData.participant_one_id;

      // Get recipient username
      const { data: recipientData, error: recipientError } = await supabase
        .from('users')
        .select('username')
        .eq('id', recipientId)
        .single();

      if (recipientError || !recipientData) {
        throw new Error('Recipient not found');
      }

      // Use send_direct_message function
      let attempt = 0; const maxAttempts = 3; let sendResult: any; let sendError: any;
      while (attempt < maxAttempts) {
        attempt++;
        ({ data: sendResult, error: sendError } = await supabase
          .rpc('send_direct_message', {
            p_sender_id: senderId,
            p_recipient_username: recipientData.username,
            p_message_text: content,
            p_deliver_after: new Date().toISOString(),
            p_idempotency_key: idemKey // if backend function supports it (ignored otherwise)
          }));
        if (!sendError) break;
        // Transient errors detection (simple heuristic)
        const transient = /timeout|network|connection/i.test(sendError.message || '');
        if (!transient) break;
        await new Promise(r => setTimeout(r, 300 * attempt));
      }

      if (sendError) {
        console.error('❌ Failed to send message:', sendError);
        throw sendError;
      }

      const result = sendResult?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to send message');
      }

  logger.debug('Message sent', result.message_id);
      DeviceEventEmitter.emit('directMessageSent', {
        messageId: result.message_id,
        conversationId,
        at: Date.now(),
        optimistic: true,
        source: 'sendMessageToConversation'
      });
      setTimeout(() => {
        DeviceEventEmitter.emit('forceStatsRefresh', { reason: 'postSendConversation' });
      }, 1500);

      return {
        id: result.message_id,
        conversationId: conversationId,
        senderId: senderId,
        recipientId: recipientId,
        messageText: content,
        messageType: 'text',
        status: 'sent',
        deliverAfter: new Date(),
        retryCount: 0,
        maxRetries: 3,
        isQueuedLocally: false,
        syncStatus: 'synced' as const,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('❌ Failed to send direct message:', error);
      DeviceEventEmitter.emit('directMessageFailed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId,
        at: Date.now(),
        source: 'sendMessageToConversation'
      });
      throw error;
    }
  }

  static subscribeToDirectMessages(conversationId: string, onMessage: (message: DirectMessage) => void) {
    try {
  logger.debug('Subscribing conversation channel', conversationId);
      
      const subscription = supabase
        .channel(`direct_messages:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages', // Use the correct table name
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            logger.debug('Realtime message', payload.new?.id);
            const data = payload.new as any;
            onMessage({
              id: data.id,
              conversationId: conversationId,
              senderId: data.sender_id,
              recipientId: data.recipient_id,
              messageText: data.message_text,
              messageType: data.message_type || 'text',
              status: data.status,
              // Some rows may not have a future deliver_after (immediate delivery) so fallback to created_at
              deliverAfter: data.deliver_after ? new Date(data.deliver_after) : new Date(data.created_at),
              deliveredAt: data.delivered_at ? new Date(data.delivered_at) : undefined,
              readAt: data.read_at ? new Date(data.read_at) : undefined,
              retryCount: data.retry_count || 0,
              maxRetries: data.max_retries || 3,
              isQueuedLocally: data.is_queued_locally || false,
              syncStatus: data.sync_status || 'synced',
              createdAt: new Date(data.created_at)
            });
          }
        )
        .subscribe();

      return subscription;
    } catch (error) {
      console.error('❌ Failed to subscribe to messages:', error);
      return null;
    }
  }

  static async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
  logger.debug('Mark read RPC', conversationId);
      const { data, error } = await supabase.rpc('mark_messages_read', {
        p_conversation_id: conversationId,
        p_recipient_id: userId
      });
      if (error) {
        console.error('❌ Failed to mark messages as read (RPC):', error);
        throw error;
      }
  logger.debug('Marked read count', data || 0);
    } catch (error) {
      console.error('❌ Failed to mark messages as read:', error);
    }
  }
}
