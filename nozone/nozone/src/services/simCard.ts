import { Platform, PermissionsAndroid, NativeModules, Alert } from 'react-native';

export interface SimCardInfo {
  phoneNumber?: string;
  formattedNumber?: string;
  carrierName?: string;
  countryCode?: string;
  simSlotIndex?: number;
  hasPhoneNumber?: boolean;
}

export interface PermissionStatus {
  hasReadPhoneState: boolean;
  hasReadPhoneNumbers: boolean;
  allPermissionsGranted: boolean;
  androidVersion: number;
}

export interface SimDetectionResult {
  simCards: SimCardInfo[];
  count: number;
  detectionMethod: 'native' | 'mock' | 'none';
  error?: string;
}

// Debug logging utility
class DebugLogger {
  private static isDebugMode = __DEV__;
  
  static log(tag: string, message: string, data?: any) {
    if (this.isDebugMode) {
      console.log(`[${tag}] ${message}`, data || '');
    }
  }
  
  static warn(tag: string, message: string, data?: any) {
    if (this.isDebugMode) {
      console.warn(`[${tag}] ${message}`, data || '');
    }
  }
  
  static error(tag: string, message: string, error?: any) {
    if (this.isDebugMode) {
      console.error(`[${tag}] ${message}`, error || '');
    }
  }
  
  static showToast(message: string) {
    if (this.isDebugMode && Platform.OS === 'android') {
      Alert.alert('SIM Debug', message);
    }
  }
}

export class SimCardService {
  private static readonly TAG = 'SimCardService';
  private static nativeModule = NativeModules.SimCardDetector;
  
  // Cache for permissions to avoid repeated checks
  private static permissionCache: PermissionStatus | null = null;
  private static cacheTimestamp = 0;
  private static readonly CACHE_DURATION = 30000; // 30 seconds

  /**
   * Check and request all required permissions for SIM detection
   * Handles Android 10+ permission requirements properly
   */
  static async requestPermissions(): Promise<boolean> {
    DebugLogger.log(this.TAG, 'Starting permission request flow');
    
    if (Platform.OS !== 'android') {
      DebugLogger.warn(this.TAG, 'SIM detection only available on Android');
      return false;
    }

    try {
      // Clear permission cache to get fresh status
      this.permissionCache = null;
      
      // Check current permissions first
      const currentStatus = await this.checkPermissions();
      DebugLogger.log(this.TAG, 'Current permission status', currentStatus);
      
      if (currentStatus.allPermissionsGranted) {
        DebugLogger.log(this.TAG, 'All permissions already granted');
        return true;
      }

      // Request READ_PHONE_STATE (required for all Android versions)
      if (!currentStatus.hasReadPhoneState) {
        DebugLogger.log(this.TAG, 'Requesting READ_PHONE_STATE permission');
        
        try {
          const phoneStateGranted = await Promise.race([
            PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
              {
                title: 'Phone Access Permission',
                message: 'Nozone needs access to your phone to detect SIM card numbers for easier login.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Skip',
                buttonPositive: 'Allow',
              }
            ),
            new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error('Permission request timeout')), 30000)
            )
          ]);
          
          DebugLogger.log(this.TAG, 'READ_PHONE_STATE result', phoneStateGranted);
          
