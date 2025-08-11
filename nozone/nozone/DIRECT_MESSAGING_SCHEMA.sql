-- ============================================
-- NOZONE DIRECT MESSAGING SYSTEM - SCHEMA
-- ============================================
-- Run this in your Supabase SQL Editor after PRODUCTION_USER_SYSTEM.sql
-- This adds the direct messaging functionality

-- ============================================
-- 1. CREATE CONVERSATIONS TABLE
-- ============================================

-- Conversations table to track direct messages between users
CREATE TABLE IF NOT EXISTS conversations (
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique conversation per pair (bidirectional)
    CONSTRAINT unique_conversation_pair UNIQUE (
        LEAST(participant_one_id, participant_two_id),
        GREATEST(participant_one_id, participant_two_id)
    )
);

-- ============================================
-- 2. CREATE DIRECT MESSAGES TABLE
-- ============================================

-- Direct messages table
CREATE TABLE IF NOT EXISTS direct_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'read', 'failed')),
    deliver_after TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    is_queued_locally BOOLEAN DEFAULT TRUE,
    sync_status TEXT DEFAULT 'local' CHECK (sync_status IN ('local', 'syncing', 'synced', 'failed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Conversation indexes
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participant_one_id, participant_two_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_one ON conversations(participant_one_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_two ON conversations(participant_two_id, last_message_at DESC);

-- Direct message indexes
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON direct_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON direct_messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_status ON direct_messages(status, deliver_after);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sync_status ON direct_messages(sync_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_queued ON direct_messages(is_queued_locally, sync_status);

-- ============================================
-- 4. CREATE MESSAGING FUNCTIONS
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
    WHERE username = p_recipient_username AND username IS NOT NULL;
    
    -- If recipient doesn't exist, still create the message (soft fail)
    IF v_recipient_id IS NULL THEN
        -- Create a placeholder message that will be queued until recipient joins
        INSERT INTO direct_messages (
            sender_id,
            recipient_id,
            message_text,
            deliver_after,
            status,
            sync_status
        ) VALUES (
            p_sender_id,
            NULL,  -- No recipient yet
            p_message_text,
            p_deliver_after,
            'queued',
            'local'
        ) RETURNING id INTO v_message_id;
        
        RETURN QUERY SELECT 
            TRUE as success,
            v_message_id as message_id,
            NULL::UUID as conversation_id,
            FALSE as recipient_exists,
            'User not yet synced. Message will be queued until they join.' as message;
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
        CASE WHEN p_deliver_after <= NOW() THEN 'sent' ELSE 'pending' END,
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
      -- Only show conversations where there's been a mutual exchange (handshake)
      AND EXISTS (
          SELECT 1 FROM direct_messages dm_check
          WHERE dm_check.conversation_id = c.id
            AND dm_check.sender_id != p_user_id
            AND dm_check.status IN ('sent', 'delivered', 'read')
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
      AND dm.status IN ('sent', 'delivered', 'read')  -- Only show successfully sent messages
    ORDER BY dm.created_at ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. CREATE SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Conversation policies
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (
        participant_one_id = auth.uid()::uuid OR 
        participant_two_id = auth.uid()::uuid OR
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        participant_one_id = auth.uid()::uuid OR 
        participant_two_id = auth.uid()::uuid OR
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can update their own conversations" ON conversations
    FOR UPDATE USING (
        participant_one_id = auth.uid()::uuid OR 
        participant_two_id = auth.uid()::uuid OR
        auth.role() = 'service_role'
    );

-- Direct message policies
CREATE POLICY "Users can view messages in their conversations" ON direct_messages
    FOR SELECT USING (
        sender_id = auth.uid()::uuid OR 
        recipient_id = auth.uid()::uuid OR
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can send messages" ON direct_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()::uuid OR
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can update their own messages" ON direct_messages
    FOR UPDATE USING (
        sender_id = auth.uid()::uuid OR
        auth.role() = 'service_role'
    );

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

-- Grant access to functions
GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION send_direct_message(UUID, VARCHAR, TEXT, TIMESTAMPTZ) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_inbox(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_conversation_messages(UUID, UUID, INTEGER, INTEGER) TO authenticated, anon;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 NOZONE DIRECT MESSAGING SETUP COMPLETE! 🎉';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Conversations table created';
    RAISE NOTICE '✅ Direct messages table created';
    RAISE NOTICE '✅ Performance indexes added';
    RAISE NOTICE '✅ Messaging functions created';
    RAISE NOTICE '✅ Security policies configured';
    RAISE NOTICE '✅ Handshake protocol implemented';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready for username-based messaging!';
    RAISE NOTICE '';
    RAISE NOTICE 'Available functions:';
    RAISE NOTICE '• send_direct_message(sender_id, recipient_username, text, deliver_after)';
    RAISE NOTICE '• get_user_inbox(user_id) - Shows conversations with replies';
    RAISE NOTICE '• get_conversation_messages(conversation_id, user_id, limit, offset)';
    RAISE NOTICE '• get_or_create_conversation(user_one_id, user_two_id)';
END $$;
