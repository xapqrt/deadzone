export interface Message {
  id: string;
  senderId: string;
  recipientName: string;
  text: string;
  messageType?: 'text' | 'image' | 'file' | 'voice';
  deliverAfter: Date;
  scheduledFor?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  status: 'pending' | 'scheduled' | 'sent' | 'delivered' | 'read' | 'failed';
  retryCount?: number;
  maxRetries?: number;
  priority?: number; // 1=highest, 5=lowest
  metadata?: any;
  createdAt: Date;
  updatedAt?: Date;
}

// New Direct Message types for username-based messaging
export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string | null; // null if recipient doesn't exist yet
  messageText: string;
  messageType: 'text' | 'image' | 'file' | 'voice';
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  deliverAfter: Date;
  deliveredAt?: Date;
  readAt?: Date;
  retryCount: number;
  maxRetries: number;
  isQueuedLocally: boolean;
  syncStatus: 'local' | 'syncing' | 'synced' | 'failed';
  metadata?: any;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Conversation {
  id: string;
  participantOneId: string;
  participantTwoId: string;
  lastMessageId?: string;
  lastMessageAt: Date;
  participantOneLastRead: Date;
  participantTwoLastRead: Date;
  isParticipantOneVisible: boolean;
  isParticipantTwoVisible: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface InboxConversation {
  conversationId: string;
  otherUserId: string;
  otherUsername: string;
  otherName: string;
  lastMessageText: string;
  lastMessageAt: Date;
  lastMessageSenderId: string;
  unreadCount: number;
  isVisible: boolean;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  phone?: string;
  email?: string;
  isVerified?: boolean;
  avatarUrl?: string;
  lastActive?: Date;
  isOnline?: boolean;
  preferences?: any;
  createdAt: Date;
  updatedAt?: Date;
}

export interface OTPVerification {
  id: string;
  phone: string;
  hashedOTP: string;
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
}

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  deviceInfo: any;
  ipAddress?: string;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface MessageDelivery {
  id: string;
  messageId: string;
  attemptNumber: number;
  status: 'attempting' | 'success' | 'failed' | 'timeout';
  errorMessage?: string;
  deliveryMethod: string;
  attemptedAt: Date;
  completedAt?: Date;
}

export interface MessageStats {
  totalMessages: number;
  pendingMessages: number;
  sentMessages: number;
  failedMessages: number;
  scheduledMessages: number;
}

export interface AppSettings {
  autoSync: boolean;
  darkMode: boolean;
  notificationsEnabled: boolean;
  retryFailedMessages: boolean;
  maxRetryAttempts: number;
}

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}
