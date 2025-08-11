package com.nozone.simcard;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.telephony.TelephonyManager;
import android.util.Log;

import androidx.core.app.ActivityCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.List;

public class SimCardModule extends ReactContextBaseJavaModule {
    private static final String TAG = "SimCardModule";
    private static final String MODULE_NAME = "SimCardDetector";
    
    // Required permissions for SIM detection
    private static final String[] REQUIRED_PERMISSIONS = {
        Manifest.permission.READ_PHONE_STATE,
        Manifest.permission.READ_PHONE_NUMBERS
    };

    public SimCardModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void checkPermissions(Promise promise) {
        try {
            Log.d(TAG, "Checking SIM card permissions...");
            
            WritableMap result = Arguments.createMap();
            boolean hasReadPhoneState = hasPermission(Manifest.permission.READ_PHONE_STATE);
            boolean hasReadPhoneNumbers = hasPermission(Manifest.permission.READ_PHONE_NUMBERS);
            
            result.putBoolean("hasReadPhoneState", hasReadPhoneState);
            result.putBoolean("hasReadPhoneNumbers", hasReadPhoneNumbers);
            result.putBoolean("allPermissionsGranted", hasReadPhoneState && hasReadPhoneNumbers);
            result.putInt("androidVersion", Build.VERSION.SDK_INT);
            
            Log.d(TAG, String.format("Permission status - READ_PHONE_STATE: %b, READ_PHONE_NUMBERS: %b", 
                hasReadPhoneState, hasReadPhoneNumbers));
            
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error checking permissions", e);
            promise.reject("PERMISSION_CHECK_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void getSimCardInfo(Promise promise) {
        try {
            Log.d(TAG, "Starting SIM card detection...");
            
            // Check permissions first
            if (!hasRequiredPermissions()) {
                Log.w(TAG, "Missing required permissions for SIM detection");
                WritableMap errorResult = Arguments.createMap();
                errorResult.putString("error", "MISSING_PERMISSIONS");
                errorResult.putString("message", "Phone state permissions are required");
                promise.resolve(errorResult);
                return;
            }

            WritableArray simCards = Arguments.createArray();
            Context context = getReactApplicationContext();
            
            // Method 1: Try SubscriptionManager (Android 5.1+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                try {
                    simCards = getSimCardsFromSubscriptionManager(context);
                    Log.d(TAG, String.format("Found %d SIM cards using SubscriptionManager", simCards.size()));
                } catch (Exception e) {
                    Log.w(TAG, "SubscriptionManager method failed, trying TelephonyManager", e);
                }
            }
            
            // Method 2: Fallback to TelephonyManager if no SIMs found
            if (simCards.size() == 0) {
                try {
                    simCards = getSimCardsFromTelephonyManager(context);
                    Log.d(TAG, String.format("Found %d SIM cards using TelephonyManager", simCards.size()));
                } catch (Exception e) {
                    Log.w(TAG, "TelephonyManager method also failed", e);
                }
            }
            
            WritableMap result = Arguments.createMap();
            result.putArray("simCards", simCards);
            result.putInt("count", simCards.size());
            result.putString("detectionMethod", simCards.size() > 0 ? "native" : "none");
            
            Log.d(TAG, String.format("SIM detection completed. Found %d SIM cards", simCards.size()));
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Unexpected error during SIM detection", e);
            promise.reject("SIM_DETECTION_ERROR", e.getMessage(), e);
        }
    }

    private WritableArray getSimCardsFromSubscriptionManager(Context context) {
        WritableArray simCards = Arguments.createArray();
        
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP_MR1) {
            return simCards;
        }

        try {
            SubscriptionManager subscriptionManager = SubscriptionManager.from(context);
            List<SubscriptionInfo> subscriptions = subscriptionManager.getActiveSubscriptionInfoList();
            
            if (subscriptions == null || subscriptions.isEmpty()) {
                Log.d(TAG, "No active subscriptions found");
                return simCards;
            }
            
            Log.d(TAG, String.format("Processing %d active subscriptions", subscriptions.size()));
            
            for (SubscriptionInfo subscription : subscriptions) {
                WritableMap simCard = Arguments.createMap();
                
                try {
                    // Get basic SIM info
                    int slotIndex = subscription.getSimSlotIndex();
                    String carrierName = subscription.getCarrierName() != null ? 
                        subscription.getCarrierName().toString() : "Unknown";
                    String countryIso = subscription.getCountryIso();
                    
                    simCard.putInt("simSlotIndex", slotIndex);
                    simCard.putString("carrierName", carrierName);
                    simCard.putString("countryCode", countryIso != null ? countryIso.toUpperCase() : "");
                    
                    // Try to get phone number
                    String phoneNumber = null;
                    
                    // Method 1: From subscription info (Android 6.0+)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        try {
                            phoneNumber = subscription.getNumber();
                            Log.d(TAG, String.format("SIM %d - Number from subscription: %s", 
                                slotIndex, phoneNumber != null ? "***" + phoneNumber.substring(Math.max(0, phoneNumber.length() - 4)) : "null"));
                        } catch (Exception e) {
                            Log.w(TAG, String.format("Could not get number from subscription %d", slotIndex), e);
                        }
                    }
                    
                    // Method 2: From TelephonyManager if subscription didn't work
                    if (phoneNumber == null || phoneNumber.isEmpty()) {
                        try {
                            TelephonyManager telephonyManager = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                phoneNumber = telephonyManager.getLine1Number(subscription.getSubscriptionId());
                            } else {
                                phoneNumber = telephonyManager.getLine1Number();
                            }
                            Log.d(TAG, String.format("SIM %d - Number from TelephonyManager: %s", 
                                slotIndex, phoneNumber != null ? "***" + phoneNumber.substring(Math.max(0, phoneNumber.length() - 4)) : "null"));
                        } catch (Exception e) {
                            Log.w(TAG, String.format("Could not get number from TelephonyManager for SIM %d", slotIndex), e);
                        }
                    }
                    
