# SIM Card Phone Number Detection - Implementation Guide

## 🎯 Overview

This document outlines the implementation of SIM-based phone number detection in the Nozone Android app using React Native, Kotlin, and Android's SubscriptionManager API.

## 📋 Features Implemented

### ✅ Core Functionality
- **Multi-SIM Support**: Detects phone numbers from dual SIM devices
- **Permission Handling**: Proper Android 6.0+ permission management
- **Fallback System**: Manual input when SIM detection fails
- **Number Formatting**: Indian phone number formatting (+91 XXXXX XXXXX)
- **Validation**: Indian mobile number validation (6-9 prefix, 10 digits)

### ✅ Native Android Integration
- **SimCardModule.java**: Native module using SubscriptionManager API
- **SimCardPackage.java**: React Native bridge package 
- **Expo Plugin**: Automatic permission and module registration
- **Android Permissions**: READ_PHONE_STATE and READ_PHONE_NUMBERS

### ✅ QA & Testing
- **Comprehensive Testing**: Edge cases, permissions, error handling
- **Debug Logging**: Detailed logs for troubleshooting
- **Mock Data**: Development-time simulation
- **QA Screen**: Built-in testing interface

## 🔧 Architecture

### React Native Layer (`src/services/simCard.ts`)
```typescript
export class SimCardService {
  // Permission management for Android 10+
  static async requestPermissions(): Promise<boolean>
  
  // Get SIM card information
  static async getSimCardNumbers(): Promise<SimCardInfo[]>
  
  // Format Indian phone numbers
  static formatIndianPhoneNumber(phoneNumber: string): string
  
  // Validate Indian mobile numbers
  static validateIndianMobile(phoneNumber: string): boolean
}
```

### Native Android Layer (`SimCardModule.java`)
```java
public class SimCardModule extends ReactContextBaseJavaModule {
  // Check current permission status
  @ReactMethod public void checkPermissions(Promise promise)
  
  // Get SIM card info using SubscriptionManager
  @ReactMethod public void getSimCardInfo(Promise promise)
  
  // Multiple detection methods for compatibility
  private WritableArray getSimCardsFromSubscriptionManager(Context context)
  private WritableArray getSimCardsFromTelephonyManager(Context context)
}
```

### UI Components
- **PhoneNumberSelector**: Modal dialog for SIM selection
- **SimCardQAScreen**: Comprehensive testing interface
- **LoginScreen**: Integration with onboarding flow

## 🛡️ Permission Handling

### Android Versions Supported
- **Android 5.1+ (API 22)**: SubscriptionManager support
- **Android 6.0+ (API 23)**: Runtime permission requests
- **Android 10+ (API 29)**: Enhanced privacy requirements

### Required Permissions
```xml
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.READ_PHONE_NUMBERS" />
```

### Permission Flow
1. **Check Status**: Verify current permissions
2. **Request Missing**: Show permission dialogs
3. **Handle Denial**: Graceful fallback to manual input
4. **Explain Purpose**: Clear user messaging

## 📱 Edge Cases Handled

### ✅ Device Scenarios
- **No SIM Card**: Airplane mode or missing SIM
- **Single SIM**: Standard phone configuration  
- **Dual SIM**: Multiple active subscriptions
- **SIM Without Number**: Carrier doesn't expose line number
- **Invalid Numbers**: Non-Indian or malformed numbers

### ✅ Permission Scenarios
- **First Launch**: Initial permission request
- **Denied Once**: Re-request with explanation
- **Permanently Denied**: Fallback to manual input
- **Revoked Later**: Handle permission changes

### ✅ Error Scenarios
- **API Failures**: Native module crashes
- **Network Issues**: Offline operation (SIM detection is local)
- **Corrupted Data**: Invalid SIM information
- **Version Compatibility**: Android API differences

## 🧪 QA Testing Checklist

### Permission Tests
- [ ] First-time permission request works
- [ ] Permission denial shows fallback
- [ ] Re-requesting after denial works
- [ ] Permanently denied permissions handled
- [ ] Android version compatibility (8-14)

### SIM Detection Tests  
- [ ] Single SIM detection
- [ ] Dual SIM detection (different slots)
- [ ] No SIM scenario (airplane mode)
- [ ] SIM without phone number
- [ ] Invalid/corrupted SIM data
- [ ] Carrier-specific differences

