import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { KPICard } from '@/components/analytics/KPICard';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import { ChartType } from '@/components/analytics/ChartTypeSelector';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  MessageSquare,
  CheckCircle,
  HelpCircle,
  FileQuestion,
  ClipboardList,
  Bell,
  TrendingUp,
  Users,
} from 'lucide-react';

export default function EmployeeAnalytics() {
  const [dateRange, setDateRange] = useState('30d');
  const [department, setDepartment] = useState('all');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();

  // Chart type states for each widget
  const [usageChartType, setUsageChartType] = useState<ChartType>('line');
  const [departmentChartType, setDepartmentChartType] = useState<ChartType>('bar');
  const [gapsChartType, setGapsChartType] = useState<ChartType>('line');
  const [topGapsChartType, setTopGapsChartType] = useState<ChartType>('table');
  const [requestsChartType, setRequestsChartType] = useState<ChartType>('bar');
  const [requestStatusChartType, setRequestStatusChartType] = useState<ChartType>('donut');
  const [questionnaireChartType, setQuestionnaireChartType] = useState<ChartType>('bar');
  const [noticesChartType, setNoticesChartType] = useState<ChartType>('line');
  const [ackRateChartType, setAckRateChartType] = useState<ChartType>('progress');

  const {
    loading,
    metrics,
    timeSeriesData,
    departmentData,
    topQuestions,
    requestStatusData,
    questionnaireStats,
    noticeStats,
    departments,
    refresh,
  } = useAnalyticsData(dateRange, department, customDateRange);

  // Format date for charts
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formattedTimeData = timeSeriesData.map(d => ({
    ...d,
    date: formatDate(d.date),
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee Knowledge Analytics</h1>
          <p className="text-muted-foreground">
            Unified insights from chat interactions, knowledge gaps, requests, questionnaires, and notices
          </p>
        </div>

        {/* Global Filters */}
        <AnalyticsFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          department={department}
          onDepartmentChange={setDepartment}
          departments={departments}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
          onRefresh={refresh}
          loading={loading}
        />

        {/* Overview KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total Interactions"
            value={metrics.totalInteractions}
            icon={<MessageSquare className="h-6 w-6" />}
            trend={{ value: metrics.interactionsTrend, isPositive: metrics.interactionsTrend > 0 }}
            iconBgClass="bg-accent/10"
            iconColorClass="text-accent"
          />
          <KPICard
            title="Answer Rate"
            value={`${metrics.answerRate}%`}
            icon={<CheckCircle className="h-6 w-6" />}
            trend={{ value: 5, isPositive: true }}
            iconBgClass="bg-[hsl(var(--success))]/10"
            iconColorClass="text-[hsl(var(--success))]"
          />
          <KPICard
            title="Knowledge Gaps"
            value={metrics.totalKnowledgeGaps}
            icon={<HelpCircle className="h-6 w-6" />}
            trend={{ value: metrics.gapsTrend, isPositive: metrics.gapsTrend < 0 }}
            iconBgClass="bg-[hsl(var(--warning))]/10"
            iconColorClass="text-[hsl(var(--warning))]"
          />
          <KPICard
            title="Pending Requests"
            value={metrics.pendingRequests}
            icon={<FileQuestion className="h-6 w-6" />}
            trend={{ value: metrics.requestsTrend, isPositive: metrics.requestsTrend < 0 }}
            iconBgClass="bg-[hsl(217,91%,60%)]/10"
            iconColorClass="text-[hsl(217,91%,60%)]"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Knowledge Requests"
            value={metrics.totalKnowledgeRequests}
            icon={<FileQuestion className="h-6 w-6" />}
            iconBgClass="bg-[hsl(280,70%,55%)]/10"
            iconColorClass="text-[hsl(280,70%,55%)]"
          />
          <KPICard
            title="Questionnaire Responses"
            value={metrics.questionnaireResponses}
            icon={<ClipboardList className="h-6 w-6" />}
            trend={{ value: metrics.responsesTrend, isPositive: metrics.responsesTrend > 0 }}
            iconBgClass="bg-[hsl(180,70%,45%)]/10"
            iconColorClass="text-[hsl(180,70%,45%)]"
          />
          <KPICard
            title="Priority Notices Sent"
            value={metrics.totalNotices}
            icon={<Bell className="h-6 w-6" />}
            iconBgClass="bg-destructive/10"
            iconColorClass="text-destructive"
          />
          <KPICard
            title="Notice Acknowledgment Rate"
            value={`${metrics.acknowledgmentRate}%`}
            icon={<TrendingUp className="h-6 w-6" />}
            iconBgClass="bg-[hsl(var(--success))]/10"
            iconColorClass="text-[hsl(var(--success))]"
          />
        </div>

        {/* Usage Charts Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Usage & Interactions
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <AnalyticsChart
              title="Interactions Over Time"
              description="Daily chat interactions, answered vs unanswered"
              data={formattedTimeData}
              chartType={usageChartType}
              onChartTypeChange={setUsageChartType}
              availableTypes={['line', 'bar', 'stacked']}
              xKey="date"
              yKeys={[
                { key: 'interactions', label: 'Total Interactions', color: 'hsl(262, 83%, 58%)' },
                { key: 'answered', label: 'Answered', color: 'hsl(142, 71%, 45%)' },
                { key: 'unanswered', label: 'Unanswered', color: 'hsl(38, 92%, 50%)' },
              ]}
              loading={loading}
            />
            <AnalyticsChart
              title="Activity by Department"
              description="Interactions and gaps by department"
              data={departmentData}
              chartType={departmentChartType}
              onChartTypeChange={setDepartmentChartType}
              availableTypes={['bar', 'stacked', 'progress', 'table']}
              xKey="department"
              yKeys={[
                { key: 'interactions', label: 'Interactions', color: 'hsl(262, 83%, 58%)' },
                { key: 'gaps', label: 'Gaps', color: 'hsl(38, 92%, 50%)' },
                { key: 'requests', label: 'Requests', color: 'hsl(217, 91%, 60%)' },
              ]}
              loading={loading}
            />
          </div>
        </div>

        {/* Knowledge Gaps Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[hsl(var(--warning))]" />
            Knowledge Gaps
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <AnalyticsChart
              title="Unanswered Questions Trend"
              description="Knowledge gaps over time"
              data={formattedTimeData}
              chartType={gapsChartType}
              onChartTypeChange={setGapsChartType}
              availableTypes={['line', 'bar']}
              xKey="date"
              yKeys={[
                { key: 'gaps', label: 'Knowledge Gaps', color: 'hsl(38, 92%, 50%)' },
              ]}
              loading={loading}
            />
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-base font-semibold">Top Unanswered Questions</CardTitle>
                  <CardDescription>Most frequent knowledge gaps</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : topQuestions.length === 0 ? (
                  <p className="text-muted-foreground">No knowledge gaps recorded</p>
                ) : (
                  <div className="max-h-[300px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Question</TableHead>
                          <TableHead className="w-[80px] text-right">Count</TableHead>
                          <TableHead className="w-[100px]">Dept</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topQuestions.slice(0, 8).map((q, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium max-w-[250px] truncate">
                              {q.question}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{q.count}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {q.department}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Knowledge Requests Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-[hsl(217,91%,60%)]" />
            Knowledge Requests
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <AnalyticsChart
              title="Request Volume Over Time"
              description="Knowledge requests submitted"
              data={formattedTimeData}
              chartType={requestsChartType}
              onChartTypeChange={setRequestsChartType}
              availableTypes={['line', 'bar']}
              xKey="date"
              yKeys={[
                { key: 'requests', label: 'Requests', color: 'hsl(217, 91%, 60%)' },
              ]}
              loading={loading}
            />
            <AnalyticsChart
              title="Requests by Status"
              description="Distribution of request statuses"
              data={requestStatusData}
              chartType={requestStatusChartType}
              onChartTypeChange={setRequestStatusChartType}
              availableTypes={['donut', 'bar', 'progress']}
              xKey="status"
              yKeys={[
                { key: 'count', label: 'Count' },
              ]}
              loading={loading}
            />
          </div>
        </div>

        {/* Questionnaires Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[hsl(180,70%,45%)]" />
            Questionnaires & Surveys
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <AnalyticsChart
              title="Questionnaire Responses"
              description="Response counts and alignment scores"
              data={questionnaireStats}
              chartType={questionnaireChartType}
              onChartTypeChange={setQuestionnaireChartType}
              availableTypes={['bar', 'table', 'progress']}
              xKey="title"
              yKeys={[
                { key: 'responses', label: 'Responses', color: 'hsl(180, 70%, 45%)' },
                { key: 'alignment', label: 'Alignment %', color: 'hsl(142, 71%, 45%)' },
              ]}
              loading={loading}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Response Summary</CardTitle>
                <CardDescription>Alignment by questionnaire</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : questionnaireStats.length === 0 ? (
                  <p className="text-muted-foreground">No questionnaire responses yet</p>
                ) : (
                  <div className="space-y-4">
                    {questionnaireStats.map((q, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium truncate max-w-[200px]">{q.title}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{q.responses} responses</Badge>
                            <span className="text-muted-foreground">{q.alignment}%</span>
                          </div>
                        </div>
                        <Progress value={q.alignment} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Priority Notices Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-destructive" />
            Priority Notices & Alerts
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <AnalyticsChart
              title="Notices Over Time"
              description="Priority notices sent"
              data={formattedTimeData}
              chartType={noticesChartType}
              onChartTypeChange={setNoticesChartType}
              availableTypes={['line', 'bar']}
              xKey="date"
              yKeys={[
                { key: 'notices', label: 'Notices Sent', color: 'hsl(0, 84%, 60%)' },
              ]}
              loading={loading}
            />
            <AnalyticsChart
              title="Acknowledgment Rates"
              description="Notice acknowledgment by title"
              data={noticeStats}
              chartType={ackRateChartType}
              onChartTypeChange={setAckRateChartType}
              availableTypes={['progress', 'bar', 'table']}
              xKey="title"
              yKeys={[
                { key: 'rate', label: 'Ack Rate %' },
              ]}
              valueFormatter={(v) => `${v}%`}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
