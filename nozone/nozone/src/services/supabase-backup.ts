import { createClient } from '@supabase/supabase-js';
import { Message, OTPVerification } from '../types';

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export class SupabaseService {
  // Test connection
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

  // OTP Verification
  static async storeOTP(phone: string, hashedOTP: string, expiresAt: Date): Promise<void> {
    const { error } = await supabase
      .from('otp_verifications')
      .insert({
        phone,
        hashed_otp: hashedOTP,
        expires_at: expiresAt.toISOString(),
        is_used: false,
      });

    if (error) {
      throw new Error(`Failed to store OTP: ${error.message}`);
    }
  }

  static async verifyOTP(phone: string, hashedOTP: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('hashed_otp', hashedOTP)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return false;
    }

    // Mark OTP as used
    await supabase
      .from('otp_verifications')
      .update({ is_used: true })
      .eq('id', data.id);

    return true;
  }

  // Messages
  static async syncMessages(messages: Message[]): Promise<void> {
    const messagesToSync = messages.map(msg => ({
      id: msg.id,
      text: msg.text,
      recipient_name: msg.recipientName,
      deliver_after: msg.deliverAfter.toISOString(),
      status: msg.status,
      created_at: msg.createdAt.toISOString(),
      updated_at: msg.updatedAt?.toISOString(),
    }));

    const { error } = await supabase
      .from('messages')
      .upsert(messagesToSync);

    if (error) {
      throw new Error(`Failed to sync messages: ${error.message}`);
    }
  }

  static async getMessages(userId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    return data.map(msg => ({
      id: msg.id,
      text: msg.text,
      recipientName: msg.recipient_name,
      deliverAfter: new Date(msg.deliver_after),
      status: msg.status,
      createdAt: new Date(msg.created_at),
      updatedAt: msg.updated_at ? new Date(msg.updated_at) : undefined,
    }));
  }

  static async updateMessageStatus(messageId: string, status: 'sent' | 'failed'): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) {
      throw new Error(`Failed to update message status: ${error.message}`);
    }
  }

  static async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  }
}
