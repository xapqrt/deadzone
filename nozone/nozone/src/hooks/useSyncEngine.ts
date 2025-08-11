import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { SyncService } from '../services/sync';
import { useOnlineStatus } from './useOnlineStatus';
import { StorageService } from '../services/storage';
import { Message } from '../types';

export const useSyncEngine = (userId: string) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  // coarseTick increments immediately on sync completion, then every 10 minutes.
  const [coarseTick, setCoarseTick] = useState<number>(0);
  const { isOnline } = useOnlineStatus();

  const syncMessages = useCallback(async (force: boolean = false): Promise<{ success: boolean; syncedCount?: number; error?: string }> => {
    if (!isOnline && !force) {
      setSyncError('No internet connection');
      return { success: false, error: 'No internet connection' };
    }

    if (isSyncing) {
      return { success: false, error: 'Already syncing' }; // Already syncing
    }

    try {
      setIsSyncing(true);
      setSyncError(null);
      
      const result = await SyncService.syncPendingMessages(userId);
      setLastSyncTime(new Date());
      return result;
    } catch (error) {
      console.error('Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setSyncError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSyncing(false);
    }
  }, [userId, isOnline, isSyncing]);

  const enableAutoSync = useCallback(async (): Promise<void> => {
    try {
      await SyncService.enableAutoSync(userId);
    } catch (error) {
      console.error('Failed to enable auto sync:', error);
    }
  }, [userId]);

  // Load persisted last sync time on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await StorageService.getLastSync();
        if (stored) setLastSyncTime(stored);
      } catch (e) {
        // swallow
      }
    })();
  }, []);

  // Listen for external lastSync updates
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('lastSyncUpdated', (iso?: string) => {
      if (iso) {
        const d = new Date(iso);
        setLastSyncTime(d);
      }
    });
    return () => { try { sub.remove(); } catch (e) { /* noop */ } };
  }, []);

  // Coarse 10-minute tick interval.
  useEffect(() => {
    const id = setInterval(() => setCoarseTick(t => t + 1), 600_000); // 10 minutes
    return () => clearInterval(id);
  }, []);

  // Bump tick when last sync changes (immediate UI update) and when syncing finishes.
  useEffect(() => { if (lastSyncTime) setCoarseTick(t => t + 1); }, [lastSyncTime]);
  useEffect(() => { if (!isSyncing && lastSyncTime) setCoarseTick(t => t + 1); }, [isSyncing, lastSyncTime]);

  const disableAutoSync = useCallback(async (): Promise<void> => {
    try {
      await SyncService.disableAutoSync(userId);
    } catch (error) {
      console.error('Failed to disable auto sync:', error);
    }
  }, [userId]);

  // Auto sync when coming online
  useEffect(() => {
    if (isOnline && !isSyncing) {
      // Small delay to ensure connection is stable
      const timer = setTimeout(() => {
        syncMessages().catch(() => {
          // Silently handle auto-sync errors
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, isSyncing, syncMessages]);

  const getSyncStatus = useCallback(() => {
    if (!isOnline) return 'offline';
    if (isSyncing) return 'syncing';
    if (syncError) return 'error';
    return 'idle';
  }, [isOnline, isSyncing, syncError]);

  const retryFailedMessages = useCallback(async (): Promise<void> => {
    try {
      setIsSyncing(true);
      setSyncError(null);
      
      await SyncService.retryFailedMessages(userId);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Retry failed messages error:', error);
      setSyncError(error instanceof Error ? error.message : 'Retry failed');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);

  return {
    isSyncing,
    lastSyncTime,
  coarseTick,
    syncError,
    syncStatus: getSyncStatus(),
    canSync: isOnline,
    actions: {
      syncMessages,
      enableAutoSync,
      disableAutoSync,
      retryFailedMessages,
    },
  };
};
