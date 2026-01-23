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
      {/* Avatar */}
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

      {/* Message content */}
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

        {/* No source warning */}
        {hasNoSource && !isUser && (
          <div className="flex items-center gap-2 text-xs text-warning">
            <AlertCircle className="h-3 w-3" />
            <span>No approved internal source found</span>
          </div>
        )}

        {/* Sources */}
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

        {/* Request knowledge button */}
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