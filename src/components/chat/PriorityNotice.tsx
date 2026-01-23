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