import { useState, useEffect } from 'react';
import { Contact } from '../components/ContactSelector';
import { useLocalMessages } from './useLocalMessages';

export const useContacts = (userId: string) => {
  const { messages } = useLocalMessages(userId);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    if (!messages.length) {
      setContacts([]);
      return;
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
          });
        }
      }
    });

    // Convert to array and sort by last message time (most recent first)
    const contactList = Array.from(contactMap.values()).sort((a, b) => {
      if (!a.lastMessageTime && !b.lastMessageTime) return 0;
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
    });

    setContacts(contactList);
  }, [messages]);

  const addNewContact = (name: string): Contact => {
    const newContact: Contact = {
      name,
      messageCount: 0,
    };
    
    setContacts(prev => [newContact, ...prev]);
    return newContact;
  };

  return {
    contacts,
    addNewContact,
  };
};
