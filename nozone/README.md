# Nozone 📱

**Message anyone, anywhere — even offline**

Nozone is a social messaging app built for the offline world. Send messages even when you've got zero bars — they queue up and auto-send once you're back online. Perfect for bad Wi-Fi zones, rural areas, trains, basements — anywhere the internet gives up, but you don't.

## 🌟 Philosophy

**Offline-first, name-based, casual by design**

- **No phone numbers** - Just simple usernames/display names like early MSN or LAN chat
- **No authentication hassle** - No OTP, no verification, just good vibes
- **Works without internet** - Messages queue locally and send when connection returns
- **Fire-and-forget messaging** - Think post-it notes for low-connectivity zones

## ✨ Features

- 🌐 **Offline-First Messaging** - Send messages even with zero bars
- 👤 **Name-Based Identity** - No phone numbers, just simple usernames
- 📬 **Smart Message Queue** - Messages wait patiently until you're online
- ⏰ **Delayed Delivery** - "Send this in 3 hours" functionality
- 🔄 **Background Sync** - Auto-delivers when connection returns
- 📱 **Frictionless UX** - No auth, no logins, just messaging
- 🎨 **Futuristic UI** - Glassmorphic design with sci-fi vibes
- 📊 **Delivery Stats** - Track sent, pending, and failed messages

## 🛠 Technology Stack

- **React Native** with Expo SDK 53
- **TypeScript** for type safety
- **Supabase** for backend database and real-time sync
- **AsyncStorage** for offline local storage
- **NetInfo** for network connectivity detection
- **Expo Notifications** for push notifications
- **Expo Crypto** for secure OTP hashing

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Supabase account (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nozone
   ```

2. **Install dependencies**
   ```bash
   cd nozone
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL commands from `SETUP.md` in your Supabase SQL editor
   - Update `src/services/supabase.ts` with your project URL and anon key

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device**
   - Install Expo Go app on your Android device
   - Scan the QR code from the terminal
   - Or run on Android emulator: `npx expo run:android`

## 📱 App Screens

### 1. Phone Verification
- Enter phone number with country code
- Receive 6-digit OTP (logged to console in demo)
- Secure verification with hashed OTP storage

### 2. Message Queue
- View all messages with status indicators (Pending, Sent, Failed)
- Filter messages by status
- Manual sync button with network status awareness
- Pull-to-refresh functionality

### 3. Compose Message
- Rich text input with character counter (1000 max)
- Phone number validation
- Custom delivery time picker
- Quick delay buttons (1hr, 4hr, 1 day, 1 week)

### 4. Settings
- Toggle auto-sync on/off
- View message statistics
- Manual sync trigger
- Clear all data option
- User account information

## 🏗 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── MessageCard.tsx
│   ├── Loading.tsx
│   └── NetworkStatusBar.tsx
├── screens/            # Main app screens
│   ├── LoginScreen.tsx
│   ├── MessageQueueScreen.tsx
│   ├── ComposeScreen.tsx
│   └── SettingsScreen.tsx
├── services/           # Business logic and API calls
│   ├── storage.ts      # AsyncStorage operations
│   ├── supabase.ts     # Supabase client and operations
│   ├── network.ts      # Network connectivity monitoring
│   ├── notifications.ts # Push notification handling
│   ├── sync.ts         # Message synchronization logic
│   └── verification.ts # Phone verification flow
├── types/              # TypeScript type definitions
│   └── index.ts
└── utils/              # Helper functions and theme
    ├── helpers.ts
    └── theme.ts
```

## 🔧 Configuration

### Supabase Setup

Update the constants in `src/services/supabase.ts`:

```typescript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### Database Schema

The app requires two main tables in Supabase:

```sql
-- OTP verifications table
CREATE TABLE otp_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  hashed_otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table  
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  phone TEXT NOT NULL,
  deliver_after TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 📋 Usage

1. **First Time Setup**
   - Enter your phone number with country code
   - Check console for OTP (in demo mode)
   - Enter the 6-digit code to verify

2. **Composing Messages**
   - Tap the + button to create a new message
   - Enter message text and recipient phone number
   - Set delivery time using date picker or quick delay buttons
   - Tap "Queue Message" to save locally

3. **Message Management**
   - View all messages on the main screen
   - Filter by status: All, Pending, Sent, Failed
   - Edit pending messages by tapping the pencil icon
   - Delete messages by tapping the trash icon

4. **Sync Behavior**
   - Messages sync automatically when online (if auto-sync enabled)
   - Manual sync available in settings or main screen
   - Network status indicator shows connection state
   - Notifications sent on successful delivery

## 🔐 Security Features

- **OTP Hashing**: Phone verification codes are hashed using SHA-256
- **Local Storage**: Sensitive data encrypted with AsyncStorage
- **Network Validation**: Input validation and sanitization
- **Offline Security**: No sensitive data transmitted when offline

## 🧪 Demo Notes

- OTP codes are logged to console instead of sent via SMS for demo purposes
- Replace console logging with real SMS service integration for production
- All offline functionality works without internet connectivity
- Sync triggers automatically when network connectivity is restored

## 🚀 Production Deployment

### For Production Use:

1. **SMS Integration**
   - Replace console OTP logging with SMS service (Twilio, AWS SNS, etc.)
   - Add proper error handling for SMS delivery failures

2. **Authentication**
   - Implement JWT-based authentication with Supabase Auth
   - Add user session management

3. **Security**
   - Enable Row Level Security (RLS) in Supabase
   - Add proper API key management
   - Implement rate limiting for OTP requests

4. **Performance**
   - Add message pagination for large datasets
   - Implement background sync optimization
   - Add proper error tracking and analytics

5. **Build for Android**
   ```bash
   eas build --platform android
   ```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For questions or support, please open an issue in the GitHub repository.

---

**Built with ❤️ using React Native, Expo, TypeScript, and Supabase**