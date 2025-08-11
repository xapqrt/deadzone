# Nozone - Supabase Setup

## Database Schema

Run these SQL commands in your Supabase SQL editor to set up the database:

```sql
-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create OTP verifications table
CREATE TABLE otp_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  hashed_otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  phone TEXT NOT NULL,
  deliver_after TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_otp_verifications_phone ON otp_verifications(phone);
CREATE INDEX idx_otp_verifications_expires_at ON otp_verifications(expires_at);
CREATE INDEX idx_messages_phone ON messages(phone);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_deliver_after ON messages(deliver_after);

-- Enable Row Level Security (optional - for production)
-- ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies (optional - for production)
-- CREATE POLICY "Users can only access their own OTP verifications" ON otp_verifications
--   FOR ALL USING (auth.jwt() ->> 'phone' = phone);

-- CREATE POLICY "Users can only access their own messages" ON messages
--   FOR ALL USING (auth.jwt() ->> 'phone' = phone);
```

## Environment Setup

1. Create a new Supabase project at https://supabase.com
2. Copy your project URL and anon key
3. Update the constants in `src/services/supabase.ts`:

```typescript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

## Features Included

✅ **Offline-first architecture** - Messages stored locally with AsyncStorage  
✅ **Phone number verification** - Custom OTP system without Firebase  
✅ **Message queuing** - Compose and schedule messages for later delivery  
✅ **Network detection** - Auto-sync when internet connection is restored  
✅ **Custom delivery delays** - Set messages to send after specific time periods  
✅ **Push notifications** - Notifications on successful delivery  
✅ **Dark mode UI** - Clean, minimal, mobile-optimized interface  
✅ **Settings management** - Toggle auto-sync, clear data, etc.  
✅ **Message management** - Edit and delete pending messages  
✅ **TypeScript** - Full type safety throughout the app  

## Technology Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **Supabase** for backend and database
- **AsyncStorage** for local storage
- **NetInfo** for network status detection
- **Expo Notifications** for push notifications
- **Expo Crypto** for OTP hashing

## Running the App

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npx expo start
   ```

3. Use Expo Go app on your phone to scan the QR code, or run on emulator

## Demo Notes

- For demonstration, OTP codes are logged to console instead of sent via SMS
- You can modify the phone verification service to integrate with a real SMS provider
- The app is fully functional for offline message queuing and sync functionality

## Production Considerations

1. **SMS Integration**: Replace console logging with real SMS service (Twilio, AWS SNS, etc.)
2. **Authentication**: Implement proper JWT-based authentication
3. **Row Level Security**: Enable RLS policies in Supabase for data security
4. **Error Handling**: Add comprehensive error tracking and reporting
5. **Performance**: Add message pagination for large message lists
6. **Push Notifications**: Configure proper push notification credentials
