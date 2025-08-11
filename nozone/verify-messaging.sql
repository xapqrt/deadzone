-- ============================================
-- QUICK MESSAGING SYSTEM TEST SCRIPT
-- ============================================
-- Run this script to verify tables exist and test basic functionality

-- Check if tables exist
SELECT 'Checking table existence...' as test_step;

SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('users', 'user_passwords', 'messages', 'conversations') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM information_schema.tables 
WHERE table_name IN ('users', 'user_passwords', 'messages', 'conversations')
AND table_schema = 'public'
ORDER BY table_name;

-- Check messages table columns
SELECT 'Checking messages table structure...' as test_step;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test username availability function
SELECT 'Testing username availability...' as test_step;
SELECT check_username_availability('test_user_123') as username_available;

-- Test get_active_users function
SELECT 'Testing get_active_users function...' as test_step;
SELECT COUNT(*) as user_count FROM get_active_users();

-- Verify messaging functions exist
SELECT 'Checking messaging functions...' as test_step;

SELECT 
    routine_name,
    '✅ EXISTS' as status
FROM information_schema.routines 
WHERE routine_name IN (
    'send_message',
    'get_conversation_messages', 
    'get_user_conversations',
    'mark_messages_read',
    'process_scheduled_messages'
)
AND routine_schema = 'public'
ORDER BY routine_name;

SELECT '🎉 Messaging system verification complete!' as final_result;
