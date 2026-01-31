# AI Chat Complete Code

This file contains all the code for the AI Chat feature. Copy each section into the corresponding file path.

---

## 1. Edge Function: `supabase/functions/ai-chat/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const AI_MODEL = "openai/gpt-5";
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface DocumentSource {
  id: string;
  title: string;
  department: string | null;
  knowledge_type: string | null;
  relevance: number;
  excerpt: string;
  section?: string;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

function calculateRelevance(query: string, document: string, title: string): { score: number; excerpt: string; section: string } {
  const queryTokens = tokenize(query);
  const docTokens = tokenize(document);
  const titleTokens = tokenize(title);
  
  if (queryTokens.length === 0 || docTokens.length === 0) {
    return { score: 0, excerpt: '', section: '' };
  }

  const docTF: Record<string, number> = {};
  for (const token of docTokens) {
    docTF[token] = (docTF[token] || 0) + 1;
  }

  let score = 0;
  let matchedTerms: string[] = [];
  
  for (const queryToken of queryTokens) {
    if (docTF[queryToken]) {
      score += Math.log(1 + docTF[queryToken]) * 2;
      matchedTerms.push(queryToken);
    }
    
    for (const docToken of Object.keys(docTF)) {
      if (docToken.includes(queryToken) || queryToken.includes(docToken)) {
        if (docToken !== queryToken) {
          score += Math.log(1 + docTF[docToken]) * 0.5;
          matchedTerms.push(docToken);
        }
      }
    }
    
    if (titleTokens.includes(queryToken)) {
      score += 5;
    }
  }

  score = score / Math.sqrt(queryTokens.length);

  let bestExcerpt = '';
  let bestSection = '';
  
  if (matchedTerms.length > 0) {
    const docLower = document.toLowerCase();
    let bestPos = -1;
    let maxMatches = 0;

    for (let i = 0; i < docLower.length; i += 100) {
      const window = docLower.slice(i, i + 500);
      let matches = 0;
      for (const term of matchedTerms) {
        if (window.includes(term)) matches++;
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestPos = i;
      }
    }

    if (bestPos >= 0) {
      const start = Math.max(0, bestPos - 50);
      const end = Math.min(document.length, bestPos + 450);
      bestExcerpt = document.slice(start, end).trim();
      
      const beforeText = document.slice(Math.max(0, bestPos - 200), bestPos);
      const sectionMatch = beforeText.match(/(?:^|\n)([A-Z][^:\n]{3,50}):?\s*$/);
      if (sectionMatch) {
        bestSection = sectionMatch[1].trim();
      }
    }
  }

  if (!bestExcerpt && document.length > 0) {
    bestExcerpt = document.slice(0, 400).trim();
  }

  return { score, excerpt: bestExcerpt, section: bestSection };
}

function semanticSearch(query: string, documents: any[]): DocumentSource[] {
  const results: DocumentSource[] = [];

  for (const doc of documents) {
    const searchableText = `${doc.title || ''} ${doc.content_text || ''} ${doc.questions_answered || ''} ${doc.notes || ''}`;
    const { score, excerpt, section } = calculateRelevance(query, searchableText, doc.title || '');

    if (score > 0.3) {
      results.push({
        id: doc.id,
        title: doc.title,
        department: doc.department,
        knowledge_type: doc.knowledge_type,
        relevance: score,
        excerpt,
        section,
      });
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 8);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.info(`[AI-CHAT] Model Configuration: ${AI_MODEL}`);
  console.info(`[AI-CHAT] API Endpoint: Lovable AI Gateway (${AI_GATEWAY_URL})`);

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, conversationId } = await req.json() as { 
      messages: ChatMessage[]; 
      conversationId?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userQuestion = messages[messages.length - 1]?.content || "";

    console.info(`[AI-CHAT] Processing question: "${userQuestion.slice(0, 100)}..."`);

    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, title, department, knowledge_type, content_text, questions_answered, notes, chunk_count")
      .eq("user_id", user.id)
      .eq("ai_enabled", true)
      .eq("processing_status", "completed")
      .not("content_text", "is", null);

    if (docsError) {
      console.error("[AI-CHAT] Error fetching documents:", docsError);
    }

    const totalDocs = documents?.length || 0;
    console.info(`[AI-CHAT] Found ${totalDocs} documents available for search (all treated as approved)`);

    const relevantDocs = documents && documents.length > 0 
      ? semanticSearch(userQuestion, documents)
      : [];

    console.info(`[AI-CHAT] Semantic search found ${relevantDocs.length} relevant documents`);
    if (relevantDocs.length > 0) {
      console.info(`[AI-CHAT] Top matches: ${relevantDocs.slice(0, 3).map(d => `"${d.title}" (score: ${d.relevance.toFixed(2)})`).join(', ')}`);
    }

    const { data: settings } = await supabase
      .from("company_settings")
      .select("company_name, show_sources_in_answers")
      .eq("user_id", user.id)
      .single();

    const companyName = settings?.company_name || "your organization";
    const showSources = settings?.show_sources_in_answers ?? true;

    let documentContext = "";
    
    if (relevantDocs.length > 0) {
      documentContext = "\n\n---\n\n## RETRIEVED DOCUMENT CONTENT:\n\n";
      for (const doc of relevantDocs) {
        documentContext += `### Document: "${doc.title}"\n`;
        if (doc.department) documentContext += `Department: ${doc.department}\n`;
        if (doc.section) documentContext += `Relevant Section: ${doc.section}\n`;
        documentContext += `\n${doc.excerpt}\n\n---\n\n`;
      }
    }

    const systemPrompt = `You are an expert AI assistant for ${companyName}. Your job is to provide accurate, helpful, and confident answers to employee questions using the organization's document knowledge base.

## Your Behavior:

1. **Answer confidently**: If the retrieved documents contain relevant information, synthesize it into a clear, direct answer. Do not hedge unnecessarily.

2. **Be thorough but concise**: Provide complete answers that address the user's question. Include relevant details from the documents.

3. **Cite sources naturally**: When appropriate, mention which document contains the information (e.g., "According to the Employee Handbook..." or "The Finance Policy states...").

4. **Use good judgment**: If the documents contain partial information, use it to give the best possible answer. Don't refuse just because coverage isn't 100% complete.

5. **Only decline when truly empty**: If the documents genuinely contain NOTHING relevant to the question, respond with: "I don't see anything in the uploaded documents that addresses this. Could you try rephrasing, or is there a specific document you'd like me to check?"

6. **Handle ambiguity**: If the question is unclear, ask a clarifying question rather than refusing.

## What NOT to do:

- Do NOT say "I couldn't find an approved source" - all documents are approved
- Do NOT add unnecessary disclaimers like "based on available information" when you have clear answers
- Do NOT refuse to answer if there's ANY relevant content in the documents
- Do NOT be overly cautious - answer like a knowledgeable colleague would

${documentContext || "\nNote: No documents have been uploaded yet. Let the user know they need to upload documents first."}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[AI-CHAT] LOVABLE_API_KEY is not configured");
      throw new Error("AI service not configured.");
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    console.info(`[AI-CHAT] Calling Lovable AI Gateway with model: ${AI_MODEL}`);
    const requestStartTime = Date.now();

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: aiMessages,
        max_completion_tokens: 2000,
      }),
    });

    const requestDuration = Date.now() - requestStartTime;
    console.info(`[AI-CHAT] Lovable AI Gateway response received in ${requestDuration}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI-CHAT] Lovable AI Gateway error: ${response.status} - ${errorText}`);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "AI service authentication error." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices?.[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
    
    const usage = aiResponse.usage;
    if (usage) {
      console.info(`[AI-CHAT] Token usage - Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`);
    }
    console.info(`[AI-CHAT] Model used: ${aiResponse.model}`);

    const sourcesForResponse = showSources && relevantDocs.length > 0
      ? relevantDocs.map(d => ({
          id: d.id,
          title: d.title,
          department: d.department,
          type: d.knowledge_type,
          section: d.section || undefined,
        }))
      : [];

    if (conversationId) {
      await supabase.from("chat_messages").insert([
        {
          conversation_id: conversationId,
          role: "user",
          content: userQuestion,
        },
        {
          conversation_id: conversationId,
          role: "assistant",
          content: assistantMessage,
          sources: sourcesForResponse.length > 0 ? sourcesForResponse : null,
        },
      ]);
    }

    console.info(`[AI-CHAT] Response generated successfully with ${sourcesForResponse.length} sources`);

    return new Response(
      JSON.stringify({
        content: assistantMessage,
        sources: sourcesForResponse,
        hasNoSource: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[AI-CHAT] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 2. Chat Page: `src/pages/admin/AIChat.tsx`

```typescript
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
      content: "Hello! I'm your AI Knowledge Assistant. I can help you find information from your organization's knowledge base. Ask me anything about your documents!",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [notices, setNotices] = useState<PriorityNoticeData[]>([]);
  const [acknowledgedNotices, setAcknowledgedNotices] = useState<Set<string>>(new Set());
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestQuestion, setRequestQuestion] = useState('');
  const [requestDepartment, setRequestDepartment] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

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

      if (data.hasNoSource) {
        setRequestQuestion(content);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get response');
      
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
    window.open(`/admin/knowledge?doc=${sourceId}`, '_blank');
  };

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-col">
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

        <Card className="flex flex-1 flex-col overflow-hidden">
          <ScrollArea ref={scrollRef} className="flex-1 p-4">
            <div className="mx-auto max-w-3xl space-y-6">
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

          <div className="border-t p-4">
            <div className="mx-auto max-w-3xl">
              <ChatInput
                onSend={handleSend}
                isLoading={isLoading}
                placeholder="Ask a question about your organization's knowledge..."
              />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                AI answers are based on your organization's uploaded documents
              </p>
            </div>
          </div>
        </Card>

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
```

---

## 3. Component: `src/components/chat/ChatMessage.tsx`

```typescript
import { Bot, User, FileText, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Source {
  id: string;
  title: string;
  department?: string | null;
  type?: string | null;
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  hasNoSource?: boolean;
  onRequestKnowledge?: () => void;
  onViewSource?: (sourceId: string) => void;
}

export function ChatMessage({ 
  role, 
  content, 
  sources, 
  hasNoSource,
  onRequestKnowledge,
  onViewSource,
}: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn(
      "flex gap-3 animate-fade-in",
      isUser && "flex-row-reverse"
    )}>
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        isUser ? "bg-primary text-primary-foreground" : "bg-accent/10"
      )}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4 text-accent" />
        )}
      </div>

      <div className={cn(
        "flex max-w-[75%] flex-col gap-2",
        isUser && "items-end"
      )}>
        <div className={cn(
          "rounded-2xl px-4 py-3",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted"
        )}>
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>

        {hasNoSource && !isUser && (
          <div className="flex items-center gap-2 text-xs text-warning">
            <AlertCircle className="h-3 w-3" />
            <span>No approved internal source found</span>
          </div>
        )}

        {sources && sources.length > 0 && !isUser && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Sources:</span>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => onViewSource?.(source.id)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent hover:bg-accent/20 transition-colors"
                >
                  <FileText className="h-3 w-3" />
                  <span className="max-w-[150px] truncate">{source.title}</span>
                  {source.department && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {source.department}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasNoSource && onRequestKnowledge && !isUser && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRequestKnowledge}
            className="mt-1 text-xs"
          >
            Request Knowledge
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

## 4. Component: `src/components/chat/ChatInput.tsx`

```typescript
import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, isLoading, placeholder }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const message = input.trim();
    if (!message || isLoading) return;
    onSend(message);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={placeholder || "Ask a question about your knowledge base..."}
        className="min-h-[44px] max-h-[200px] resize-none"
        rows={1}
        disabled={isLoading}
      />
      <Button 
        onClick={handleSend} 
        disabled={isLoading || !input.trim()}
        size="icon"
        className="h-11 w-11 shrink-0 bg-accent hover:bg-accent/90"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
```

---

## 5. Component: `src/components/chat/PriorityNotice.tsx`

```typescript
import { AlertTriangle, Info, AlertCircle, Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PriorityNoticeProps {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requiresAcknowledgment: boolean;
  acknowledged?: boolean;
  onAcknowledge?: (id: string) => void;
}

const priorityConfig = {
  low: {
    icon: Info,
    bg: 'bg-muted',
    border: 'border-muted-foreground/20',
    text: 'text-muted-foreground',
  },
  normal: {
    icon: Bell,
    bg: 'bg-accent/10',
    border: 'border-accent/20',
    text: 'text-accent',
  },
  high: {
    icon: AlertCircle,
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    text: 'text-warning',
  },
  urgent: {
    icon: AlertTriangle,
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
    text: 'text-destructive',
  },
};

export function PriorityNotice({
  id,
  title,
  content,
  priority,
  requiresAcknowledgment,
  acknowledged,
  onAcknowledge,
}: PriorityNoticeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <div className={cn(
      "rounded-lg border p-4 animate-slide-up",
      config.bg,
      config.border
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          config.bg
        )}>
          <Icon className={cn("h-4 w-4", config.text)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-foreground">{title}</h4>
            {priority === 'urgent' && (
              <span className="shrink-0 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-medium text-destructive-foreground">
                URGENT
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{content}</p>
          
          {requiresAcknowledgment && (
            <div className="mt-3">
              {acknowledged ? (
                <div className="flex items-center gap-1.5 text-sm text-success">
                  <Check className="h-4 w-4" />
                  <span>Acknowledged</span>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAcknowledge?.(id)}
                  className="text-xs"
                >
                  Acknowledge
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Required Dependencies

Make sure these are in your `package.json`:
- `@supabase/supabase-js`
- `lucide-react`
- `sonner`
- `react-router-dom`

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

## Supabase Secrets (Edge Function)

Required secrets in Supabase:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LOVABLE_API_KEY`
