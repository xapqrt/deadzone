import { useState, useCallback } from 'react';

export interface LoadingState {
  [key: string]: boolean;
}

/**
 * Hook for managing multiple loading states
 */
export const useLoadingStates = (initialStates: string[] = []) => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>(() => {
    const initial: LoadingState = {};
    initialStates.forEach(key => {
      initial[key] = false;
    });
    return initial;
  });

  const setLoading = useCallback((key: string, isLoading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading,
    }));
  }, []);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(loading => loading);
  }, [loadingStates]);

  const clearAllLoading = useCallback(() => {
    const cleared: LoadingState = {};
    Object.keys(loadingStates).forEach(key => {
      cleared[key] = false;
    });
    setLoadingStates(cleared);
  }, [loadingStates]);

  return {
    loadingStates,
    setLoading,
    isLoading,
    isAnyLoading,
    clearAllLoading,
  };
};

/**
 * Async operation wrapper with loading state
 */
export const withLoading = async <T>(
  operation: () => Promise<T>,
  setLoading: (loading: boolean) => void,
  onError?: (error: any) => void
): Promise<T | null> => {
  try {
    setLoading(true);
    const result = await operation();
    return result;
  } catch (error) {
    if (onError) {
      onError(error);
    } else {
      throw error;
    }
    return null;
  } finally {
    setLoading(false);
  }
};

/**
 * Service for managing global loading state
 */
export class LoadingService {
  private static globalLoading: LoadingState = {};
  private static listeners: Array<(state: LoadingState) => void> = [];

  static setGlobalLoading(key: string, isLoading: boolean): void {
    this.globalLoading = {
      ...this.globalLoading,
      [key]: isLoading,
    };
    this.notifyListeners();
  }

  static isGlobalLoading(key: string): boolean {
    return this.globalLoading[key] || false;
  }

  static isAnyGlobalLoading(): boolean {
    return Object.values(this.globalLoading).some(loading => loading);
  }

  static subscribe(listener: (state: LoadingState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private static notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.globalLoading));
  }

  static clearAll(): void {
    this.globalLoading = {};
    this.notifyListeners();
  }
}

/**
 * Loading operation types
 */
export const LoadingTypes = {
  SYNC: 'sync',
  SENDING_MESSAGE: 'sendingMessage',
  LOADING_MESSAGES: 'loadingMessages',
  LOADING_CONVERSATIONS: 'loadingConversations',
  AUTHENTICATING: 'authenticating',
  SEARCHING_USERS: 'searchingUsers',
  SAVING_SETTINGS: 'savingSettings',
  DELETING_DATA: 'deletingData',
} as const;

export type LoadingType = typeof LoadingTypes[keyof typeof LoadingTypes];
