-- ============================================
-- QUICK NOZONE SETUP - Run this in Supabase SQL Editor
-- ============================================
-- This is a simplified version for quick setup

-- Create users table with username support
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE,
  is_verified BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active DESC);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all usernames for contacts" ON users
    FOR SELECT USING (username IS NOT NULL OR id = auth.uid()::uuid);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid()::uuid);

CREATE POLICY "Anyone can register" ON users
    FOR INSERT WITH CHECK (true);

-- Function to register user with username check
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
    -- Check if username is already taken
    SELECT id INTO v_existing_user_id FROM users WHERE username = p_username;
    
    IF v_existing_user_id IS NOT NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID, TRUE, FALSE, 'Username already taken';
        RETURN;
    END IF;
    
    -- Insert new user
    INSERT INTO users (name, username, phone, is_verified, last_active)
    VALUES (p_name, p_username, p_phone, TRUE, NOW())
    RETURNING id INTO v_user_id;
    
    RETURN QUERY SELECT 
        v_user_id, FALSE, TRUE, 'User registered successfully';
    
EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT 
        NULL::UUID, TRUE, FALSE, 'Username already exists';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active users for contact list
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
        (u.last_active > NOW() - INTERVAL '5 minutes') DESC,
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_user(VARCHAR, VARCHAR, VARCHAR) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_active_users(UUID, VARCHAR, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_username_availability(VARCHAR) TO authenticated, anon;

-- Insert sample users for testing
INSERT INTO users (name, username, phone, is_verified) VALUES
    ('Alice Smith', 'alice_s', '+1234567890', true),
    ('Bob Johnson', 'bob_j', '+1234567891', true),
    ('Carol Davis', 'carol_d', '+1234567892', true),
    ('David Wilson', 'david_w', '+1234567893', true),
    ('Emma Brown', 'emma_b', '+1234567894', true)
ON CONFLICT (phone) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 Nozone user system setup complete!';
    RAISE NOTICE 'You can now register users with usernames and they will appear in the contact selector.';
END $$;
