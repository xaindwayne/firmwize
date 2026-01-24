import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ChatConversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageData {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    id: string;
    title: string;
    department?: string | null;
    type?: string | null;
  }> | null;
  created_at: string;
}

export function useChatHistory() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return;
    }

    setConversations(data || []);
  }, [user]);

  // Load conversation messages
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!user) return;
    
    setLoading(true);
    
    // Get conversation
    const { data: conv, error: convError } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conv) {
      console.error('Error loading conversation:', convError);
      setLoading(false);
      return;
    }

    // Get messages
    const { data: msgs, error: msgsError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgsError) {
      console.error('Error loading messages:', msgsError);
      setLoading(false);
      return;
    }

    setCurrentConversation(conv);
    setMessages((msgs || []).map((m: any) => ({
      ...m,
      sources: m.sources as ChatMessageData['sources'],
    })));
    setLoading(false);
  }, [user]);

  // Create new conversation
  const createConversation = useCallback(async (firstMessage?: string): Promise<string | null> => {
    if (!user) return null;
    
    const title = firstMessage 
      ? firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '')
      : 'New conversation';

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: user.id,
        title,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }

    setCurrentConversation(data);
    setMessages([]);
    await fetchConversations();
    
    return data.id;
  }, [user, fetchConversations]);

  // Add message to current conversation
  const addMessage = useCallback(async (
    role: 'user' | 'assistant',
    content: string,
    sources?: ChatMessageData['sources']
  ) => {
    if (!currentConversation) return;

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: currentConversation.id,
        role,
        content,
        sources: sources || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding message:', error);
      return;
    }

    // Update conversation timestamp
    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentConversation.id);

    // Update title if this is the first user message
    if (role === 'user' && messages.length === 0) {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      await supabase
        .from('chat_conversations')
        .update({ title })
        .eq('id', currentConversation.id);
    }

    setMessages(prev => [...prev, {
      id: data.id,
      conversation_id: data.conversation_id,
      role: role,
      content: data.content,
      sources: sources || null,
      created_at: data.created_at,
    }]);
  }, [currentConversation, messages.length]);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
      return;
    }

    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
      setMessages([]);
    }
    
    await fetchConversations();
  }, [currentConversation, fetchConversations]);

  // Clear current conversation
  const clearCurrentConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
  }, []);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    fetchConversations,
    loadConversation,
    createConversation,
    addMessage,
    deleteConversation,
    clearCurrentConversation,
    setMessages,
  };
}
