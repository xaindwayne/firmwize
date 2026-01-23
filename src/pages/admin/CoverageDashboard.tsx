import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  HelpCircle,
  FileText,
  FolderOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  PieChart,
} from 'lucide-react';

interface DepartmentCoverage {
  department: string;
  documentCount: number;
  approvedCount: number;
  coveragePercent: number;
}

interface CategoryCoverage {
  category: string;
  documentCount: number;
  approvedCount: number;
}

export default function CoverageDashboard() {
  const { user } = useAuth();

  // Fetch documents grouped by department
  const { data: departmentData = [] } = useQuery({
    queryKey: ['department-coverage', user?.id],
    queryFn: async () => {
      const { data: docs, error } = await supabase
        .from('documents')
        .select('department, document_status')
        .eq('user_id', user!.id);

      if (error) throw error;

      const deptMap = new Map<string, { total: number; approved: number }>();
      const departments = ['HR', 'Finance', 'Operations', 'Sales', 'Compliance', 'Legal', 'Other'];
      
      departments.forEach((dept) => deptMap.set(dept, { total: 0, approved: 0 }));
      
      docs?.forEach((doc) => {
        const dept = doc.department || 'Other';
        const current = deptMap.get(dept) || { total: 0, approved: 0 };
        current.total++;
        if (doc.document_status === 'approved') current.approved++;
        deptMap.set(dept, current);
      });

      return departments.map((dept) => {
        const data = deptMap.get(dept) || { total: 0, approved: 0 };
        return {
          department: dept,
          documentCount: data.total,
          approvedCount: data.approved,
          coveragePercent: data.total > 0 ? Math.round((data.approved / data.total) * 100) : 0,
        };
      }) as DepartmentCoverage[];
    },
    enabled: !!user,
  });

  // Fetch documents grouped by category
  const { data: categoryData = [] } = useQuery({
    queryKey: ['category-coverage', user?.id],
    queryFn: async () => {
      const { data: docs, error } = await supabase
        .from('documents')
        .select('categories(name), document_status')
        .eq('user_id', user!.id);

      if (error) throw error;

      const catMap = new Map<string, { total: number; approved: number }>();
      
      docs?.forEach((doc: any) => {
        const cat = doc.categories?.name || 'Uncategorized';
        const current = catMap.get(cat) || { total: 0, approved: 0 };
        current.total++;
        if (doc.document_status === 'approved') current.approved++;
        catMap.set(cat, current);
      });

      return Array.from(catMap.entries()).map(([category, data]) => ({
        category,
        documentCount: data.total,
        approvedCount: data.approved,
      })) as CategoryCoverage[];
    },
    enabled: !!user,
  });

  // Fetch unanswered questions
  const { data: unansweredQuestions = [] } = useQuery({
    queryKey: ['unanswered-questions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unanswered_questions')
        .select('*')
        .eq('addressed', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch recent uploads
  const { data: recentUploads = [] } = useQuery({
    queryKey: ['recent-uploads-dashboard', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, document_status, created_at, department')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Stats
  const totalDocs = departmentData.reduce((sum, d) => sum + d.documentCount, 0);
  const approvedDocs = departmentData.reduce((sum, d) => sum + d.approvedCount, 0);
  const overallCoverage = totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0;
  const gapsCount = unansweredQuestions.length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Coverage & Gaps</h1>
          <p className="text-muted-foreground">
            Monitor knowledge coverage and identify areas that need attention
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDocs}</div>
              <p className="text-xs text-muted-foreground">
                {approvedDocs} approved for AI
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overall Coverage</CardTitle>
              <PieChart className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{overallCoverage}%</div>
              <Progress value={overallCoverage} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Knowledge Gaps</CardTitle>
              <HelpCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{gapsCount}</div>
              <p className="text-xs text-muted-foreground">
                Unanswered questions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categoryData.length}</div>
              <p className="text-xs text-muted-foreground">
                Active categories
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Department Coverage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Coverage by Department
              </CardTitle>
              <CardDescription>
                AI-ready document coverage across departments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departmentData.map((dept) => (
                  <div key={dept.department} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{dept.department}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {dept.approvedCount} / {dept.documentCount}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            dept.coveragePercent >= 80
                              ? 'bg-success/10 text-success'
                              : dept.coveragePercent >= 50
                              ? 'bg-warning/10 text-warning'
                              : 'bg-destructive/10 text-destructive'
                          }
                        >
                          {dept.coveragePercent}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={dept.coveragePercent} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Unanswered Questions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Knowledge Gaps
                  </CardTitle>
                  <CardDescription>
                    Questions the AI couldn't answer
                  </CardDescription>
                </div>
                <Link to="/admin/requests">
                  <Button variant="outline" size="sm">
                    View All
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {unansweredQuestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="mx-auto h-8 w-8 text-success mb-2" />
                  <p>No knowledge gaps detected!</p>
                  <p className="text-sm">All questions have been addressed</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unansweredQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <HelpCircle className="h-4 w-4 mt-0.5 text-warning shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{q.question}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {q.department && (
                            <Badge variant="outline" className="text-xs">
                              {q.department}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(q.created_at), 'MMM d')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Category Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryData.map((cat) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                  >
                    <span className="text-sm font-medium">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {cat.documentCount} docs
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          cat.approvedCount === cat.documentCount
                            ? 'bg-success/10 text-success'
                            : 'bg-muted'
                        }
                      >
                        {cat.approvedCount} approved
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Recent Uploads
                  </CardTitle>
                  <CardDescription>
                    Latest documents added to the knowledge base
                  </CardDescription>
                </div>
                <Link to="/admin/upload">
                  <Button variant="outline" size="sm">
                    Upload
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentUploads.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No documents uploaded yet
                </p>
              ) : (
                <div className="space-y-3">
                  {recentUploads.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.department} • {format(new Date(doc.created_at), 'MMM d')}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          doc.document_status === 'approved'
                            ? 'bg-success/10 text-success'
                            : doc.document_status === 'in_review'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-muted'
                        }
                      >
                        {doc.document_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}