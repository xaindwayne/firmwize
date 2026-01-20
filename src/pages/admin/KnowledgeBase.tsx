import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Search } from 'lucide-react';
import { format } from 'date-fns';

interface Document { id: string; title: string; filename: string; department: string; sensitivity: string; status: string; created_at: string; category_name: string | null; }

export default function KnowledgeBase() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('documents').select('*, categories(name)').eq('user_id', user.id).eq('is_deprecated', false).order('created_at', { ascending: false }).then(({ data }) => {
      setDocuments((data || []).map((d: any) => ({ ...d, category_name: d.categories?.name || 'Uncategorized' })));
      setLoading(false);
    });
  }, [user]);

  const filtered = documents.filter(d => d.title.toLowerCase().includes(search.toLowerCase()) || d.filename.toLowerCase().includes(search.toLowerCase()));

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = { Ready: 'status-ready', Indexing: 'status-indexing', Uploaded: 'status-uploaded', Failed: 'status-failed' };
    return <Badge className={styles[status] || ''}>{status}</Badge>;
  };

  const getSensitivityBadge = (sensitivity: string) => {
    const styles: Record<string, string> = { Public: 'sensitivity-public', Internal: 'sensitivity-internal', Restricted: 'sensitivity-restricted' };
    return <Badge variant="outline" className={styles[sensitivity] || ''}>{sensitivity}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1><p className="text-muted-foreground">Manage your uploaded documents</p></div>
          <div className="relative w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Department</TableHead><TableHead>Sensitivity</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No documents found</TableCell></TableRow> : filtered.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>{doc.category_name}</TableCell>
                    <TableCell>{doc.department}</TableCell>
                    <TableCell>{getSensitivityBadge(doc.sensitivity)}</TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(doc.created_at), 'MMM d, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}