# How to Debug App Crashes

## Method 1: Use Development Build (RECOMMENDED)

1. **Install the development build I'm creating** - This will give you better error reporting
2. **Connect to development server**: 
   - I've started a development server at `http://localhost:8081`
   - When you open the dev build, scan the QR code or enter the URL manually
   - This will show live logs in the terminal

## Method 2: Enable ADB Logging (Android)

1. **Enable Developer Options** on your phone:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings > Developer Options
   - Enable "USB Debugging"

2. **Connect via ADB**:
   - Connect your phone to computer via USB
   - Allow USB debugging when prompted
   - Run: `adb logcat | grep -i "nozone\|react\|expo\|crash"`

## Method 3: Use Expo Logging

1. **Install Expo Go** app on your phone
2. **Start development server**: Already running at localhost:8081
3. **Scan QR code** from your phone's Expo Go app
4. Logs will appear in the terminal where `expo start` is running

## Method 4: Check Expo Build Logs

The build logs are available at:
https://expo.dev/accounts/xapqrt2/projects/nozone/builds/3c0d400a-073b-4599-b89b-d4eca38f584a

## Method 5: Add Console Logs to App

I can add strategic console.log statements to help identify where the crash occurs.

## Method 6: Use React Native Debugger

1. Install React Native Debugger
2. Enable remote debugging in development build
3. View console, network, and Redux logs

## Quick Fix Recommendations

Based on the code structure, potential crash causes:
1. **Supabase connection issues** - Check environment variables
2. **Theme/styling issues** - React 19 compatibility 
3. **Permissions issues** - Phone state access
4. **Storage initialization** - AsyncStorage setup

Let me know which method you'd prefer to try first!
