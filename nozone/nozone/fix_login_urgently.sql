-- URGENT FIX: Update authenticate_user function to resolve ambiguous column reference
-- Run this in your Supabase SQL Editor to fix the login issue

DROP FUNCTION IF EXISTS authenticate_user(VARCHAR, TEXT);

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
    -- Find user by username or email (with explicit table qualification)
    SELECT * INTO v_user_record
    FROM users 
    WHERE users.username = LOWER(p_username_or_email) 
       OR users.email = LOWER(p_username_or_email);
    
    -- If user not found
    IF v_user_record IS NULL THEN
        RETURN QUERY SELECT 
            FALSE, 
            NULL::UUID, 
            NULL::VARCHAR(50), 
            NULL::VARCHAR(100), 
            NULL::VARCHAR(255), 
            FALSE, 
            NULL::TIMESTAMPTZ, 
            NULL::TIMESTAMPTZ,
            'Invalid username or password'::TEXT;
        RETURN;
    END IF;
    
    -- Verify password using bcrypt
    v_password_match := (v_user_record.password_hash = crypt(p_password, v_user_record.password_hash));
    
    IF NOT v_password_match THEN
        RETURN QUERY SELECT 
            FALSE, 
            NULL::UUID, 
            NULL::VARCHAR(50), 
            NULL::VARCHAR(100), 
            NULL::VARCHAR(255), 
            FALSE, 
            NULL::TIMESTAMPTZ, 
            NULL::TIMESTAMPTZ,
            'Invalid username or password'::TEXT;
        RETURN;
    END IF;
    
    -- Update last active time
    UPDATE users 
    SET last_active = NOW(), updated_at = NOW()
    WHERE id = v_user_record.id;
    
    -- Return success with user data (explicit type casting to avoid ambiguity)
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION authenticate_user(VARCHAR, TEXT) TO authenticated, anon;

-- Test the function with your new user
SELECT * FROM authenticate_user('use4', 'your_password_here');

-- Verify the fix worked
SELECT 'authenticate_user function updated successfully' as status;