### Number Formatting Tests
- [ ] Standard format: 9876543210 → +91 98765 43210
- [ ] With country code: +919876543210 → +91 98765 43210  
- [ ] With spaces/dashes: 98765-43210 → +91 98765 43210
- [ ] Invalid formats handled gracefully
- [ ] Non-Indian numbers rejected

### UI/UX Tests
- [ ] SIM selection dialog appears
- [ ] Manual input fallback works
- [ ] Loading states shown correctly
- [ ] Error messages are clear
- [ ] Accessibility features work

### Device-Specific Tests
- [ ] Samsung devices (Knox security)
- [ ] OnePlus devices (OxygenOS)
- [ ] Xiaomi devices (MIUI restrictions)
- [ ] Stock Android devices
- [ ] Rooted vs non-rooted devices

## 🐛 Debug Features

### Console Logging
```typescript
// Enable debug mode in development
const DebugLogger = {
  log: (tag: string, message: string, data?: any) => {
    if (__DEV__) console.log(`[${tag}] ${message}`, data);
  }
};
```

### QA Testing Screen
- **Permission Status**: Current permission state
- **SIM Detection**: Found SIM cards and their data
- **Edge Case Testing**: Automated validation tests
- **Error Simulation**: Mock failure scenarios

### Logcat Commands
```bash
# Filter SIM-related logs
adb logcat | grep "SimCard"

# Check permission grants/denials
adb logcat | grep "Permission"

# Monitor subscription manager calls
adb logcat | grep "SubscriptionManager"
```

## 🚀 Implementation Steps

### 1. Native Module Setup
1. Copy `SimCardModule.java` and `SimCardPackage.java` to Android project
2. Add permissions to `AndroidManifest.xml`
3. Register package in `MainApplication.java`

### 2. React Native Integration
1. Implement `SimCardService` with proper error handling
2. Add permission request flow
3. Create UI components for SIM selection

### 3. Testing & QA
1. Test on multiple device types
2. Verify permission flows
3. Test edge cases thoroughly
4. Validate number formatting

### 4. Production Readiness
1. Remove debug logging in production builds
2. Add analytics for success rates
3. Monitor crash reports
4. User feedback collection

## 🔍 Troubleshooting

### Common Issues

**Issue**: "Permission denied" errors
```
Solution: Ensure both READ_PHONE_STATE and READ_PHONE_NUMBERS are requested on Android 6.0+
```

**Issue**: No SIM cards detected
```
Solution: Check device has SIM, not in airplane mode, and permissions granted
```

**Issue**: Numbers not formatted correctly
```
Solution: Verify phone numbers are valid Indian mobile numbers (6-9 prefix, 10 digits)
```

**Issue**: Native module not found
```
Solution: Ensure SimCardPackage is registered in MainApplication.java and app rebuilt
```

### Debug Commands
```bash
# Check current permissions
adb shell dumpsys package com.nozone.app | grep permission

# Test SIM detection manually
adb shell am start -n com.nozone.app/.MainActivity

# Monitor native module calls
adb logcat | grep "SimCardModule"
```

## 📈 Success Metrics

### KPIs to Track
- **Detection Success Rate**: % of users with successful SIM detection
- **Permission Grant Rate**: % of users who grant phone permissions
- **Fallback Usage**: % using manual input vs SIM detection
- **Error Rates**: Crashes or failures during detection
- **User Satisfaction**: Onboarding completion rates

### Expected Results
- **90%+ Detection Rate**: On devices with valid SIM cards
- **80%+ Permission Grant**: With proper explanation
- **<1% Crash Rate**: Robust error handling
- **15% Faster Onboarding**: Reduced manual typing

## 🎉 Production Deployment

### Pre-Launch Checklist
- [ ] All QA tests passing
- [ ] Multiple device testing complete
- [ ] Permission flows validated
- [ ] Error handling tested
- [ ] Performance benchmarked
- [ ] Analytics configured
- [ ] User documentation ready

### Monitoring Setup
- **Crash Reporting**: Firebase Crashlytics integration
- **Analytics**: Track permission grants, detection success
- **User Feedback**: In-app feedback for SIM detection issues
- **Performance**: Monitor detection speed and accuracy

This implementation provides a robust, user-friendly SIM card phone number detection system that handles the complexities of Android permissions and device variations while maintaining excellent user experience.
