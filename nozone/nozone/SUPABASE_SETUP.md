# 🔧 Supabase Setup Guide for Nozone

## Step 1: Create Supabase Project

1. **Go to [supabase.com](https://supabase.com)**
2. **Sign up** for a free account
3. **Create a new project**:
   - Project name: `nozone`
   - Database password: (choose a strong password)
   - Region: Choose closest to India (e.g., `ap-south-1`)

## Step 2: Get Your Credentials

1. **Go to Settings > API** in your Supabase dashboard
2. **Copy these values**:
   - `Project URL` (looks like: `https://abcdefg.supabase.co`)
   - `Project API Key` (anon, public key)

## Step 3: Update Environment Variables

1. **Open the `.env` file** in your project root
2. **Replace the placeholder values**:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

## Step 4: Set Up Database Schema

1. **Go to SQL Editor** in your Supabase dashboard
2. **Copy and paste** the entire contents of `supabase-schema.sql`
3. **Click "Run"** to create all the tables and policies

## Step 5: Test the Connection

1. **Restart your Expo server**:
   ```bash
   # Stop the current server (Ctrl+C)
   cd /workspaces/nozone/nozone
   npx expo start --tunnel
   ```

2. **Try to login** with an Indian phone number like: `9876543210`

## 📱 Indian Phone Number Support

The app now supports:
- ✅ **10-digit Indian mobile numbers** (starting with 6, 7, 8, or 9)
- ✅ **Auto-formatting** with +91 country code
- ✅ **Proper validation** for Indian number format
- ✅ **Visual prefix** showing "+91" in the input field

## 🚀 What Works Now

- **Phone verification** with OTP (currently logs OTP to console)
- **Offline message storage** using AsyncStorage
- **Beautiful UI** with dark theme and mint green accents
- **Message queuing** with delivery scheduling
- **Network status** monitoring
- **Animated components** throughout the app

## 🔮 Next Steps (Optional)

1. **Add SMS service** (Twilio, AWS SNS, etc.) for real OTP delivery
2. **Enable push notifications** for message delivery confirmations
3. **Add more time zone** support for scheduled messages
4. **Implement message encryption** for security

---

**Need help?** The OTP will be logged to the console for testing. In production, you'd integrate with an SMS service to actually send the codes.