                    // Clean and validate phone number
                    if (phoneNumber != null && !phoneNumber.isEmpty()) {
                        phoneNumber = cleanPhoneNumber(phoneNumber);
                        if (isValidIndianNumber(phoneNumber)) {
                            simCard.putString("phoneNumber", phoneNumber);
                            simCard.putString("formattedNumber", formatIndianNumber(phoneNumber));
                        } else {
                            Log.d(TAG, String.format("SIM %d - Invalid phone number format: %s", slotIndex, phoneNumber));
                            simCard.putString("phoneNumber", "");
                            simCard.putString("formattedNumber", "");
                        }
                    } else {
                        Log.d(TAG, String.format("SIM %d - No phone number available", slotIndex));
                        simCard.putString("phoneNumber", "");
                        simCard.putString("formattedNumber", "");
                    }
                    
                    simCard.putBoolean("hasPhoneNumber", phoneNumber != null && !phoneNumber.isEmpty());
                    simCards.pushMap(simCard);
                    
                } catch (Exception e) {
                    Log.e(TAG, String.format("Error processing subscription %d", subscription.getSimSlotIndex()), e);
                }
            }
            
        } catch (SecurityException e) {
            Log.e(TAG, "Security exception accessing subscription manager", e);
            throw e;
        } catch (Exception e) {
            Log.e(TAG, "Error accessing subscription manager", e);
            throw e;
        }
        
        return simCards;
    }

    private WritableArray getSimCardsFromTelephonyManager(Context context) {
        WritableArray simCards = Arguments.createArray();
        
        try {
            TelephonyManager telephonyManager = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
            
            if (telephonyManager == null) {
                Log.w(TAG, "TelephonyManager is null");
                return simCards;
            }
            
            // Get primary SIM info
            String phoneNumber = telephonyManager.getLine1Number();
            String networkOperatorName = telephonyManager.getNetworkOperatorName();
            String networkCountryIso = telephonyManager.getNetworkCountryIso();
            
            Log.d(TAG, String.format("TelephonyManager - Operator: %s, Country: %s, Number: %s", 
                networkOperatorName, networkCountryIso, phoneNumber != null ? "***" + phoneNumber.substring(Math.max(0, phoneNumber.length() - 4)) : "null"));
            
            if (phoneNumber != null && !phoneNumber.isEmpty()) {
                WritableMap simCard = Arguments.createMap();
                
                phoneNumber = cleanPhoneNumber(phoneNumber);
                
                simCard.putInt("simSlotIndex", 0);
                simCard.putString("carrierName", networkOperatorName != null ? networkOperatorName : "Unknown");
                simCard.putString("countryCode", networkCountryIso != null ? networkCountryIso.toUpperCase() : "");
                
                if (isValidIndianNumber(phoneNumber)) {
                    simCard.putString("phoneNumber", phoneNumber);
                    simCard.putString("formattedNumber", formatIndianNumber(phoneNumber));
                    simCard.putBoolean("hasPhoneNumber", true);
                } else {
                    simCard.putString("phoneNumber", "");
                    simCard.putString("formattedNumber", "");
                    simCard.putBoolean("hasPhoneNumber", false);
                }
                
                simCards.pushMap(simCard);
            }
            
        } catch (SecurityException e) {
            Log.e(TAG, "Security exception accessing telephony manager", e);
            throw e;
        } catch (Exception e) {
            Log.e(TAG, "Error accessing telephony manager", e);
            throw e;
        }
        
        return simCards;
    }

    private boolean hasRequiredPermissions() {
        boolean hasReadPhoneState = hasPermission(Manifest.permission.READ_PHONE_STATE);
        boolean hasReadPhoneNumbers = hasPermission(Manifest.permission.READ_PHONE_NUMBERS);
        
        // READ_PHONE_NUMBERS is only required on Android 6.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return hasReadPhoneState && hasReadPhoneNumbers;
        } else {
            return hasReadPhoneState;
        }
    }

    private boolean hasPermission(String permission) {
        return ActivityCompat.checkSelfPermission(getReactApplicationContext(), permission) 
            == PackageManager.PERMISSION_GRANTED;
    }

    private String cleanPhoneNumber(String phoneNumber) {
        if (phoneNumber == null) return "";
        
        // Remove all non-digit characters except +
        String cleaned = phoneNumber.replaceAll("[^+\\d]", "");
        
        // Handle country codes
        if (cleaned.startsWith("+91")) {
            cleaned = cleaned.substring(3);
        } else if (cleaned.startsWith("91") && cleaned.length() == 12) {
            cleaned = cleaned.substring(2);
        }
        
        return cleaned;
    }

    private boolean isValidIndianNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isEmpty()) return false;
        
        String cleaned = cleanPhoneNumber(phoneNumber);
        
        // Indian mobile numbers: 10 digits starting with 6, 7, 8, or 9
        return cleaned.matches("^[6-9]\\d{9}$");
    }

    private String formatIndianNumber(String phoneNumber) {
        if (!isValidIndianNumber(phoneNumber)) return phoneNumber;
        
        String cleaned = cleanPhoneNumber(phoneNumber);
        
        // Format as: +91 98765 43210
        return String.format("+91 %s %s", cleaned.substring(0, 5), cleaned.substring(5));
    }
}
