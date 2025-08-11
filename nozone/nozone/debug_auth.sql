-- Quick test to verify if the database functions are working
-- Run this in Supabase SQL Editor to test authentication functions

-- Check if functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('register_user', 'authenticate_user', 'check_username_availability')
ORDER BY routine_name;

-- Check if sample users exist
SELECT id, username, name, created_at, is_verified 
FROM users 
WHERE username IN ('alice', 'bob', 'carol') 
ORDER BY created_at DESC;

-- Test username availability check
SELECT check_username_availability('alice') as alice_available;
SELECT check_username_availability('testuser123') as testuser_available;

-- Test authentication with sample user (password is 'password123')
SELECT * FROM authenticate_user('alice', 'password123');

-- If above doesn't work, try with wrong password to see error
SELECT * FROM authenticate_user('alice', 'wrongpassword');
