import { useState, useRef, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { PriorityNotice } from '@/components/chat/PriorityNotice';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bot, Plus, History, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    id: string;
    title: string;
    department?: string | null;
    type?: string | null;
  }>;
  hasNoSource?: boolean;
}

interface PriorityNoticeData {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requires_acknowledgment: boolean;
}

const DEPARTMENTS = ['HR', 'Finance', 'Operations', 'Sales', 'Compliance', 'Legal', 'Other'];

export default function AIChat() {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your AI Knowledge Assistant. I can help you find information from your organization's approved knowledge base. What would you like to know?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [notices, setNotices] = useState<PriorityNoticeData[]>([]);
  const [acknowledgedNotices, setAcknowledgedNotices] = useState<Set<string>>(new Set());
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestQuestion, setRequestQuestion] = useState('');
  const [requestDepartment, setRequestDepartment] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch priority notices on mount
  useEffect(() => {
    async function fetchNotices() {
      const { data } = await supabase
        .from('priority_notices')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        setNotices(data as PriorityNoticeData[]);
      }

      // Fetch user's acknowledgments
      if (user) {
        const { data: acks } = await supabase
          .from('notice_acknowledgments')
          .select('notice_id')
          .eq('user_id', user.id);

        if (acks) {
          setAcknowledgedNotices(new Set(acks.map((a) => a.notice_id)));
        }
      }
    }

    fetchNotices();
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!session?.access_token) {
      toast.error('Please log in to use the chat');
      return;
    }

    const userMessage: Message = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content,
        sources: data.sources,
        hasNoSource: data.hasNoSource,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If no source was found, pre-fill the request dialog
      if (data.hasNoSource) {
        setRequestQuestion(content);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get response');
      
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I apologize, but I encountered an error processing your request. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledgeNotice = async (noticeId: string) => {
    if (!user) return;

    try {
      await supabase.from('notice_acknowledgments').insert({
        notice_id: noticeId,
        user_id: user.id,
      });

      setAcknowledgedNotices((prev) => new Set([...prev, noticeId]));
      toast.success('Notice acknowledged');
    } catch (error) {
      console.error('Error acknowledging notice:', error);
      toast.error('Failed to acknowledge notice');
    }
  };

  const handleRequestKnowledge = async () => {
    if (!user || !requestQuestion.trim()) return;

    try {
      await supabase.from('knowledge_requests').insert({
        user_id: user.id,
        question: requestQuestion,
        department: requestDepartment || null,
      });

      toast.success('Knowledge request submitted');
      setShowRequestDialog(false);
      setRequestQuestion('');
      setRequestDepartment('');

      // Add confirmation message
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "✅ Your knowledge request has been submitted. An admin will review it and work on adding the relevant information to the knowledge base.",
        },
      ]);
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    }
  };

  const handleViewSource = (sourceId: string) => {
    // Navigate to document details
    window.open(`/admin/knowledge?doc=${sourceId}`, '_blank');
  };

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">AI Knowledge Assistant</h1>
            <Badge className="bg-accent/10 text-accent border-accent/20">
              Beta
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <History className="h-4 w-4" />
              History
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
        </div>

        {/* Chat container */}
        <Card className="flex flex-1 flex-col overflow-hidden">
          {/* Messages area */}
          <ScrollArea ref={scrollRef} className="flex-1 p-4">
            <div className="mx-auto max-w-3xl space-y-6">
              {/* Priority notices */}
              {notices.length > 0 && (
                <div className="space-y-3">
                  {notices.map((notice) => (
                    <PriorityNotice
                      key={notice.id}
                      id={notice.id}
                      title={notice.title}
                      content={notice.content}
                      priority={notice.priority}
                      requiresAcknowledgment={notice.requires_acknowledgment}
                      acknowledged={acknowledgedNotices.has(notice.id)}
                      onAcknowledge={handleAcknowledgeNotice}
                    />
                  ))}
                </div>
              )}

              {/* Chat messages */}
              {messages.map((msg, i) => (
                <ChatMessage
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  sources={msg.sources}
                  hasNoSource={msg.hasNoSource}
                  onRequestKnowledge={() => {
                    setRequestQuestion(msg.role === 'user' ? msg.content : '');
                    setShowRequestDialog(true);
                  }}
                  onViewSource={handleViewSource}
                />
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                    <Bot className="h-4 w-4 text-accent" />
                  </div>
                  <div className="rounded-2xl bg-muted px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="border-t p-4">
            <div className="mx-auto max-w-3xl">
              <ChatInput
                onSend={handleSend}
                isLoading={isLoading}
                placeholder="Ask a question about your organization's knowledge..."
              />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                AI answers are based only on approved internal documents
              </p>
            </div>
          </div>
        </Card>

        {/* Knowledge Request Dialog */}
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Knowledge</DialogTitle>
              <DialogDescription>
                Submit a request to have information added to the knowledge base
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>What information are you looking for?</Label>
                <Textarea
                  value={requestQuestion}
                  onChange={(e) => setRequestQuestion(e.target.value)}
                  placeholder="Describe what you need to know..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Related Department (Optional)</Label>
                <Select value={requestDepartment} onValueChange={setRequestDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRequestKnowledge}
                disabled={!requestQuestion.trim()}
                className="bg-accent hover:bg-accent/90"
              >
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}