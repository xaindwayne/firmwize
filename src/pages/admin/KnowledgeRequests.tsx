import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  HelpCircle, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Link as LinkIcon,
  FileText,
  MessageSquare,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface KnowledgeRequest {
  id: string;
  user_id: string;
  question: string;
  department: string | null;
  status: 'new' | 'in_review' | 'resolved';
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_type: 'linked_document' | 'new_document' | 'written_answer' | null;
  resolution_document_id: string | null;
  resolution_answer: string | null;
  created_at: string;
  updated_at: string;
}

const statusConfig = {
  new: { label: 'New', icon: AlertCircle, className: 'bg-warning/10 text-warning border-warning/20' },
  in_review: { label: 'In Review', icon: Clock, className: 'bg-accent/10 text-accent border-accent/20' },
  resolved: { label: 'Resolved', icon: CheckCircle, className: 'bg-success/10 text-success border-success/20' },
};

export default function KnowledgeRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<KnowledgeRequest | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolutionType, setResolutionType] = useState<string>('written_answer');
  const [resolutionAnswer, setResolutionAnswer] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');

  // Fetch knowledge requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['knowledge-requests', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('knowledge_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as KnowledgeRequest[];
    },
  });

  // Fetch approved documents for linking
  const { data: documents = [] } = useQuery({
    queryKey: ['approved-documents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, title')
        .eq('user_id', user!.id)
        .eq('document_status', 'approved')
        .order('title');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: async ({
      requestId,
      resolutionType,
      documentId,
      answer,
    }: {
      requestId: string;
      resolutionType: string;
      documentId?: string;
      answer?: string;
    }) => {
      const { error } = await supabase
        .from('knowledge_requests')
        .update({
          status: 'resolved',
          resolved_by: user!.id,
          resolved_at: new Date().toISOString(),
          resolution_type: resolutionType,
          resolution_document_id: documentId || null,
          resolution_answer: answer || null,
        })
        .eq('id', requestId);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: user!.id,
        action: 'Resolve Request',
        details: `Resolved knowledge request with ${resolutionType}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-requests'] });
      toast.success('Request resolved successfully');
      setResolveDialogOpen(false);
      setSelectedRequest(null);
      setResolutionAnswer('');
      setSelectedDocumentId('');
    },
    onError: () => {
      toast.error('Failed to resolve request');
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('knowledge_requests')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-requests'] });
      toast.success('Status updated');
    },
  });

  const stats = {
    total: requests.length,
    new: requests.filter((r) => r.status === 'new').length,
    inReview: requests.filter((r) => r.status === 'in_review').length,
    resolved: requests.filter((r) => r.status === 'resolved').length,
  };

  const handleResolve = () => {
    if (!selectedRequest) return;

    resolveMutation.mutate({
      requestId: selectedRequest.id,
      resolutionType,
      documentId: resolutionType === 'linked_document' ? selectedDocumentId : undefined,
      answer: resolutionType === 'written_answer' ? resolutionAnswer : undefined,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Knowledge Requests</h1>
          <p className="text-muted-foreground">
            Review and resolve employee requests for missing knowledge
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">New</CardTitle>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.new}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Review</CardTitle>
              <Clock className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{stats.inReview}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.resolved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Requests</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Requests Table */}
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No knowledge requests yet
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => {
                    const config = statusConfig[request.status];
                    const Icon = config.icon;

                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <p className="font-medium max-w-md truncate">{request.question}</p>
                        </TableCell>
                        <TableCell>{request.department || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={config.className}>
                            <Icon className="mr-1 h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(request.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {request.status === 'new' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatusMutation.mutate({ 
                                  id: request.id, 
                                  status: 'in_review' 
                                })}
                              >
                                Review
                              </Button>
                            )}
                            {request.status !== 'resolved' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setResolveDialogOpen(true);
                                }}
                              >
                                Resolve
                              </Button>
                            )}
                            {request.status === 'resolved' && request.resolution_type && (
                              <Badge variant="outline">
                                {request.resolution_type === 'linked_document' && <LinkIcon className="mr-1 h-3 w-3" />}
                                {request.resolution_type === 'new_document' && <FileText className="mr-1 h-3 w-3" />}
                                {request.resolution_type === 'written_answer' && <MessageSquare className="mr-1 h-3 w-3" />}
                                {request.resolution_type.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Resolve Dialog */}
        <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Resolve Knowledge Request</DialogTitle>
              <DialogDescription>
                Choose how to resolve this request
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm font-medium">Question:</p>
                  <p className="mt-1 text-sm">{selectedRequest.question}</p>
                  {selectedRequest.department && (
                    <Badge variant="outline" className="mt-2">
                      {selectedRequest.department}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Resolution Type</Label>
                  <Select value={resolutionType} onValueChange={setResolutionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linked_document">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-4 w-4" />
                          Link Existing Document
                        </div>
                      </SelectItem>
                      <SelectItem value="new_document">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Upload New Document
                        </div>
                      </SelectItem>
                      <SelectItem value="written_answer">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Write Answer
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {resolutionType === 'linked_document' && (
                  <div className="space-y-2">
                    <Label>Select Document</Label>
                    <Select value={selectedDocumentId} onValueChange={setSelectedDocumentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a document" />
                      </SelectTrigger>
                      <SelectContent>
                        {documents.map((doc) => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {resolutionType === 'new_document' && (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      You'll be redirected to upload a new document after resolving
                    </p>
                  </div>
                )}

                {resolutionType === 'written_answer' && (
                  <div className="space-y-2">
                    <Label>Answer</Label>
                    <Textarea
                      value={resolutionAnswer}
                      onChange={(e) => setResolutionAnswer(e.target.value)}
                      placeholder="Write the answer that will be added to the knowledge base..."
                      className="min-h-[120px]"
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleResolve}
                disabled={
                  (resolutionType === 'linked_document' && !selectedDocumentId) ||
                  (resolutionType === 'written_answer' && !resolutionAnswer.trim())
                }
                className="bg-success hover:bg-success/90"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Resolve Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}