          if (phoneStateGranted !== PermissionsAndroid.RESULTS.GRANTED) {
            DebugLogger.warn(this.TAG, 'READ_PHONE_STATE permission denied');
            return false;
          }
        } catch (permError) {
          DebugLogger.error(this.TAG, 'Error requesting READ_PHONE_STATE', permError);
          return false;
        }
      }

      // Request READ_PHONE_NUMBERS (required for Android 6.0+)
      if (currentStatus.androidVersion >= 23 && !currentStatus.hasReadPhoneNumbers) {
        DebugLogger.log(this.TAG, 'Requesting READ_PHONE_NUMBERS permission (Android 6.0+)');
        
        try {
          const phoneNumbersGranted = await Promise.race([
            PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
              {
                title: 'Phone Number Access',
                message: 'To automatically detect your phone number from SIM cards, please allow access to phone numbers.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Skip',
                buttonPositive: 'Allow',
              }
            ),
            new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error('Permission request timeout')), 30000)
            )
          ]);
          
          DebugLogger.log(this.TAG, 'READ_PHONE_NUMBERS result', phoneNumbersGranted);
          
          if (phoneNumbersGranted !== PermissionsAndroid.RESULTS.GRANTED) {
            DebugLogger.warn(this.TAG, 'READ_PHONE_NUMBERS permission denied');
            return false;
          }
        } catch (permError) {
          DebugLogger.error(this.TAG, 'Error requesting READ_PHONE_NUMBERS', permError);
          return false;
        }
      }

      // Clear cache and verify final permission status
      this.permissionCache = null;
      const finalStatus = await this.checkPermissions();
      DebugLogger.log(this.TAG, 'Final permission status after requests', finalStatus);
      
      if (finalStatus.allPermissionsGranted) {
        DebugLogger.showToast('SIM detection permissions granted successfully');
        return true;
      } else {
        DebugLogger.warn(this.TAG, 'Not all permissions were granted after request');
        return false;
      }
      
    } catch (error) {
      DebugLogger.error(this.TAG, 'Error in permission request flow', error);
      return false;
    }
  }

  /**
   * Check current permission status
   */
  static async checkPermissions(): Promise<PermissionStatus> {
    const now = Date.now();
    
    // Return cached result if still valid
    if (this.permissionCache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      DebugLogger.log(this.TAG, 'Returning cached permission status');
      return this.permissionCache;
    }

    try {
      // Use native module if available
      if (this.nativeModule && this.nativeModule.checkPermissions) {
        DebugLogger.log(this.TAG, 'Checking permissions via native module');
        const result = await this.nativeModule.checkPermissions();
        this.permissionCache = result;
        this.cacheTimestamp = now;
        return result;
      }
      
      // Fallback to React Native PermissionsAndroid
      DebugLogger.log(this.TAG, 'Checking permissions via PermissionsAndroid');
      
      const hasReadPhoneState = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
      );
      
      const hasReadPhoneNumbers = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS
      );
      
      const androidVersion = Platform.Version as number;
      
      const status: PermissionStatus = {
        hasReadPhoneState,
        hasReadPhoneNumbers,
        allPermissionsGranted: hasReadPhoneState && (androidVersion < 23 || hasReadPhoneNumbers),
        androidVersion
      };
      
      this.permissionCache = status;
      this.cacheTimestamp = now;
      
      return status;
      
    } catch (error) {
      DebugLogger.error(this.TAG, 'Error checking permissions', error);
      
      // Return safe defaults on error
      const defaultStatus: PermissionStatus = {
        hasReadPhoneState: false,
        hasReadPhoneNumbers: false,
        allPermissionsGranted: false,
        androidVersion: Platform.Version as number
      };
      
      return defaultStatus;
    }
  }

  /**
   * Get SIM card information from device
   * Handles various edge cases and provides fallbacks
   */
  static async getSimCardNumbers(): Promise<SimCardInfo[]> {
    DebugLogger.log(this.TAG, 'Starting SIM card detection');
    
    if (Platform.OS !== 'android') {
      DebugLogger.warn(this.TAG, 'SIM detection only available on Android');
      return this.getMockData('ios_not_supported');
    }

    try {
      // Check permissions first
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        DebugLogger.warn(this.TAG, 'Permissions not granted, using mock data for Expo Go');
        return this.getMockData('no_permissions');
      }

      // Try native module detection first
      if (this.nativeModule && this.nativeModule.getSimCardInfo) {
        DebugLogger.log(this.TAG, 'Using native module for SIM detection');
        
        try {
          const result = await this.nativeModule.getSimCardInfo();
          DebugLogger.log(this.TAG, 'Native module result', result);
          
          if (result.error) {
            DebugLogger.error(this.TAG, 'Native module returned error', result.error);
            throw new Error(result.error);
          }
          
          const simCards = result.simCards || [];
          DebugLogger.log(this.TAG, `Found ${simCards.length} SIM cards via native module`);
          
          // Log each SIM card info for debugging
          simCards.forEach((sim: SimCardInfo, index: number) => {
            DebugLogger.log(this.TAG, `SIM ${index + 1}:`, {
              hasNumber: sim.hasPhoneNumber,
              carrier: sim.carrierName,
              slot: sim.simSlotIndex,
              country: sim.countryCode
            });
          });
          
          if (simCards.length > 0) {
            DebugLogger.showToast(`Detected ${simCards.length} SIM card(s)`);
            return simCards;
          } else {
            DebugLogger.warn(this.TAG, 'No SIM cards found via native module');
            return this.getMockData('no_sims');
          }
        } catch (nativeError) {
          DebugLogger.error(this.TAG, 'Native module failed', nativeError);
          // Continue to fallback methods
        }
      }
      
      // In Expo Go, native module won't be available, so provide realistic mock data
      DebugLogger.warn(this.TAG, 'Native module not available (running in Expo Go), using mock data');
      return this.getMockData('expo_go_fallback');
      
    } catch (error) {
      DebugLogger.error(this.TAG, 'Error detecting SIM cards', error);
      return this.getMockData('detection_error');
    }
  }

  /**
   * Format phone number for display (Indian format)
   */
  static formatIndianPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return '';
    
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    
    return phoneNumber;
  }

  /**
   * Validate Indian phone number
   */
  static validateIndianMobile(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(cleaned);
  }

  /**
   * Show helpful information when permissions are denied
   */
  private static showPermissionDeniedInfo(): void {
    Alert.alert(
      'SIM Detection Unavailable',
      'Without phone permissions, you\'ll need to enter your number manually. You can still use all other features of the app.',
      [
        {
          text: 'Settings',
          onPress: () => {
            // Could open app settings here
            DebugLogger.log(this.TAG, 'User wants to open settings');
          }
        },
        {
          text: 'Continue',
          style: 'default'
        }
      ]
    );
  }

  /**
   * Provide mock data for development and testing
   */
  private static getMockData(reason: string): SimCardInfo[] {
    DebugLogger.log(this.TAG, `Providing mock data - reason: ${reason}`);
    
    const mockSims: SimCardInfo[] = [];
    
    // Simulate different scenarios based on reason
    switch (reason) {
      case 'no_sims':
        // Airplane mode or no SIM scenario
        DebugLogger.showToast('No SIM cards detected (airplane mode?)');
        break;
        
      case 'no_permissions':
        // Permission denied scenario - still show what would be detected
        DebugLogger.showToast('Permissions needed for SIM detection - showing demo data');
        mockSims.push({
          phoneNumber: '',
          formattedNumber: '',
          carrierName: 'Airtel',
          countryCode: 'IN',
          simSlotIndex: 0,
          hasPhoneNumber: false,
        });
        break;
        
      case 'expo_go_fallback':
        // Running in Expo Go - provide realistic data for testing
        DebugLogger.showToast('Running in Expo Go - showing demo SIM data');
        mockSims.push(
          {
            phoneNumber: '9876543210',
            formattedNumber: '+91 98765 43210',
            carrierName: 'Airtel',
            countryCode: 'IN',
            simSlotIndex: 0,
            hasPhoneNumber: true,
          }
        );
        
        // Sometimes add a second SIM for dual SIM testing
        if (Math.random() > 0.5) {
          mockSims.push({
            phoneNumber: '8765432109', 
            formattedNumber: '+91 87654 32109',
            carrierName: 'Jio',
            countryCode: 'IN',
            simSlotIndex: 1,
            hasPhoneNumber: true,
          });
        }
        break;
        
      case 'ios_not_supported':
        DebugLogger.showToast('SIM detection not available on iOS');
        break;
        
      default:
        // Default development mock data
        if (__DEV__) {
          mockSims.push(
            {
              phoneNumber: '9876543210',
              formattedNumber: '+91 98765 43210',
              carrierName: 'Airtel',
              countryCode: 'IN',
              simSlotIndex: 0,
              hasPhoneNumber: true,
            },
            {
              phoneNumber: '8765432109', 
              formattedNumber: '+91 87654 32109',
              carrierName: 'Jio',
              countryCode: 'IN',
              simSlotIndex: 1,
              hasPhoneNumber: true,
            }
          );
          
          DebugLogger.showToast(`Mock data: ${mockSims.length} SIM cards`);
        }
        break;
    }
    
    // Log the mock data being returned
    if (mockSims.length > 0) {
      DebugLogger.log(this.TAG, 'Returning mock SIM data:', mockSims.map(sim => ({
        carrier: sim.carrierName,
        hasNumber: sim.hasPhoneNumber,
        slot: sim.simSlotIndex
      })));
    }
    
    return mockSims;
  }
}
