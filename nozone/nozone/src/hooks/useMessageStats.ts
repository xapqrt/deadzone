import { useEffect, useState, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { StorageService } from '../services/storage';
import { Message } from '../types';
import { SupabaseService, supabase } from '../services/supabase';
import { OfflineQueueService } from '../services/offlineQueueService';

export interface MessageCounters {
  pending: number;
  sent: number; // outbound sent/delivered/read
  failed: number;
  delivered: number;
  read: number;
  inbound: number; // messages not from current user
  total: number;
}

const computeLocal = (messages: Message[], userId: string): MessageCounters => {
  let pending=0, sent=0, failed=0, delivered=0, read=0, inbound=0;
  for (const m of messages) {
    const mine = m.senderId === userId;
    switch (m.status) {
      case 'pending': pending += mine ? 1 : 0; break;
      case 'failed': failed += mine ? 1 : 0; break;
      case 'sent': if (mine) sent++; break;
      case 'delivered': if (mine) { sent++; delivered++; } break;
      case 'read': if (mine) { sent++; delivered++; read++; } break;
    }
    if (!mine) inbound++;
  }
  return { pending, sent, failed, delivered, read, inbound, total: messages.length };
};

export const useMessageStats = (userId: string) => {
  const [stats, setStats] = useState<MessageCounters>({ pending:0, sent:0, failed:0, delivered:0, read:0, inbound:0, total:0 });
  const mounted = useRef(true);
  const lastRemote = useRef<number>(0);
  const lastRemoteSnapshot = useRef<{pending:number;sent:number;failed:number}>({pending:0,sent:0,failed:0});
  const optimistic = useRef<{pending:number;sent:number;failed:number}>({pending:0,sent:0,failed:0});

  const recompute = async () => {
    // Local component scheduling/queued messages
    const localMessages = await StorageService.getMessages(userId);
    const localStats = computeLocal(localMessages, userId);
    // Remote direct messages
    const remoteStats = await SupabaseService.getDirectMessageStats(userId);
    // Reconciliation: if remote counters moved, clear optimistic overlays to prevent double counting
    if (
      remoteStats.pending !== lastRemoteSnapshot.current.pending ||
      remoteStats.sent !== lastRemoteSnapshot.current.sent ||
      remoteStats.failed !== lastRemoteSnapshot.current.failed
    ) {
      optimistic.current = { pending:0, sent:0, failed:0 };
      lastRemoteSnapshot.current = { pending: remoteStats.pending, sent: remoteStats.sent, failed: remoteStats.failed };
    }
    // Merge: pending/sent/failed/delivered/read are sum of local outbound + remote outbound; inbound from remote only (local inbound synthetic ignored)
    // Offline queue stats (only count items still retryable / not failed)
    const queueStats = OfflineQueueService.getStats();
    const merged: MessageCounters = {
      pending: localStats.pending + remoteStats.pending + queueStats.pending + optimistic.current.pending,
      sent: localStats.sent + remoteStats.sent + optimistic.current.sent,
      failed: localStats.failed + remoteStats.failed + optimistic.current.failed,
      delivered: localStats.delivered + remoteStats.delivered,
      read: localStats.read + remoteStats.read,
      inbound: remoteStats.inbound, // trust server
      total: localStats.total + remoteStats.total,
    };
    if (mounted.current) setStats(merged);
  };

  useEffect(() => {
    mounted.current = true;
    recompute();
  const sub1 = DeviceEventEmitter.addListener('messagesChanged', recompute);
  const sub2 = DeviceEventEmitter.addListener('offlineQueueChanged', recompute);
  const sub3 = DeviceEventEmitter.addListener('forceStatsRefresh', recompute);
  const sub4 = DeviceEventEmitter.addListener('directMessageSent', () => { optimistic.current.sent++; recompute(); });
  const sub5 = DeviceEventEmitter.addListener('directMessagePending', () => { optimistic.current.pending++; recompute(); });
  const sub6 = DeviceEventEmitter.addListener('directMessageFailed', () => { optimistic.current.failed++; recompute(); });
    // Lightweight polling as fallback (in case realtime not configured)
    const poll = setInterval(() => recompute(), 15000);
    // Subscribe to realtime inserts/updates of direct_messages for this user
    const channel = supabase.channel(`dm-stats-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages', filter: `sender_id=eq.${userId}` }, () => {
        lastRemote.current = Date.now();
        recompute();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${userId}` }, () => {
        lastRemote.current = Date.now();
        recompute();
      })
      .subscribe();
    return () => {
      mounted.current = false;
  sub1.remove();
  sub2.remove();
  sub3.remove();
  sub4.remove();
  sub5.remove();
  sub6.remove();
      clearInterval(poll);
      channel.unsubscribe();
    };
  }, [userId]);

  return stats;
};

export default useMessageStats;