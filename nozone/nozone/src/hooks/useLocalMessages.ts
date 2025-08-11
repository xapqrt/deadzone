import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { StorageService } from '../services/storage';
import { Message } from '../types';

export const useLocalMessages = (userId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const storedMessages = await StorageService.getMessages(userId);
      setMessages(storedMessages);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addMessage = useCallback(async (message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> => {
    try {
      const newMessage: Message = {
        ...message,
        id: Date.now().toString() + Math.random().toString(36),
        createdAt: new Date(),
      };
      
      await StorageService.saveMessage(userId, newMessage);
      setMessages(prev => [newMessage, ...prev]);
      return newMessage;
    } catch (err) {
      console.error('Error adding message:', err);
      throw err;
    }
  }, [userId]);

  const updateMessage = useCallback(async (messageId: string, updates: Partial<Message>): Promise<void> => {
    try {
      const updatedMessage = { ...updates, updatedAt: new Date() };
      await StorageService.updateMessage(userId, messageId, updatedMessage);
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, ...updatedMessage }
            : msg
        )
      );
    } catch (err) {
      console.error('Error updating message:', err);
      throw err;
    }
  }, [userId]);

  const deleteMessage = useCallback(async (messageId: string): Promise<void> => {
    try {
      await StorageService.deleteMessage(userId, messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
      throw err;
    }
  }, [userId]);

  const getMessageStats = useCallback(() => {
    // Pending treats only explicit 'pending' for this message model
    const pending = messages.filter(msg => msg.status === 'pending').length;
    const sent = messages.filter(msg => msg.status === 'sent').length;
    const delivered = messages.filter(msg => msg.status === 'delivered').length;
    const read = messages.filter(msg => msg.status === 'read').length;
    const failed = messages.filter(msg => msg.status === 'failed').length;
    const outboundSentAggregate = sent + delivered + read; // all progressed beyond pending
    const inbound = messages.filter(msg => msg.senderId !== userId).length; // simplistic inbound count
    return { pending, sent: outboundSentAggregate, failed, delivered, read, inbound, total: messages.length };
  }, [messages, userId]);

  const clearAllMessages = useCallback(async (): Promise<void> => {
    try {
      await StorageService.clearMessages(userId);
      setMessages([]);
    } catch (err) {
      console.error('Error clearing messages:', err);
      throw err;
    }
  }, [userId]);

  useEffect(() => {
    loadMessages();
    // Subscribe to external message changes (e.g., sync engine)
  const unsubscribeInternal = StorageService.onMessagesChanged(() => loadMessages());
  const sub = DeviceEventEmitter.addListener('messagesChanged', () => loadMessages());
  return () => { unsubscribeInternal(); sub.remove(); };
  }, [loadMessages]);

  return {
    messages,
    loading,
    error,
    stats: getMessageStats(),
    actions: {
      loadMessages,
      addMessage,
      updateMessage,
      deleteMessage,
      clearAllMessages,
    },
  };
};
