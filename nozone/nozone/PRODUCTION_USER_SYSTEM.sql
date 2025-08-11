-- ============================================
-- NOZONE PRODUCTION USER SYSTEM - ENHANCED
-- ============================================
-- Run this in your Supabase SQL Editor to set up the complete user system
-- This enhances the existing schema with better user management

-- ============================================
-- 1. ENHANCE USERS TABLE (if needed)
-- ============================================

-- Add username column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'username') THEN
        ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at_desc ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_active_username ON users(username, last_active) WHERE username IS NOT NULL;

-- ============================================
-- 2. CREATE USER MANAGEMENT FUNCTIONS
-- ============================================

-- Function to register or update a user
CREATE OR REPLACE FUNCTION upsert_user(
    p_name VARCHAR(100),
    p_username VARCHAR(50),
    p_phone VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE(
    user_id UUID,
    username_taken BOOLEAN,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_user_id UUID;
    v_existing_user_id UUID;
BEGIN
    -- Check if username is already taken by another user
    SELECT id INTO v_existing_user_id 
    FROM users 
    WHERE username = p_username;
    
    -- If username exists, return error
    IF v_existing_user_id IS NOT NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID as user_id,
            TRUE as username_taken,
            FALSE as success,
            'Username already taken' as message;
        RETURN;
    END IF;
    
    -- Insert or update user
    INSERT INTO users (name, username, phone, is_verified, last_active)
    VALUES (p_name, p_username, p_phone, TRUE, NOW())
    ON CONFLICT (phone) 
    DO UPDATE SET 
        name = EXCLUDED.name,
        username = EXCLUDED.username,
        last_active = NOW(),
        updated_at = NOW()
    RETURNING id INTO v_user_id;
    
    -- If no conflict on phone, try insert without phone
    IF v_user_id IS NULL THEN
        INSERT INTO users (name, username, is_verified, last_active)
        VALUES (p_name, p_username, TRUE, NOW())
        RETURNING id INTO v_user_id;
    END IF;
    
    RETURN QUERY SELECT 
        v_user_id as user_id,
        FALSE as username_taken,
        TRUE as success,
        'User registered successfully' as message;
    
EXCEPTION WHEN unique_violation THEN
    -- Handle any other unique constraint violations
    RETURN QUERY SELECT 
        NULL::UUID as user_id,
        TRUE as username_taken,
        FALSE as success,
        'Username already exists' as message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all active users (for contact list)
CREATE OR REPLACE FUNCTION get_active_users(
    p_exclude_user_id UUID DEFAULT NULL,
    p_search_term VARCHAR(100) DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    id UUID,
    name VARCHAR(100),
    username VARCHAR(50),
    last_active TIMESTAMPTZ,
    is_online BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.name,
        u.username,
        u.last_active,
        (u.last_active > NOW() - INTERVAL '5 minutes') as is_online
    FROM users u
    WHERE 
        u.username IS NOT NULL
        AND (p_exclude_user_id IS NULL OR u.id != p_exclude_user_id)
        AND (p_search_term IS NULL OR 
             u.username ILIKE '%' || p_search_term || '%' OR 
             u.name ILIKE '%' || p_search_term || '%')
    ORDER BY 
        (u.last_active > NOW() - INTERVAL '5 minutes') DESC, -- Online users first
        u.last_active DESC,
        u.username ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check username availability
CREATE OR REPLACE FUNCTION check_username_availability(p_username VARCHAR(50))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (SELECT 1 FROM users WHERE username = p_username);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user last active timestamp
CREATE OR REPLACE FUNCTION update_user_activity(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET last_active = NOW(), updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user stats
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE(
    total_users BIGINT,
    active_users_24h BIGINT,
    active_users_7d BIGINT,
    online_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE last_active > NOW() - INTERVAL '24 hours') as active_users_24h,
        COUNT(*) FILTER (WHERE last_active > NOW() - INTERVAL '7 days') as active_users_7d,
        COUNT(*) FILTER (WHERE last_active > NOW() - INTERVAL '5 minutes') as online_users
    FROM users
    WHERE username IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. UPDATE SECURITY POLICIES
-- ============================================

-- Drop ALL existing policies to recreate them (comprehensive cleanup)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on users table
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON users';
    END LOOP;
END $$;

-- Create consolidated user policies (no duplicates)
CREATE POLICY "users_select_policy" ON users
    FOR SELECT USING (
        -- Users can see all profiles with usernames (for contact list)
        -- Users can see their own profile
        -- Service role can see everything
        username IS NOT NULL OR 
        id = auth.uid()::uuid OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "users_update_policy" ON users
    FOR UPDATE USING (
        id = auth.uid()::uuid OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "users_insert_policy" ON users
    FOR INSERT WITH CHECK (true);

-- ============================================
-- 4. CREATE TRIGGERS FOR AUTOMATION
-- ============================================

-- Trigger to automatically update last_active on any user table update
CREATE OR REPLACE FUNCTION auto_update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active = NOW();
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_update_last_active ON users;
CREATE TRIGGER trigger_auto_update_last_active
    BEFORE UPDATE ON users
    FOR EACH ROW
    WHEN (OLD.last_active IS DISTINCT FROM NEW.last_active OR OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION auto_update_last_active();

-- ============================================
-- 5. CREATE VIEWS FOR EASY QUERYING
-- ============================================

-- View for active users (contact list)
DROP VIEW IF EXISTS active_users_view;
CREATE VIEW active_users_view AS
SELECT 
    id,
    name,
    username,
    last_active,
    (last_active > NOW() - INTERVAL '5 minutes') as is_online,
    (last_active > NOW() - INTERVAL '24 hours') as is_active_today,
    created_at
FROM users
WHERE username IS NOT NULL AND username != ''
ORDER BY last_active DESC;

-- View for user activity stats
DROP VIEW IF EXISTS user_activity_stats;
CREATE VIEW user_activity_stats AS
SELECT 
    DATE(last_active) as activity_date,
    COUNT(*) as active_users,
    COUNT(DISTINCT username) as unique_active_users
FROM users
WHERE last_active > NOW() - INTERVAL '30 days'
    AND username IS NOT NULL
GROUP BY DATE(last_active)
ORDER BY activity_date DESC;

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

-- Grant access to functions
GRANT EXECUTE ON FUNCTION upsert_user(VARCHAR, VARCHAR, VARCHAR) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_active_users(UUID, VARCHAR, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_username_availability(VARCHAR) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_user_activity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats() TO authenticated;

-- Grant access to views
GRANT SELECT ON active_users_view TO authenticated, anon;
GRANT SELECT ON user_activity_stats TO authenticated;

-- ============================================
-- 7. VERIFICATION QUERIES (NO DATA INSERTION)
-- ============================================

-- Test username availability function (safe - no data insertion)
SELECT 'Testing username availability check:' as test;
SELECT check_username_availability('nonexistent_test_user') as available;

-- Check user statistics (safe - only reads existing data)
SELECT 'Current user statistics:' as test;
SELECT * FROM get_user_stats();

-- View active users (safe - only shows existing data)
SELECT 'Current active users:' as test;
SELECT * FROM active_users_view LIMIT 5;

-- Test get_active_users function (safe - only reads existing data)
SELECT 'Testing get_active_users function:' as test;
SELECT * FROM get_active_users() LIMIT 3;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 NOZONE USER SYSTEM SETUP COMPLETE! 🎉';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Enhanced users table with username support';
    RAISE NOTICE '✅ User management functions created';
    RAISE NOTICE '✅ Security policies updated';
    RAISE NOTICE '✅ Performance indexes added';
    RAISE NOTICE '✅ Automated triggers configured';
    RAISE NOTICE '✅ Contact list views created';
    RAISE NOTICE '✅ NO FAKE DATA - Production ready!';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready for production use!';
    RAISE NOTICE '';
    RAISE NOTICE 'Available functions:';
    RAISE NOTICE '• upsert_user(name, username, phone) - Register/update user';
    RAISE NOTICE '• get_active_users(exclude_id, search, limit) - Get contact list';
    RAISE NOTICE '• check_username_availability(username) - Check if username is free';
    RAISE NOTICE '• update_user_activity(user_id) - Update last active time';
    RAISE NOTICE '';
    RAISE NOTICE 'Available views:';
    RAISE NOTICE '• active_users_view - All active users for contact list';
    RAISE NOTICE '• user_activity_stats - User activity analytics';
END $$;
