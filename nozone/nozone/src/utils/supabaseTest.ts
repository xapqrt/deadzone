import { supabase } from '../services/supabase';

export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Supabase connection error:', error.message);
      return false;
    }

    console.log('✅ Supabase connected successfully!');
    console.log('📊 Database response:', data);
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
};

export const testDatabaseTables = async (): Promise<void> => {
  try {
    console.log('🔍 Testing database tables...');
    
    // Test users table
    const { error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Users table error:', usersError.message);
    } else {
      console.log('✅ Users table exists and accessible');
    }

    // Test messages table
    const { error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);
    
    if (messagesError) {
      console.error('❌ Messages table error:', messagesError.message);
    } else {
      console.log('✅ Messages table exists and accessible');
    }

    // Test otp_verifications table
    const { error: otpError } = await supabase
      .from('otp_verifications')
      .select('id')
      .limit(1);
    
    if (otpError) {
      console.error('❌ OTP verifications table error:', otpError.message);
    } else {
      console.log('✅ OTP verifications table exists and accessible');
    }

  } catch (error) {
    console.error('❌ Database tables test failed:', error);
  }
};
