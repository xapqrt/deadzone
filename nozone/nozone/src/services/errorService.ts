import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: any;
  context?: string;
  timestamp?: Date;
}

export class ErrorService {
  private static errors: ErrorInfo[] = [];
  private static maxStoredErrors = 50;

  /**
   * Log error for debugging while showing user-friendly message
   */
  static handleError(error: any, context?: string, showToUser = true): void {
    const errorInfo: ErrorInfo = {
      message: error.message || 'An unexpected error occurred',
      code: error.code,
      details: error,
      context,
      timestamp: new Date(),
    };

    // Store error for debugging
    this.addError(errorInfo);

    // Log to console in development
    if (__DEV__) {
      console.error(`[${context || 'Error'}]:`, error);
    }

    // Show user-friendly message
    if (showToUser) {
      this.showUserMessage(errorInfo);
    }
  }

  /**
   * Show user-friendly error message
   */
  private static showUserMessage(errorInfo: ErrorInfo): void {
    const userMessage = this.getUserFriendlyMessage(errorInfo);
    
    Toast.show({
      type: 'error',
      text1: 'Something went wrong',
      text2: userMessage,
      visibilityTime: 4000,
      autoHide: true,
    });
  }

  /**
   * Convert technical error to user-friendly message
   */
  private static getUserFriendlyMessage(errorInfo: ErrorInfo): string {
    const { message, code, context } = errorInfo;

    // Network-related errors
    if (message.includes('network') || message.includes('fetch')) {
      return 'Please check your internet connection and try again';
    }

    // Authentication errors
    if (code === 'UNAUTHORIZED' || message.includes('auth')) {
      return 'Please log in again to continue';
    }

    // Database/sync errors
    if (context?.includes('sync') || context?.includes('database')) {
      return 'Unable to sync data. Your changes are saved locally';
    }

    // Message sending errors
    if (context?.includes('message') || context?.includes('send')) {
      return 'Message could not be sent. It will retry when connection improves';
    }

    // Storage errors
    if (context?.includes('storage') || message.includes('storage')) {
      return 'Unable to save data locally. Please try again';
    }

    // Validation errors
    if (message.includes('invalid') || message.includes('required')) {
      return message; // Show validation messages as-is
    }

    // Default fallback
    return 'Something unexpected happened. Please try again';
  }

  /**
   * Store error for debugging
   */
  private static addError(errorInfo: ErrorInfo): void {
    this.errors.unshift(errorInfo);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxStoredErrors) {
      this.errors = this.errors.slice(0, this.maxStoredErrors);
    }
  }

  /**
   * Get stored errors for debugging
   */
  static getStoredErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  /**
   * Clear stored errors
   */
  static clearErrors(): void {
    this.errors = [];
  }

  /**
   * Show critical error dialog
   */
  static showCriticalError(message: string, onRetry?: () => void): void {
    Alert.alert(
      'Error',
      message,
      [
        { text: 'OK', style: 'default' },
        ...(onRetry ? [{ text: 'Retry', onPress: onRetry }] : []),
      ],
      { cancelable: false }
    );
  }

  /**
   * Show success message
   */
  static showSuccess(message: string, details?: string): void {
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: details || message,
      visibilityTime: 3000,
      autoHide: true,
    });
  }

  /**
   * Show info message
   */
  static showInfo(message: string, details?: string): void {
    Toast.show({
      type: 'info',
      text1: message,
      text2: details,
      visibilityTime: 3000,
      autoHide: true,
    });
  }

  /**
   * Show warning message
   */
  static showWarning(message: string, details?: string): void {
    Toast.show({
      type: 'error', // Use error type for warnings to get user attention
      text1: 'Warning',
      text2: details || message,
      visibilityTime: 4000,
      autoHide: true,
    });
  }
}

// Convenience functions
export const showError = (error: any, context?: string) => 
  ErrorService.handleError(error, context, true);

export const logError = (error: any, context?: string) => 
  ErrorService.handleError(error, context, false);

export const showSuccess = (message: string, details?: string) => 
  ErrorService.showSuccess(message, details);

export const showInfo = (message: string, details?: string) => 
  ErrorService.showInfo(message, details);

export const showWarning = (message: string, details?: string) => 
  ErrorService.showWarning(message, details);
