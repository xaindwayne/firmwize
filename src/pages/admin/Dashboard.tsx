import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FileText, FolderOpen, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface DashboardStats {
  totalFiles: number;
  totalCategories: number;
  lastUpload: string | null;
  status: string;
}

interface RecentDocument {
  id: string;
  title: string;
  category_name: string | null;
  created_at: string;
  status: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalFiles: 0,
    totalCategories: 0,
    lastUpload: null,
    status: 'Ready',
  });
  const [recentDocs, setRecentDocs] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [docsRes, catsRes] = await Promise.all([
        supabase.from('documents').select('id, title, created_at, status, categories(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('categories').select('id').eq('user_id', user.id),
      ]);

      const docs = docsRes.data || [];
      const cats = catsRes.data || [];

      setStats({
        totalFiles: docs.length > 0 ? (await supabase.from('documents').select('id', { count: 'exact' }).eq('user_id', user.id)).count || 0 : 0,
        totalCategories: cats.length,
        lastUpload: docs[0]?.created_at || null,
        status: 'Ready',
      });

      setRecentDocs(docs.map((d: any) => ({
        id: d.id,
        title: d.title,
        category_name: d.categories?.name || 'Uncategorized',
        created_at: d.created_at,
        status: d.status,
      })));

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Ready: 'status-ready',
      Indexing: 'status-indexing',
      Uploaded: 'status-uploaded',
      Failed: 'status-failed',
    };
    return <Badge className={`${styles[status] || ''} font-medium`}>{status}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your knowledge management portal</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Files</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.totalFiles}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.totalCategories}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Last Upload</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.lastUpload ? format(new Date(stats.lastUpload), 'MMM d') : 'Never'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.status}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : recentDocs.length === 0 ? (
              <p className="text-muted-foreground">No documents uploaded yet. Start by uploading your first document.</p>
            ) : (
              <div className="space-y-4">
                {recentDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-foreground">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">{doc.category_name} • {format(new Date(doc.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}