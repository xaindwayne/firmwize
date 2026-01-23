import { Clock, CheckCircle, AlertTriangle, FileWarning, Eye, Edit, MoreHorizontal, ArrowUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type DocumentStatus = 'draft' | 'in_review' | 'approved' | 'deprecated';

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  showAnimation?: boolean;
}

const statusConfig: Record<DocumentStatus, {
  label: string;
  icon: typeof CheckCircle;
  className: string;
}> = {
  draft: {
    label: 'Draft',
    icon: Clock,
    className: 'bg-muted text-muted-foreground border-muted-foreground/20',
  },
  in_review: {
    label: 'In Review',
    icon: Eye,
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    className: 'bg-success/10 text-success border-success/20',
  },
  deprecated: {
    label: 'Deprecated',
    icon: FileWarning,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

export function DocumentStatusBadge({ status, showAnimation }: DocumentStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.className,
        showAnimation && status === 'approved' && 'animate-scale-in'
      )}
    >
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}

interface DocumentActionsProps {
  documentId: string;
  currentStatus: DocumentStatus;
  onStatusChange: (status: DocumentStatus) => void;
  onView: () => void;
  onEdit: () => void;
  onNewVersion: () => void;
  onDelete: () => void;
}

export function DocumentActions({
  documentId,
  currentStatus,
  onStatusChange,
  onView,
  onEdit,
  onNewVersion,
  onDelete,
}: DocumentActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Metadata
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onNewVersion}>
          <ArrowUp className="mr-2 h-4 w-4" />
          Upload New Version
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => onStatusChange('in_review')}
          disabled={currentStatus === 'in_review' || currentStatus === 'deprecated'}
        >
          Submit for Review
        </DropdownMenuItem>
        
        {currentStatus === 'in_review' && (
          <DropdownMenuItem onClick={() => onStatusChange('approved')}>
            <CheckCircle className="mr-2 h-4 w-4 text-success" />
            Approve
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem 
          onClick={() => onStatusChange('deprecated')}
          disabled={currentStatus === 'deprecated'}
          className="text-warning"
        >
          <FileWarning className="mr-2 h-4 w-4" />
          Deprecate
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={onDelete}
          className="text-destructive"
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ExpiryWarningProps {
  expiresAt: Date;
}

export function ExpiryWarning({ expiresAt }: ExpiryWarningProps) {
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry > 30) return null;
  
  const isExpired = daysUntilExpiry <= 0;
  const isUrgent = daysUntilExpiry <= 7;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "animate-pulse",
        isExpired 
          ? "bg-destructive/10 text-destructive border-destructive/20"
          : isUrgent
          ? "bg-warning/10 text-warning border-warning/20"
          : "bg-muted text-muted-foreground"
      )}
    >
      <AlertTriangle className="mr-1 h-3 w-3" />
      {isExpired 
        ? "Expired" 
        : `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`
      }
    </Badge>
  );
}