import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Search, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  FileText, 
  Clock, 
  AlertCircle,
  Loader2,
  RefreshCw 
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  filename: string;
  department: string;
  sensitivity: string;
  document_status: string;
  processing_status: string;
  processing_error: string | null;
  content_text: string | null;
  chunk_count: number;
  created_at: string;
  processed_at: string | null;
  category_name: string | null;
  notes: string | null;
}

export default function DocumentReview() {
  const { user, session } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  const fetchDocuments = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('documents')
      .select('*, categories(name)')
      .eq('user_id', user.id)
      .eq('is_deprecated', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } else {
      setDocuments(
        (data || []).map((d: any) => ({
          ...d,
          category_name: d.categories?.name || 'Uncategorized',
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const handleApprove = async (docId: string) => {
    setActionLoading(docId);
    try {
      const { error } = await supabase
        .from('documents')
        .update({ document_status: 'approved' })
        .eq('id', docId);

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        user_id: user!.id,
        action: 'Document Approved',
        document_id: docId,
        document_title: documents.find(d => d.id === docId)?.title,
        result: 'Success',
      });

      toast.success('Document approved and now live for AI');
      fetchDocuments();
    } catch (error) {
      console.error('Error approving document:', error);
      toast.error('Failed to approve document');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (docId: string) => {
    setActionLoading(docId);
    try {
      const { error } = await supabase
        .from('documents')
        .update({ document_status: 'deprecated' })
        .eq('id', docId);

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        user_id: user!.id,
        action: 'Document Rejected',
        document_id: docId,
        document_title: documents.find(d => d.id === docId)?.title,
        result: 'Success',
      });

      toast.success('Document rejected');
      fetchDocuments();
    } catch (error) {
      console.error('Error rejecting document:', error);
      toast.error('Failed to reject document');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReprocess = async (docId: string) => {
    if (!session?.access_token) return;
    
    setActionLoading(docId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ documentId: docId }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Processing failed');
      }

      toast.success('Document reprocessing started');
      setTimeout(fetchDocuments, 2000);
    } catch (error) {
      console.error('Error reprocessing:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reprocess');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string, processingStatus: string) => {
    // If processing is completed and document is draft, show as "Ready to Go Live"
    if (processingStatus === 'completed' && (status === 'draft' || status === 'in_review')) {
      return (
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 gap-1">
          <Clock className="h-3 w-3" />
          Ready to Go Live
        </Badge>
      );
    }
    
    const styles: Record<string, { class: string; icon: React.ReactNode; label: string }> = {
      approved: { class: 'bg-success/10 text-success border-success/20', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Live' },
      in_review: { class: 'bg-warning/10 text-warning border-warning/20', icon: <Clock className="h-3 w-3" />, label: 'Pending Review' },
      draft: { class: 'bg-muted text-muted-foreground', icon: <FileText className="h-3 w-3" />, label: 'Draft' },
      deprecated: { class: 'bg-destructive/10 text-destructive border-destructive/20', icon: <XCircle className="h-3 w-3" />, label: 'Rejected' },
    };
    const style = styles[status] || styles.draft;
    return (
      <Badge variant="outline" className={`${style.class} gap-1`}>
        {style.icon}
        {style.label}
      </Badge>
    );
  };

  const getProcessingBadge = (status: string, error: string | null) => {
    if (status === 'completed') {
      return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Indexed</Badge>;
    }
    if (status === 'processing') {
      return <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />Processing
      </Badge>;
    }
    if (status === 'failed') {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1" title={error || ''}>
          <AlertCircle className="h-3 w-3" />Failed
        </Badge>
      );
    }
    return <Badge variant="outline" className="bg-muted text-muted-foreground">Pending</Badge>;
  };

  // Documents that can be made live: in_review OR draft with completed processing
  const canGoLive = (d: Document) => 
    (d.document_status === 'in_review' || d.document_status === 'draft') && 
    d.processing_status === 'completed';

  const filteredDocs = documents.filter((d) => {
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.filename.toLowerCase().includes(search.toLowerCase());
    
    if (activeTab === 'pending') {
      // Show documents that need review (in_review status OR draft with completed processing)
      return matchesSearch && (d.document_status === 'in_review' || (d.document_status === 'draft' && d.processing_status === 'completed'));
    }
    if (activeTab === 'live') {
      return matchesSearch && d.document_status === 'approved';
    }
    if (activeTab === 'failed') {
      return matchesSearch && (d.processing_status === 'failed' || d.document_status === 'deprecated');
    }
    return matchesSearch;
  });

  // Count pending as both in_review AND draft with completed processing
  const pendingCount = documents.filter(d => 
    d.document_status === 'in_review' || 
    (d.document_status === 'draft' && d.processing_status === 'completed')
  ).length;
  const liveCount = documents.filter(d => d.document_status === 'approved').length;
  const failedCount = documents.filter(d => d.processing_status === 'failed' || d.document_status === 'deprecated').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Document Review</h1>
            <p className="text-muted-foreground">
              Review, approve, and manage uploaded documents
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={fetchDocuments} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                  <p className="text-2xl font-bold">{documents.length}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Live (AI Ready)</p>
                  <p className="text-2xl font-bold text-success">{liveCount}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-success/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold text-warning">{pendingCount}</p>
                </div>
                <Clock className="h-8 w-8 text-warning/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed/Rejected</p>
                  <p className="text-2xl font-bold text-destructive">{failedCount}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-destructive/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Document Table */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="pending" className="gap-2">
                  Pending Review
                  {pendingCount > 0 && (
                    <Badge variant="secondary" className="ml-1">{pendingCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="live" className="gap-2">
                  Live Documents
                  <Badge variant="secondary" className="ml-1">{liveCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="failed" className="gap-2">
                  Failed/Rejected
                  {failedCount > 0 && (
                    <Badge variant="secondary" className="ml-1">{failedCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all">All Documents</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processing</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No documents found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{doc.category_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>{doc.department}</TableCell>
                      <TableCell>{getStatusBadge(doc.document_status, doc.processing_status)}</TableCell>
                      <TableCell>{getProcessingBadge(doc.processing_status, doc.processing_error)}</TableCell>
                      <TableCell>
                        {doc.chunk_count > 0 ? (
                          <span className="text-sm">{doc.chunk_count} chunks</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(doc.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDoc(doc);
                              setPreviewOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {/* Show Go Live button for any document with completed processing that isn't already approved */}
                          {doc.processing_status === 'completed' && doc.document_status !== 'approved' && doc.document_status !== 'deprecated' && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-success hover:bg-success/90 text-success-foreground"
                                onClick={() => handleApprove(doc.id)}
                                disabled={actionLoading === doc.id}
                              >
                                {actionLoading === doc.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Go Live
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleReject(doc.id)}
                                disabled={actionLoading === doc.id}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {doc.processing_status === 'failed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReprocess(doc.id)}
                              disabled={actionLoading === doc.id}
                            >
                              {actionLoading === doc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Retry
                                </>
                              )}
                            </Button>
                          )}
                          {doc.document_status === 'approved' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleReject(doc.id)}
                              disabled={actionLoading === doc.id}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Unpublish
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selectedDoc?.title}
              </DialogTitle>
              <DialogDescription>
                {selectedDoc?.filename} • {selectedDoc?.department} • {selectedDoc?.category_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-4">
                {selectedDoc && getStatusBadge(selectedDoc.document_status, selectedDoc.processing_status)}
                {selectedDoc && getProcessingBadge(selectedDoc.processing_status, selectedDoc.processing_error)}
                {selectedDoc?.chunk_count && selectedDoc.chunk_count > 0 && (
                  <Badge variant="outline">{selectedDoc.chunk_count} indexed chunks</Badge>
                )}
              </div>
              
              {selectedDoc?.notes && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground">{selectedDoc.notes}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Indexed Content Preview</p>
                <ScrollArea className="h-[300px] rounded-lg border p-4">
                  {selectedDoc?.content_text ? (
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {selectedDoc.content_text}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No content extracted yet. Document may still be processing.
                    </p>
                  )}
                </ScrollArea>
              </div>

              {selectedDoc?.processing_error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-sm font-medium text-destructive mb-1">Processing Error</p>
                  <p className="text-sm text-destructive/80">{selectedDoc.processing_error}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              {selectedDoc?.document_status === 'in_review' && selectedDoc?.processing_status === 'completed' && (
                <>
                  <Button
                    variant="outline"
                    className="text-destructive"
                    onClick={() => {
                      handleReject(selectedDoc.id);
                      setPreviewOpen(false);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => {
                      handleApprove(selectedDoc.id);
                      setPreviewOpen(false);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve & Go Live
                  </Button>
                </>
              )}
              {selectedDoc?.processing_status === 'failed' && (
                <Button
                  onClick={() => {
                    handleReprocess(selectedDoc.id);
                    setPreviewOpen(false);
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Processing
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
