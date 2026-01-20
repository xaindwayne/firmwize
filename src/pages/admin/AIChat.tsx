import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User } from 'lucide-react';

interface Message { role: 'user' | 'assistant'; content: string; sources?: string[]; }

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: 'Hello! I can help you find information from your knowledge base. What would you like to know?' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    // Simulated response - in production this would call POST /api/chat
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'This is a preview of the AI Chat feature. In production, this would query your knowledge base and provide answers with source citations.', sources: ['Company Policy v2.pdf', 'Onboarding Guide.docx'] }]);
      setLoading(false);
    }, 1500);
  };

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        <div className="mb-4 flex items-center gap-2"><h1 className="text-2xl font-bold text-foreground">AI Chat</h1><Badge variant="outline" className="bg-accent/10 text-accent">Preview</Badge></div>
        <Card className="flex flex-1 flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10"><Bot className="h-4 w-4 text-accent" /></div>}
                  <div className={`max-w-[70%] space-y-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`rounded-lg p-3 ${msg.role === 'user' ? 'bg-accent text-accent-foreground' : 'bg-muted'}`}>{msg.content}</div>
                    {msg.sources && <div className="text-xs text-muted-foreground">Sources: {msg.sources.join(', ')}</div>}
                  </div>
                  {msg.role === 'user' && <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><User className="h-4 w-4" /></div>}
                </div>
              ))}
              {loading && <div className="flex gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10"><Bot className="h-4 w-4 text-accent" /></div><div className="rounded-lg bg-muted p-3"><span className="animate-pulse">Thinking...</span></div></div>}
            </div>
          </ScrollArea>
          <div className="border-t p-4">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question about your knowledge base..." className="flex-1" />
              <Button type="submit" disabled={loading || !input.trim()} className="bg-accent hover:bg-accent/90"><Send className="h-4 w-4" /></Button>
            </form>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}