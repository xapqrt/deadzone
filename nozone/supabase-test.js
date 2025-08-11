/**
 * Simple test script to verify messaging system functions work correctly
 * Run this to test the Supabase integration
 */

import { createClient } from '@supabase/supabase-js';

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMessagingSystem() {
  console.log('🧪 Testing Messaging System Functions');
  console.log('=====================================');

  try {
    // Test 1: Check username availability
    console.log('\n1. Testing username availability...');
    const { data: usernameCheck, error: usernameError } = await supabase
      .rpc('check_username_availability', { p_username: 'test_user_123' });
    
    if (usernameError) {
      console.error('❌ Username check error:', usernameError);
    } else {
      console.log('✅ Username availability check:', usernameCheck ? 'Available' : 'Taken');
    }

    // Test 2: Get active users
    console.log('\n2. Testing get_active_users function...');
    const { data: activeUsers, error: usersError } = await supabase
      .rpc('get_active_users', { p_limit: 5 });
    
    if (usersError) {
      console.error('❌ Get active users error:', usersError);
    } else {
      console.log('✅ Active users count:', activeUsers?.length || 0);
      console.log('Users:', activeUsers);
    }

    // Test 3: Check if tables exist by trying to select from them
    console.log('\n3. Testing table access...');
    
    const { data: messagesTest, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);
    
    if (messagesError) {
      console.error('❌ Messages table error:', messagesError.message);
      if (messagesError.message.includes('recipient_id')) {
        console.log('💡 The recipient_id column issue is confirmed. Please run the updated tbh.sql script.');
      }
    } else {
      console.log('✅ Messages table accessible');
    }

    const { data: conversationsTest, error: conversationsError } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);
    
    if (conversationsError) {
      console.error('❌ Conversations table error:', conversationsError.message);
    } else {
      console.log('✅ Conversations table accessible');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  console.log('\n🎯 Test Summary:');
  console.log('- If you see the recipient_id error, run the updated tbh.sql script');
  console.log('- Make sure to replace the Supabase credentials in this file');
  console.log('- All functions should work after running the corrected SQL schema');
}

// Uncomment the line below to run the test (after adding your Supabase credentials)
// testMessagingSystem();

console.log('🔧 To run this test:');
console.log('1. Add your Supabase URL and key at the top of this file');
console.log('2. Run the updated tbh.sql script in your Supabase SQL editor');
console.log('3. Uncomment the testMessagingSystem() call at the bottom');
console.log('4. Run: node supabase-test.js');
