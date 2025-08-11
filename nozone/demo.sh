#!/bin/bash

# Nozone Demo Script
# This script demonstrates how to test the Nozone app

echo "🚀 Nozone - Offline Messaging App Demo"
echo "======================================="
echo ""

echo "📋 Prerequisites Check:"
echo "✅ Node.js $(node --version)"
echo "✅ npm $(npm --version)"
echo "✅ Expo CLI: $(npx expo --version)"
echo ""

echo "🏗️  Building the app..."
cd nozone

echo "📦 Installing dependencies..."
npm install

echo "🔍 Running TypeScript check..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful!"
else
    echo "❌ TypeScript errors found"
    exit 1
fi

echo ""
echo "📱 Starting Expo development server..."
echo "Scan the QR code with Expo Go app to test on your device"
echo ""
echo "🔧 Demo Features to Test:"
echo "1. Phone Verification (check console for OTP)"
echo "2. Compose and queue messages offline"
echo "3. Toggle airplane mode to test offline functionality"
echo "4. Turn connectivity back on to see auto-sync"
echo "5. Test custom delivery delays"
echo "6. Edit and delete pending messages"
echo "7. View settings and statistics"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npx expo start
