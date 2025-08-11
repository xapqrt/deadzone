import { createClient } from '@supabase/supabase-js';
import { Message, User } from '../types';

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

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
      
      console.log('✅ Supabase connected successfully!');
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

      const { data, error } = await supabase.rpc('get_user_message_stats', {
        user_uuid: userId
      });
      
      if (error) throw error;
      return data[0] || {
        total_messages: 0,
        pending_messages: 0,
        sent_messages: 0,
        failed_messages: 0,
        scheduled_messages: 0
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return null;
    }
  }

  // ============================================
  // USER MANAGEMENT
  // ============================================
  
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
  // MESSAGE MANAGEMENT
  // ============================================
  
  static async createMessage(message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>): Promise<Message> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: message.senderId,
          recipient_name: message.recipientName,
          text: message.text,
          deliver_after: message.deliverAfter.toISOString(),
          scheduled_for: message.deliverAfter.toISOString(),
          status: 'pending',
          priority: message.priority || 1,
          metadata: JSON.stringify(message.metadata || {}),
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        senderId: data.sender_id,
        recipientName: data.recipient_name,
        text: data.text,
        deliverAfter: new Date(data.deliver_after),
        status: data.status,
        priority: data.priority,
        metadata: data.metadata,
        createdAt: new Date(data.created_at),
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      };
    } catch (error) {
      throw new Error(`Failed to create message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getMessages(userId: string, status?: string, limit = 50): Promise<Message[]> {
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(msg => ({
        id: msg.id,
        senderId: msg.sender_id,
        recipientName: msg.recipient_name,
        text: msg.text,
        deliverAfter: new Date(msg.deliver_after),
        status: msg.status,
        priority: msg.priority,
        metadata: msg.metadata,
        createdAt: new Date(msg.created_at),
        updatedAt: msg.updated_at ? new Date(msg.updated_at) : undefined,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'failed' | 'read'): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      // Set delivered_at timestamp for delivered/read status
      if (status === 'delivered' || status === 'read') {
        updateData.delivered_at = new Date().toISOString();
      }

      // Set read_at timestamp for read status
      if (status === 'read') {
        updateData.read_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('messages')
        .update(updateData)
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      throw new Error(`Failed to update message status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async retryMessage(messageId: string): Promise<void> {
    try {
      // First get the current retry count
      const { data: currentMessage, error: fetchError } = await supabase
        .from('messages')
        .select('retry_count')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('messages')
        .update({
          status: 'pending',
          retry_count: (currentMessage.retry_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      throw new Error(`Failed to retry message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async deleteMessage(messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      throw new Error(`Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getPendingMessages(limit = 10): Promise<Message[]> {
    try {
      // Get current time for comparison
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('status', 'pending')
        .lte('deliver_after', now)
        .order('priority', { ascending: true })
        .order('scheduled_for', { ascending: true })
        .limit(limit);

      if (error) throw error;

      // Filter out messages that have exceeded max retries
      const validMessages = data.filter(msg => 
        (msg.retry_count || 0) < (msg.max_retries || 3)
      );

      return validMessages.map(msg => ({
        id: msg.id,
        senderId: msg.sender_id,
        recipientName: msg.recipient_name,
        text: msg.text,
        deliverAfter: new Date(msg.deliver_after),
        status: msg.status,
        priority: msg.priority,
        metadata: msg.metadata,
        createdAt: new Date(msg.created_at),
        updatedAt: msg.updated_at ? new Date(msg.updated_at) : undefined,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch pending messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================
  
  static subscribeToMessages(userId: string, callback: (message: Message) => void) {
    return supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            const msg = payload.new as any;
            callback({
              id: msg.id,
              senderId: msg.sender_id,
              recipientName: msg.recipient_name,
              text: msg.text,
              deliverAfter: new Date(msg.deliver_after),
              status: msg.status,
              priority: msg.priority,
              metadata: msg.metadata,
              createdAt: new Date(msg.created_at),
              updatedAt: msg.updated_at ? new Date(msg.updated_at) : undefined,
            });
          }
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
      const { data, error } = await supabase.rpc('cleanup_expired_otps');
      if (error) throw error;
      return data || 0;
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
}
