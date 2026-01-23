import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DocumentStatusBadge, ExpiryWarning } from './DocumentStatus';
import { FileText, Clock, User, History, CheckCircle, Link } from 'lucide-react';
import { format } from 'date-fns';

interface DocumentVersion {
  id: string;
  version_number: number;
  created_at: string;
  uploaded_by: string;
  notes: string | null;
}

interface DocumentDetails {
  id: string;
  title: string;
  filename: string;
  file_type: string | null;
  file_size: number | null;
  department: string | null;
  knowledge_type: string | null;
  document_status: 'draft' | 'in_review' | 'approved' | 'deprecated';
  visibility: string | null;
  sensitivity: string | null;
  category_id: string | null;
  region: string | null;
  team: string | null;
  questions_answered: string | null;
  notes: string | null;
  source_link: string | null;
  expires_at: string | null;
  last_reviewed_at: string | null;
  last_reviewed_by: string | null;
  ai_enabled: boolean;
  current_version: number | null;
  created_at: string;
  updated_at: string;
  versions?: DocumentVersion[];
}

interface DocumentDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentDetails | null;
  onStatusChange: (status: 'draft' | 'in_review' | 'approved' | 'deprecated') => void;
  onSave: (data: Partial<DocumentDetails>) => void;
}

const editSchema = z.object({
  title: z.string().min(1),
  department: z.string().optional(),
  questions_answered: z.string().optional(),
  notes: z.string().optional(),
  ai_enabled: z.boolean(),
});

export function DocumentDetailsModal({
  open,
  onOpenChange,
  document,
  onStatusChange,
  onSave,
}: DocumentDetailsModalProps) {
  const [activeTab, setActiveTab] = useState('details');

  const form = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: document?.title || '',
      department: document?.department || '',
      questions_answered: document?.questions_answered || '',
      notes: document?.notes || '',
      ai_enabled: document?.ai_enabled ?? true,
    },
  });

  if (!document) return null;

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = (data: z.infer<typeof editSchema>) => {
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{document.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {document.filename}
                {document.source_link && (
                  <a 
                    href={document.source_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-accent hover:underline flex items-center gap-1"
                  >
                    <Link className="h-3 w-3" />
                    External Link
                  </a>
                )}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <DocumentStatusBadge status={document.document_status} />
              {document.expires_at && (
                <ExpiryWarning expiresAt={new Date(document.expires_at)} />
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <ScrollArea className="max-h-[400px] mt-4">
            <TabsContent value="details" className="space-y-4">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Type</span>
                  <p className="text-sm font-medium">{document.knowledge_type || 'Not set'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Department</span>
                  <p className="text-sm font-medium">{document.department || 'Not set'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Visibility</span>
                  <p className="text-sm font-medium">{document.visibility || 'Company-wide'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Sensitivity</span>
                  <Badge 
                    variant="outline" 
                    className={
                      document.sensitivity === 'Restricted' 
                        ? 'sensitivity-restricted' 
                        : document.sensitivity === 'Internal'
                        ? 'sensitivity-internal'
                        : 'sensitivity-public'
                    }
                  >
                    {document.sensitivity || 'Internal'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">File Size</span>
                  <p className="text-sm font-medium">{formatFileSize(document.file_size)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Version</span>
                  <p className="text-sm font-medium">v{document.current_version || 1}</p>
                </div>
              </div>

              <Separator />

              {/* AI Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">AI Access</span>
                  <Badge variant={document.ai_enabled ? 'default' : 'outline'}>
                    {document.ai_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                {document.questions_answered && (
                  <div className="rounded-lg bg-muted p-3">
                    <span className="text-xs text-muted-foreground">Questions this answers:</span>
                    <p className="text-sm mt-1">{document.questions_answered}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Audit Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Created {format(new Date(document.created_at), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Updated {format(new Date(document.updated_at), 'MMM d, yyyy')}
                </div>
                {document.last_reviewed_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4" />
                    Last reviewed {format(new Date(document.last_reviewed_at), 'MMM d, yyyy')}
                  </div>
                )}
              </div>

              {document.notes && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Internal Notes</span>
                    <p className="text-sm text-muted-foreground">{document.notes}</p>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="edit">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="questions_answered"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Questions this answers</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full">
                    Save Changes
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {document.versions && document.versions.length > 0 ? (
                <div className="space-y-3">
                  {document.versions.map((version) => (
                    <div 
                      key={version.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <History className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Version {version.version_number}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(version.created_at), 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                        {version.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {version.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No version history available
                </p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="flex-row gap-2">
          {document.document_status === 'draft' && (
            <Button 
              variant="outline" 
              onClick={() => onStatusChange('in_review')}
            >
              Submit for Review
            </Button>
          )}
          {document.document_status === 'in_review' && (
            <Button 
              onClick={() => onStatusChange('approved')}
              className="bg-success hover:bg-success/90"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}