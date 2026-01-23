import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  FileText, 
  FolderOpen, 
  Clock, 
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  Bell,
  ArrowRight,
  MessageSquare,
  Upload,
  BarChart3,
} from 'lucide-react';

interface DashboardStats {
  totalFiles: number;
  approvedFiles: number;
  pendingReview: number;
  totalCategories: number;
  knowledgeRequests: number;
  activeNotices: number;
  unansweredQuestions: number;
}

interface RecentDocument {
  id: string;
  title: string;
  category_name: string | null;
  created_at: string;
  document_status: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { hasAdminAccess, isPlatformAdmin } = useUserRole();
  const [stats, setStats] = useState<DashboardStats>({
    totalFiles: 0,
    approvedFiles: 0,
    pendingReview: 0,
    totalCategories: 0,
    knowledgeRequests: 0,
    activeNotices: 0,
    unansweredQuestions: 0,
  });
  const [recentDocs, setRecentDocs] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [
        docsRes,
        catsRes,
        requestsRes,
        noticesRes,
        unansweredRes,
      ] = await Promise.all([
        supabase
          .from('documents')
          .select('id, title, created_at, document_status, categories(name)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('categories').select('id').eq('user_id', user.id),
        supabase.from('knowledge_requests').select('id, status'),
        supabase.from('priority_notices').select('id').eq('active', true),
        supabase.from('unanswered_questions').select('id').eq('addressed', false),
      ]);

      const docs = docsRes.data || [];
      const cats = catsRes.data || [];
      const requests = requestsRes.data || [];
      const notices = noticesRes.data || [];
      const unanswered = unansweredRes.data || [];

      // Get total count
      const { count: totalCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: approvedCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('document_status', 'approved');

      const { count: pendingCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('document_status', 'in_review');

      setStats({
        totalFiles: totalCount || 0,
        approvedFiles: approvedCount || 0,
        pendingReview: pendingCount || 0,
        totalCategories: cats.length,
        knowledgeRequests: requests.filter((r) => r.status !== 'resolved').length,
        activeNotices: notices.length,
        unansweredQuestions: unanswered.length,
      });

      setRecentDocs(
        docs.map((d: any) => ({
          id: d.id,
          title: d.title,
          category_name: d.categories?.name || 'Uncategorized',
          created_at: d.created_at,
          document_status: d.document_status || 'draft',
        }))
      );

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const coveragePercent = stats.totalFiles > 0 
    ? Math.round((stats.approvedFiles / stats.totalFiles) * 100) 
    : 0;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'bg-success/10 text-success border-success/20',
      in_review: 'bg-warning/10 text-warning border-warning/20',
      draft: 'bg-muted text-muted-foreground',
      deprecated: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return (
      <Badge variant="outline" className={styles[status] || ''}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome to your AI Knowledge Vault
            </p>
          </div>
          <Link to="/admin/upload">
            <Button className="bg-accent hover:bg-accent/90">
              <Upload className="mr-2 h-4 w-4" />
              Upload Knowledge
            </Button>
          </Link>
        </div>

        {/* Main Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Documents
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.totalFiles}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.approvedFiles} approved for AI
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                AI Coverage
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {loading ? '...' : `${coveragePercent}%`}
              </div>
              <Progress value={coveragePercent} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Review
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {loading ? '...' : stats.pendingReview}
              </div>
              <p className="text-xs text-muted-foreground">
                Documents awaiting approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Knowledge Gaps
              </CardTitle>
              <HelpCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {loading ? '...' : stats.unansweredQuestions}
              </div>
              <p className="text-xs text-muted-foreground">
                Unanswered questions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/admin/requests">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                  <HelpCircle className="h-6 w-6 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Knowledge Requests</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.knowledgeRequests} pending
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/notices">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <Bell className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Priority Notices</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.activeNotices} active
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/coverage">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <BarChart3 className="h-6 w-6 text-success" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Coverage Analytics</p>
                  <p className="text-sm text-muted-foreground">
                    View insights
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Uploads</CardTitle>
              <CardDescription>
                Latest documents added to the knowledge base
              </CardDescription>
            </div>
            <Link to="/admin/knowledge">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : recentDocs.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">
                  No documents uploaded yet
                </p>
                <Link to="/admin/upload">
                  <Button className="mt-4 bg-accent hover:bg-accent/90">
                    Upload Your First Document
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">{doc.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.category_name} •{' '}
                          {format(new Date(doc.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(doc.document_status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Chat Promo */}
        <Card className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent">
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI Knowledge Assistant</h3>
                <p className="text-sm text-muted-foreground">
                  Ask questions and get instant answers from your approved knowledge base
                </p>
              </div>
            </div>
            <Link to="/admin/chat">
              <Button className="bg-accent hover:bg-accent/90">
                Open Chat
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}