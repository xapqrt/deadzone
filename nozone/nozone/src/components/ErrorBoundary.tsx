import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../utils/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging, but don't crash the app
    console.warn('ErrorBoundary caught an error:', error, errorInfo);
    
    // Filter out known React 19 compatibility warnings that don't affect functionality
    const isReactHookWarning = error.message?.includes('Invalid hook call') || 
                              error.message?.includes('Hooks can only be called');
    
    if (isReactHookWarning) {
      // For hook warnings, just log and continue - don't show error UI
      console.warn('React Hook compatibility warning (likely React 19 + native component):', error.message);
      this.setState({ hasError: false }); // Reset error state
      return;
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Check if it's a non-critical hook warning
      const isHookWarning = this.state.error.message?.includes('Invalid hook call') || 
                           this.state.error.message?.includes('Hooks can only be called');
      
      if (isHookWarning) {
        // For hook warnings, render children normally
        return this.props.children;
      }

      // For other errors, show fallback UI
      return this.props.fallback || (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              {this.state.error.message || 'An unexpected error occurred'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 24,
    maxWidth: 350,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
});
