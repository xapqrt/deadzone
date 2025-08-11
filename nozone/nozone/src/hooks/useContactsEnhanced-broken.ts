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
      // In a real implementation, you would call something like:
      // const users = await SupabaseService.getAllUsers();
      
      // For now, we'll simulate registered users
      const sampleUsers: User[] = [
        {
          id: 'user-1',
          name: 'Alice Johnson',
          phone: '+1234567890',
          isVerified: true,
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 'user-2',
          name: 'Bob Smith',
          phone: '+1234567891',
          isVerified: true,
          createdAt: new Date('2024-02-10'),
        },
        {
          id: 'user-3',
          name: 'Carol Davis',
          phone: '+1234567892',
          isVerified: true,
          createdAt: new Date('2024-03-05'),
        },
        {
          id: 'user-4',
          name: 'David Wilson',
          phone: '+1234567893',
          isVerified: true,
          createdAt: new Date('2024-03-20'),
        },
        {
          id: 'user-5',
          name: 'Emma Brown',
          phone: '+1234567894',
          isVerified: true,
          createdAt: new Date('2024-04-01'),
        },
        {
          id: 'user-6',
          name: 'Frank Miller',
          phone: '+1234567895',
          isVerified: true,
          createdAt: new Date('2024-04-15'),
        },
        {
          id: 'user-7',
          name: 'Grace Wilson',
          phone: '+1234567896',
          isVerified: true,
          createdAt: new Date('2024-05-01'),
        },
      ];
      
      // Filter out current user
      const filteredUsers = sampleUsers.filter(user => user.id !== userId);
      setRegisteredUsers(filteredUsers);
      
    } catch (error) {
      console.error('Failed to load registered users:', error);
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

    // Add registered users as contacts
    registeredUsers.forEach(user => {
      // Check if this user already has message history
      const existingContact = messageContacts.find(c => 
        c.name.toLowerCase() === user.name.toLowerCase()
      );

      combined.push({
        name: user.name,
        phone: user.phone,
        isRegisteredUser: true,
        messageCount: existingContact?.messageCount || 0,
        lastMessageTime: existingContact?.lastMessageTime,
      });
    });

    // Add message-only contacts that aren't registered users
    messageContacts.forEach(contact => {
      const isAlreadyAdded = combined.some(c => 
        c.name.toLowerCase() === contact.name.toLowerCase()
      );
      
      if (!isAlreadyAdded) {
        combined.push({
          ...contact,
          isRegisteredUser: false,
        });
      }
    });

    // Sort by: registered users first, then by last message time, then alphabetically
    return combined.sort((a, b) => {
      // Registered users first
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
  };

  const addNewContact = (name: string): Contact => {
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
