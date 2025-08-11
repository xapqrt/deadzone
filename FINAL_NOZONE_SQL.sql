-- ============================================
-- COMPLETE NOZONE SUPABASE SCHEMA - PRODUCTION READY
-- ============================================
-- Copy and paste this ENTIRE script into your Supabase SQL Editor
-- This will create a complete authentication and messaging system

-- ============================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- ============================================

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable uuid generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. CREATE USERS TABLE
-- ============================================

-- Drop existing users table if it exists (to start fresh)
DROP TABLE IF EXISTS direct_messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS otp_verifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with all required fields
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE,
    avatar_url TEXT,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_last_active ON users(last_active DESC);

-- ============================================
-- 3. CREATE CONVERSATIONS TABLE
-- ============================================

CREATE TABLE conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_one_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_two_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_message_id UUID,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    participant_one_last_read TIMESTAMPTZ DEFAULT NOW(),
    participant_two_last_read TIMESTAMPTZ DEFAULT NOW(),
    is_participant_one_visible BOOLEAN DEFAULT TRUE,
    is_participant_two_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversation indexes
CREATE INDEX idx_conversations_participants ON conversations(participant_one_id, participant_two_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_participant_one ON conversations(participant_one_id, last_message_at DESC);
CREATE INDEX idx_conversations_participant_two ON conversations(participant_two_id, last_message_at DESC);

-- Add unique constraint for conversation pairs (using expression index)
CREATE UNIQUE INDEX idx_conversations_unique_pair ON conversations (
    LEAST(participant_one_id, participant_two_id),
    GREATEST(participant_one_id, participant_two_id)
);

-- ============================================
-- 4. CREATE DIRECT MESSAGES TABLE
-- ============================================

CREATE TABLE direct_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice')),
    status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'read', 'failed')),
    deliver_after TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    is_queued_locally BOOLEAN DEFAULT FALSE,
    sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('local', 'syncing', 'synced', 'failed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create direct message indexes
CREATE INDEX idx_direct_messages_conversation ON direct_messages(conversation_id, created_at DESC);
CREATE INDEX idx_direct_messages_sender ON direct_messages(sender_id, created_at DESC);
CREATE INDEX idx_direct_messages_recipient ON direct_messages(recipient_id, created_at DESC);
CREATE INDEX idx_direct_messages_status ON direct_messages(status, deliver_after);

-- ============================================
-- 5. CREATE AUTHENTICATION FUNCTIONS
-- ============================================

-- Drop existing functions if they exist (to avoid conflicts)
DROP FUNCTION IF EXISTS register_user(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS authenticate_user(VARCHAR, TEXT);
DROP FUNCTION IF EXISTS check_username_availability(VARCHAR);
DROP FUNCTION IF EXISTS upsert_user(VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_active_users(UUID, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS get_or_create_conversation(UUID, UUID);
DROP FUNCTION IF EXISTS send_direct_message(UUID, VARCHAR, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_user_inbox(UUID);
DROP FUNCTION IF EXISTS get_conversation_messages(UUID, UUID, INTEGER, INTEGER);

-- Function to register a new user with bcrypt password hashing
CREATE OR REPLACE FUNCTION register_user(
    p_name VARCHAR(100),
    p_username VARCHAR(50),
    p_password TEXT,
    p_email VARCHAR(255) DEFAULT NULL,
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
    v_hashed_password TEXT;
BEGIN
    -- Check if username is already taken
    SELECT id INTO v_existing_user_id FROM users WHERE username = LOWER(p_username);
    
    IF v_existing_user_id IS NOT NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID, TRUE, FALSE, 'Username already taken';
        RETURN;
    END IF;
    
    -- Hash the password using bcrypt
    v_hashed_password := crypt(p_password, gen_salt('bf', 12));
    
    -- Insert new user
    INSERT INTO users (name, username, password_hash, email, phone, is_verified, last_active)
    VALUES (p_name, LOWER(p_username), v_hashed_password, p_email, p_phone, TRUE, NOW())
    RETURNING id INTO v_user_id;
    
    RETURN QUERY SELECT 
        v_user_id, FALSE, TRUE, 'User registered successfully';
    
EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT 
        NULL::UUID, TRUE, FALSE, 'Username or email already exists';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to authenticate user with bcrypt password verification
CREATE OR REPLACE FUNCTION authenticate_user(
    p_username_or_email VARCHAR(255),
    p_password TEXT
)
RETURNS TABLE(
    login_success BOOLEAN,
    user_id UUID,
    username VARCHAR(50),
    name VARCHAR(100),
    email VARCHAR(255),
    is_verified BOOLEAN,
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    message TEXT
) AS $$
DECLARE
    v_user_record RECORD;
    v_password_match BOOLEAN;
BEGIN
    -- Find user by username or email
    SELECT * INTO v_user_record
    FROM users 
    WHERE username = LOWER(p_username_or_email) 
       OR email = LOWER(p_username_or_email);
    
    -- If user not found
    IF v_user_record IS NULL THEN
        RETURN QUERY SELECT 
            FALSE, NULL::UUID, NULL::VARCHAR(50), NULL::VARCHAR(100), 
            NULL::VARCHAR(255), FALSE, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
            'Invalid username or password';
        RETURN;
    END IF;
    
    -- Verify password using bcrypt
    v_password_match := (v_user_record.password_hash = crypt(p_password, v_user_record.password_hash));
    
    IF NOT v_password_match THEN
        RETURN QUERY SELECT 
            FALSE, NULL::UUID, NULL::VARCHAR(50), NULL::VARCHAR(100), 
            NULL::VARCHAR(255), FALSE, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
            'Invalid username or password';
        RETURN;
    END IF;
    
    -- Update last active time
    UPDATE users 
    SET last_active = NOW(), updated_at = NOW()
    WHERE id = v_user_record.id;
    
    -- Return success with user data
    RETURN QUERY SELECT 
        TRUE,
        v_user_record.id,
        v_user_record.username::VARCHAR(50),
        v_user_record.name::VARCHAR(100),
        v_user_record.email::VARCHAR(255),
        v_user_record.is_verified,
        NOW() as last_active,
        v_user_record.created_at,
        'Login successful'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check username availability
CREATE OR REPLACE FUNCTION check_username_availability(p_username VARCHAR(50))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (SELECT 1 FROM users WHERE username = LOWER(p_username));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. CREATE MESSAGING FUNCTIONS
-- ============================================

-- Function to find or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    p_user_one_id UUID,
    p_user_two_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
    v_participant_one UUID;
    v_participant_two UUID;
BEGIN
    -- Ensure consistent ordering for unique constraint
    v_participant_one := LEAST(p_user_one_id, p_user_two_id);
    v_participant_two := GREATEST(p_user_one_id, p_user_two_id);
    
    -- Try to find existing conversation
    SELECT id INTO v_conversation_id
    FROM conversations
    WHERE participant_one_id = v_participant_one 
      AND participant_two_id = v_participant_two;
    
    -- Create new conversation if not found
    IF v_conversation_id IS NULL THEN
        INSERT INTO conversations (participant_one_id, participant_two_id)
        VALUES (v_participant_one, v_participant_two)
        RETURNING id INTO v_conversation_id;
    END IF;
    
    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send a direct message
CREATE OR REPLACE FUNCTION send_direct_message(
    p_sender_id UUID,
    p_recipient_username VARCHAR(50),
    p_message_text TEXT,
    p_deliver_after TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
    success BOOLEAN,
    message_id UUID,
    conversation_id UUID,
    recipient_exists BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_recipient_id UUID;
    v_conversation_id UUID;
    v_message_id UUID;
BEGIN
    -- Find recipient by username
    SELECT id INTO v_recipient_id
    FROM users
    WHERE username = LOWER(p_recipient_username);
    
    -- If recipient doesn't exist
    IF v_recipient_id IS NULL THEN
        RETURN QUERY SELECT 
            FALSE as success,
            NULL::UUID as message_id,
            NULL::UUID as conversation_id,
            FALSE as recipient_exists,
            'User not found' as message;
        RETURN;
    END IF;
    
    -- Get or create conversation
    v_conversation_id := get_or_create_conversation(p_sender_id, v_recipient_id);
    
    -- Create the message
    INSERT INTO direct_messages (
        conversation_id,
        sender_id,
        recipient_id,
        message_text,
        deliver_after,
        status,
        sync_status
    ) VALUES (
        v_conversation_id,
        p_sender_id,
        v_recipient_id,
        p_message_text,
        p_deliver_after,
        'sent',
        'synced'
    ) RETURNING id INTO v_message_id;
    
    -- Update conversation last message
    UPDATE conversations
    SET last_message_id = v_message_id,
        last_message_at = NOW(),
        updated_at = NOW()
    WHERE id = v_conversation_id;
    
    RETURN QUERY SELECT 
        TRUE as success,
        v_message_id as message_id,
        v_conversation_id as conversation_id,
        TRUE as recipient_exists,
        'Message sent successfully' as message;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
        FALSE as success,
        NULL::UUID as message_id,
        NULL::UUID as conversation_id,
        FALSE as recipient_exists,
        'Failed to send message: ' || SQLERRM as message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's inbox (conversations with messages)
CREATE OR REPLACE FUNCTION get_user_inbox(p_user_id UUID)
RETURNS TABLE(
    conversation_id UUID,
    other_user_id UUID,
    other_username VARCHAR(50),
    other_name VARCHAR(100),
    last_message_text TEXT,
    last_message_at TIMESTAMPTZ,
    last_message_sender_id UUID,
    unread_count BIGINT,
    is_visible BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as conversation_id,
        CASE 
            WHEN c.participant_one_id = p_user_id THEN c.participant_two_id
            ELSE c.participant_one_id
        END as other_user_id,
        u.username as other_username,
        u.name as other_name,
        dm.message_text as last_message_text,
        c.last_message_at,
        dm.sender_id as last_message_sender_id,
        (
            SELECT COUNT(*)
            FROM direct_messages dm2
            WHERE dm2.conversation_id = c.id
              AND dm2.recipient_id = p_user_id
              AND dm2.read_at IS NULL
              AND dm2.status IN ('sent', 'delivered')
        ) as unread_count,
        CASE 
            WHEN c.participant_one_id = p_user_id THEN c.is_participant_one_visible
            ELSE c.is_participant_two_visible
        END as is_visible
    FROM conversations c
    LEFT JOIN direct_messages dm ON dm.id = c.last_message_id
    LEFT JOIN users u ON u.id = CASE 
        WHEN c.participant_one_id = p_user_id THEN c.participant_two_id
        ELSE c.participant_one_id
    END
    WHERE (c.participant_one_id = p_user_id OR c.participant_two_id = p_user_id)
      AND (
          (c.participant_one_id = p_user_id AND c.is_participant_one_visible = TRUE) OR
          (c.participant_two_id = p_user_id AND c.is_participant_two_visible = TRUE)
      )
    ORDER BY c.last_message_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversation messages
CREATE OR REPLACE FUNCTION get_conversation_messages(
    p_conversation_id UUID,
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    message_id UUID,
    sender_id UUID,
    sender_username VARCHAR(50),
    message_text TEXT,
    message_type TEXT,
    status TEXT,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Verify user is participant in conversation
    IF NOT EXISTS (
        SELECT 1 FROM conversations 
        WHERE id = p_conversation_id 
          AND (participant_one_id = p_user_id OR participant_two_id = p_user_id)
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not a participant in this conversation';
    END IF;
    
    RETURN QUERY
    SELECT 
        dm.id as message_id,
        dm.sender_id,
        u.username as sender_username,
        dm.message_text,
        dm.message_type,
        dm.status,
        dm.delivered_at,
        dm.read_at,
        dm.created_at
    FROM direct_messages dm
    LEFT JOIN users u ON u.id = dm.sender_id
    WHERE dm.conversation_id = p_conversation_id
      AND dm.status IN ('sent', 'delivered', 'read')
    ORDER BY dm.created_at ASC
    LIMIT p_limit OFFSET p_offset;
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

-- ============================================
-- 7. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view all usernames for contacts" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid()::uuid);

CREATE POLICY "Anyone can register" ON users
    FOR INSERT WITH CHECK (true);

-- Conversations policies
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (
        participant_one_id = auth.uid()::uuid OR 
        participant_two_id = auth.uid()::uuid
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        participant_one_id = auth.uid()::uuid OR 
        participant_two_id = auth.uid()::uuid
    );

CREATE POLICY "Users can update their own conversations" ON conversations
    FOR UPDATE USING (
        participant_one_id = auth.uid()::uuid OR 
        participant_two_id = auth.uid()::uuid
    );

-- Direct messages policies
CREATE POLICY "Users can view messages in their conversations" ON direct_messages
    FOR SELECT USING (
        sender_id = auth.uid()::uuid OR 
        recipient_id = auth.uid()::uuid
    );

CREATE POLICY "Users can send messages" ON direct_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()::uuid
    );

CREATE POLICY "Users can update their own messages" ON direct_messages
    FOR UPDATE USING (
        sender_id = auth.uid()::uuid
    );

-- ============================================
-- 8. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_direct_messages_updated_at BEFORE UPDATE ON direct_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. GRANT PERMISSIONS
-- ============================================

-- Grant access to functions for authenticated and anonymous users
GRANT EXECUTE ON FUNCTION register_user(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION authenticate_user(VARCHAR, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_username_availability(VARCHAR) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION send_direct_message(UUID, VARCHAR, TEXT, TIMESTAMPTZ) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_inbox(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_conversation_messages(UUID, UUID, INTEGER, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_active_users(UUID, VARCHAR, INTEGER) TO authenticated, anon;

-- ============================================
-- 10. CREATE SAMPLE DATA FOR TESTING
-- ============================================

-- Insert sample users for testing (with bcrypt hashed passwords)
-- Password for all test users is: "password123"
INSERT INTO users (name, username, password_hash, is_verified) VALUES
    ('Alice Smith', 'alice', crypt('password123', gen_salt('bf', 12)), true),
    ('Bob Johnson', 'bob', crypt('password123', gen_salt('bf', 12)), true),
    ('Carol Davis', 'carol', crypt('password123', gen_salt('bf', 12)), true),
    ('David Wilson', 'david', crypt('password123', gen_salt('bf', 12)), true),
    ('Emma Brown', 'emma', crypt('password123', gen_salt('bf', 12)), true)
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- SUCCESS MESSAGE AND VERIFICATION
-- ============================================

-- Test the authentication functions
DO $$
DECLARE
    test_result RECORD;
BEGIN
    -- Test username availability
    PERFORM check_username_availability('testuser');
    
    -- Test getting active users
    PERFORM get_active_users();
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 NOZONE DATABASE SETUP COMPLETE! 🎉';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Users table created with bcrypt password hashing';
    RAISE NOTICE '✅ Conversations table created';
    RAISE NOTICE '✅ Direct messages table created';
    RAISE NOTICE '✅ Authentication functions created';
    RAISE NOTICE '✅ Messaging functions created';
    RAISE NOTICE '✅ Row Level Security enabled';
    RAISE NOTICE '✅ Performance indexes added';
    RAISE NOTICE '✅ Sample users created for testing';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Test Users (password: "password123"):';
    RAISE NOTICE '• alice';
    RAISE NOTICE '• bob'; 
    RAISE NOTICE '• carol';
    RAISE NOTICE '• david';
    RAISE NOTICE '• emma';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your app should now work for both login and registration!';
    RAISE NOTICE '';
    RAISE NOTICE 'Available functions:';
    RAISE NOTICE '• register_user(name, username, password, email, phone)';
    RAISE NOTICE '• authenticate_user(username_or_email, password)';
    RAISE NOTICE '• check_username_availability(username)';
    RAISE NOTICE '• send_direct_message(sender_id, recipient_username, text, deliver_after)';
    RAISE NOTICE '• get_user_inbox(user_id)';
    RAISE NOTICE '• get_conversation_messages(conversation_id, user_id, limit, offset)';
    RAISE NOTICE '• get_active_users(exclude_id, search, limit)';
END $$;