import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Search, RefreshCw, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Document {
  id: string;
  title: string;
  filename: string;
  department: string;
  sensitivity: string;
  status: string;
  processing_status: string;
  created_at: string;
  category_name: string | null;
}

export default function KnowledgeBase() {
  const { user, session } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [reprocessingIds, setReprocessingIds] = useState<Set<string>>(new Set());
  const [reprocessingAll, setReprocessingAll] = useState(false);

  const fetchDocuments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('documents')
      .select('*, categories(name)')
      .eq('user_id', user.id)
      .eq('is_deprecated', false)
      .order('created_at', { ascending: false });

    setDocuments(
      (data || []).map((d: any) => ({
        ...d,
        category_name: d.categories?.name || 'Uncategorized',
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const reprocessDocument = async (docId: string) => {
    if (!session?.access_token) {
      toast.error('Please log in to reprocess documents');
      return;
    }

    setReprocessingIds((prev) => new Set([...prev, docId]));

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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reprocess');
      }

      toast.success(`Document reprocessed: ${result.contentLength} chars extracted`);
      await fetchDocuments();
    } catch (error) {
      console.error('Reprocess error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reprocess document');
    } finally {
      setReprocessingIds((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    }
  };

  const reprocessAllDocuments = async () => {
    if (!session?.access_token) {
      toast.error('Please log in to reprocess documents');
      return;
    }

    setReprocessingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const doc of documents) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ documentId: doc.id }),
          }
        );

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setReprocessingAll(false);
    toast.success(`Reprocessed ${successCount} documents${failCount > 0 ? `, ${failCount} failed` : ''}`);
    await fetchDocuments();
  };

  const filtered = documents.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.filename.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string, processingStatus?: string) => {
    if (processingStatus === 'processing') {
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Processing...</Badge>;
    }
    if (processingStatus === 'failed') {
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Failed</Badge>;
    }
    const styles: Record<string, string> = {
      Ready: 'bg-green-500/10 text-green-600 border-green-500/20',
      Indexing: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      Uploaded: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      Failed: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return <Badge className={styles[status] || ''}>{status}</Badge>;
  };

  const getSensitivityBadge = (sensitivity: string) => {
    const styles: Record<string, string> = {
      Public: 'bg-green-500/10 text-green-600 border-green-500/20',
      Internal: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      Restricted: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    };
    return (
      <Badge variant="outline" className={styles[sensitivity] || ''}>
        {sensitivity}
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
            <p className="text-muted-foreground">Manage your uploaded documents</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={reprocessAllDocuments}
              disabled={reprocessingAll || documents.length === 0}
              className="gap-2"
            >
              <RotateCcw className={`h-4 w-4 ${reprocessingAll ? 'animate-spin' : ''}`} />
              {reprocessingAll ? 'Reprocessing...' : 'Reprocess All'}
            </Button>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Sensitivity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No documents found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>{doc.category_name}</TableCell>
                      <TableCell>{doc.department}</TableCell>
                      <TableCell>{getSensitivityBadge(doc.sensitivity)}</TableCell>
                      <TableCell>{getStatusBadge(doc.status, doc.processing_status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(doc.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => reprocessDocument(doc.id)}
                          disabled={reprocessingIds.has(doc.id)}
                          title="Reprocess document to re-extract text"
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${reprocessingIds.has(doc.id) ? 'animate-spin' : ''}`}
                          />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}