import { useState, useEffect } from 'react';
import { Contact } from '../components/ContactSelectorEnhanced';
import { useLocalMessages } from './useLocalMessages';
import { SupabaseService } from '../services/supabase';
import { User } from '../types';

export const useContactsEnhanced = (userId: string) => {
  const { messages } = useLocalMessages(userId);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [messages]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load registered users from database (simulated for now)
      await loadRegisteredUsers();
      
      // Process message history to create contacts
      const messageContacts = processMessageHistory();
      
      // Combine and deduplicate
      const combinedContacts = combineContactsAndUsers(messageContacts);
      setContacts(combinedContacts);
      
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRegisteredUsers = async () => {
    try {
      // Get real users from Supabase database
      const users = await SupabaseService.getActiveUsers(userId); // Exclude self
      setRegisteredUsers(users);
    } catch (error) {
      console.error('Failed to load registered users:', error);
      // Fallback to empty array if database fails
      setRegisteredUsers([]);
    }
  };

  const processMessageHistory = (): Contact[] => {
    if (!messages.length) {
      return [];
    }

    // Group messages by recipient name to create contacts
    const contactMap = new Map<string, Contact>();

    messages.forEach(message => {
      if (message.recipientName) {
        const existing = contactMap.get(message.recipientName);
        if (existing) {
          existing.messageCount += 1;
          if (!existing.lastMessageTime || message.createdAt > existing.lastMessageTime) {
            existing.lastMessageTime = message.createdAt;
          }
        } else {
          contactMap.set(message.recipientName, {
            name: message.recipientName,
            lastMessageTime: message.createdAt,
            messageCount: 1,
            isRegisteredUser: false,
          });
        }
      }
    });

    return Array.from(contactMap.values());
  };

  const combineContactsAndUsers = (messageContacts: Contact[]): Contact[] => {
    const combined: Contact[] = [];
    
    // Add all registered users first (these are real users from database)
    registeredUsers.forEach(user => {
      const messageContact = messageContacts.find(mc => 
        mc.name.toLowerCase() === user.name.toLowerCase() ||
        (user.username && mc.name.toLowerCase() === user.username?.toLowerCase())
      );
      
      combined.push({
        name: user.username || user.name, // Prefer username for display
        phone: user.phone,
        messageCount: messageContact?.messageCount || 0,
        lastMessageTime: messageContact?.lastMessageTime,
        isRegisteredUser: true,
        isOnline: user.isOnline,
        userId: user.id,
      });
    });

    // Add message contacts that aren't registered users
    messageContacts.forEach(contact => {
      const isAlreadyAdded = combined.some(c => 
        c.name.toLowerCase() === contact.name.toLowerCase() ||
        (c.userId && registeredUsers.some(u => u.name.toLowerCase() === contact.name.toLowerCase()))
      );
      
      if (!isAlreadyAdded) {
        combined.push({
          ...contact,
          isRegisteredUser: false,
        });
      }
    });

    // Sort by: online registered users first, then offline registered users, then by last message time
    return combined.sort((a, b) => {
      // Online registered users first
      if (a.isRegisteredUser && a.isOnline && (!b.isRegisteredUser || !b.isOnline)) return -1;
      if (b.isRegisteredUser && b.isOnline && (!a.isRegisteredUser || !a.isOnline)) return 1;
      
      // Then registered users (offline)
      if (a.isRegisteredUser && !b.isRegisteredUser) return -1;
      if (!a.isRegisteredUser && b.isRegisteredUser) return 1;
      
      // Then by last message time (most recent first)
      if (a.lastMessageTime && b.lastMessageTime) {
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      }
      if (a.lastMessageTime && !b.lastMessageTime) return -1;
      if (!a.lastMessageTime && b.lastMessageTime) return 1;
      
      // Finally alphabetically
      return a.name.localeCompare(b.name);
    });
  };  const addNewContact = (name: string): Contact => {
    const newContact: Contact = {
      name: name.trim(),
      messageCount: 0,
      isRegisteredUser: false,
    };

    // Check if it's actually a registered user we missed
    const matchingUser = registeredUsers.find(user => 
      user.name.toLowerCase() === name.toLowerCase()
    );
    
    if (matchingUser) {
      newContact.phone = matchingUser.phone;
      newContact.isRegisteredUser = true;
    }

    setContacts(prevContacts => {
      // Check if contact already exists
      const existingIndex = prevContacts.findIndex(c => 
        c.name.toLowerCase() === name.toLowerCase()
      );
      
      if (existingIndex >= 0) {
        return prevContacts; // Already exists
      }
      
      return [...prevContacts, newContact].sort((a, b) => {
        // Same sorting logic as above
        if (a.isRegisteredUser && !b.isRegisteredUser) return -1;
        if (!a.isRegisteredUser && b.isRegisteredUser) return 1;
        
        if (a.lastMessageTime && b.lastMessageTime) {
          return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
        }
        if (a.lastMessageTime && !b.lastMessageTime) return -1;
        if (!a.lastMessageTime && b.lastMessageTime) return 1;
        
        return a.name.localeCompare(b.name);
      });
    });

    return newContact;
  };

  const refreshContacts = () => {
    loadData();
  };

  return {
    contacts,
    registeredUsers,
    loading,
    addNewContact,
    refreshContacts,
  };
};
