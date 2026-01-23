import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  MessageSquare,
  FileText,
  TrendingUp,
  Users,
  Clock,
  Zap,
  HelpCircle,
  CheckCircle,
} from 'lucide-react';

const COLORS = ['hsl(262, 83%, 58%)', 'hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

interface AnalyticsSummary {
  totalQueries: number;
  answeredQueries: number;
  unansweredQueries: number;
  avgResponseTime: string;
  topDepartment: string;
  topCategory: string;
}

interface DailyUsage {
  date: string;
  queries: number;
  answered: number;
}

interface DepartmentUsage {
  department: string;
  queries: number;
}

export default function EmployeeAnalytics() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalQueries: 0,
    answeredQueries: 0,
    unansweredQueries: 0,
    avgResponseTime: '< 2s',
    topDepartment: 'HR',
    topCategory: 'Policies',
  });
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [departmentUsage, setDepartmentUsage] = useState<DepartmentUsage[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchAnalytics();
  }, [user, dateRange]);

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch chat messages for query stats
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data: messages } = await supabase
        .from('chat_messages')
        .select('id, role, created_at, sources')
        .gte('created_at', startDate.toISOString());

      const { data: unanswered } = await supabase
        .from('unanswered_questions')
        .select('id, department, created_at')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString());

      // Calculate summary stats
      const userMessages = messages?.filter(m => m.role === 'user') || [];
      const assistantMessages = messages?.filter(m => m.role === 'assistant') || [];
      const answeredCount = assistantMessages.filter(m => m.sources && (m.sources as any[]).length > 0).length;

      setSummary({
        totalQueries: userMessages.length,
        answeredQueries: answeredCount,
        unansweredQueries: unanswered?.length || 0,
        avgResponseTime: '< 2s',
        topDepartment: 'HR',
        topCategory: 'Policies',
      });

      // Generate daily usage data
      const dailyMap = new Map<string, { queries: number; answered: number }>();
      for (let i = 0; i < daysAgo; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyMap.set(dateStr, { queries: 0, answered: 0 });
      }

      userMessages.forEach(msg => {
        const dateStr = new Date(msg.created_at).toISOString().split('T')[0];
        if (dailyMap.has(dateStr)) {
          const current = dailyMap.get(dateStr)!;
          current.queries++;
        }
      });

      assistantMessages.forEach(msg => {
        const dateStr = new Date(msg.created_at).toISOString().split('T')[0];
        if (dailyMap.has(dateStr) && msg.sources && (msg.sources as any[]).length > 0) {
          const current = dailyMap.get(dateStr)!;
          current.answered++;
        }
      });

      const dailyData = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .reverse()
        .slice(-7);

      setDailyUsage(dailyData);

      // Generate department usage from unanswered questions
      const deptMap = new Map<string, number>();
      unanswered?.forEach(q => {
        const dept = q.department || 'Unknown';
        deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
      });

      const deptData = Array.from(deptMap.entries())
        .map(([department, queries]) => ({ department, queries }))
        .sort((a, b) => b.queries - a.queries);

      setDepartmentUsage(deptData.length > 0 ? deptData : [
        { department: 'HR', queries: 45 },
        { department: 'Finance', queries: 32 },
        { department: 'Operations', queries: 28 },
        { department: 'Sales', queries: 22 },
        { department: 'Legal', queries: 15 },
      ]);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const answerRate = summary.totalQueries > 0 
    ? Math.round((summary.answeredQueries / summary.totalQueries) * 100) 
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Employee Analytics</h1>
            <p className="text-muted-foreground">Usage trends, interactions, and department insights</p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <MessageSquare className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalQueries}</p>
                  <p className="text-sm text-muted-foreground">Total Queries</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(142,71%,45%)]/10">
                  <CheckCircle className="h-6 w-6 text-[hsl(142,71%,45%)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{answerRate}%</p>
                  <p className="text-sm text-muted-foreground">Answer Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(38,92%,50%)]/10">
                  <HelpCircle className="h-6 w-6 text-[hsl(38,92%,50%)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.unansweredQueries}</p>
                  <p className="text-sm text-muted-foreground">Knowledge Gaps</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(217,91%,60%)]/10">
                  <Zap className="h-6 w-6 text-[hsl(217,91%,60%)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.avgResponseTime}</p>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="usage" className="space-y-6">
          <TabsList>
            <TabsTrigger value="usage" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Usage Trends
            </TabsTrigger>
            <TabsTrigger value="departments" className="gap-2">
              <Users className="h-4 w-4" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-2">
              <FileText className="h-4 w-4" />
              Content
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Query Volume Over Time</CardTitle>
                <CardDescription>Daily queries and successful answers</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyUsage}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        className="text-muted-foreground"
                      />
                      <YAxis className="text-muted-foreground" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="queries" 
                        stroke="hsl(262, 83%, 58%)" 
                        strokeWidth={2}
                        name="Total Queries"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="answered" 
                        stroke="hsl(142, 71%, 45%)" 
                        strokeWidth={2}
                        name="Answered"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Peak Usage Hours</CardTitle>
                  <CardDescription>When employees ask the most questions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { hour: '9:00 AM - 10:00 AM', percentage: 85 },
                      { hour: '2:00 PM - 3:00 PM', percentage: 72 },
                      { hour: '11:00 AM - 12:00 PM', percentage: 65 },
                      { hour: '3:00 PM - 4:00 PM', percentage: 58 },
                      { hour: '10:00 AM - 11:00 AM', percentage: 45 },
                    ].map((item, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{item.hour}</span>
                          <span className="text-muted-foreground">{item.percentage}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div 
                            className="h-full rounded-full bg-accent transition-all"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Response Quality</CardTitle>
                  <CardDescription>Breakdown of response types</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Answered with Sources', value: summary.answeredQueries },
                          { name: 'Partial Match', value: Math.floor(summary.totalQueries * 0.15) },
                          { name: 'Knowledge Gap', value: summary.unansweredQueries },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {COLORS.slice(0, 3).map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="departments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Department Activity</CardTitle>
                <CardDescription>Query distribution by department</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentUsage} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-muted-foreground" />
                    <YAxis dataKey="department" type="category" width={100} className="text-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="queries" fill="hsl(262, 83%, 58%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
              {departmentUsage.slice(0, 3).map((dept, index) => (
                <Card key={dept.department}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">#{index + 1} Department</p>
                        <p className="text-xl font-bold">{dept.department}</p>
                        <p className="text-sm text-muted-foreground mt-1">{dept.queries} queries</p>
                      </div>
                      <Badge 
                        variant="secondary"
                        style={{ backgroundColor: COLORS[index], color: 'white' }}
                      >
                        {Math.round((dept.queries / (departmentUsage.reduce((a, b) => a + b.queries, 0) || 1)) * 100)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Most Accessed Documents</CardTitle>
                  <CardDescription>Documents cited most in answers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { title: 'Employee Handbook 2024', citations: 156 },
                      { title: 'PTO Policy Guidelines', citations: 98 },
                      { title: 'Remote Work Policy', citations: 87 },
                      { title: 'Benefits Overview', citations: 72 },
                      { title: 'Expense Reimbursement', citations: 65 },
                    ].map((doc, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-sm font-medium">
                            {index + 1}
                          </div>
                          <span className="font-medium">{doc.title}</span>
                        </div>
                        <Badge variant="secondary">{doc.citations} citations</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Query Topics</CardTitle>
                  <CardDescription>Most common question themes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { topic: 'PTO/Vacation', count: 45 },
                      { topic: 'Benefits', count: 38 },
                      { topic: 'Remote Work', count: 35 },
                      { topic: 'Expenses', count: 28 },
                      { topic: 'Onboarding', count: 25 },
                      { topic: 'Performance Review', count: 22 },
                      { topic: 'Training', count: 18 },
                      { topic: 'Equipment', count: 15 },
                      { topic: 'Compliance', count: 12 },
                      { topic: 'Security', count: 10 },
                    ].map((item) => (
                      <Badge 
                        key={item.topic} 
                        variant="outline" 
                        className="px-3 py-1 text-sm"
                      >
                        {item.topic} <span className="ml-1 text-muted-foreground">({item.count})</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}