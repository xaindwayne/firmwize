import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DateRange } from 'react-day-picker';

interface AnalyticsMetrics {
  // Overview KPIs
  totalInteractions: number;
  answeredQueries: number;
  unansweredQueries: number;
  answerRate: number;
  totalKnowledgeGaps: number;
  totalKnowledgeRequests: number;
  pendingRequests: number;
  resolvedRequests: number;
  totalQuestionnaires: number;
  questionnaireResponses: number;
  totalNotices: number;
  noticeAcknowledgments: number;
  acknowledgmentRate: number;
  
  // Trends
  interactionsTrend: number;
  gapsTrend: number;
  requestsTrend: number;
  responsesTrend: number;
}

interface TimeSeriesData {
  date: string;
  interactions: number;
  answered: number;
  unanswered: number;
  gaps: number;
  requests: number;
  notices: number;
  responses: number;
}

interface DepartmentData {
  department: string;
  interactions: number;
  gaps: number;
  requests: number;
  responses: number;
}

interface TopQuestion {
  question: string;
  count: number;
  department: string;
}

interface RequestStatusData {
  status: string;
  count: number;
}

interface QuestionnaireStats {
  title: string;
  responses: number;
  alignment: number;
}

interface NoticeStats {
  title: string;
  sent: number;
  acknowledged: number;
  rate: number;
}

export function useAnalyticsData(
  dateRange: string,
  department: string,
  customDateRange?: DateRange
) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    totalInteractions: 0,
    answeredQueries: 0,
    unansweredQueries: 0,
    answerRate: 0,
    totalKnowledgeGaps: 0,
    totalKnowledgeRequests: 0,
    pendingRequests: 0,
    resolvedRequests: 0,
    totalQuestionnaires: 0,
    questionnaireResponses: 0,
    totalNotices: 0,
    noticeAcknowledgments: 0,
    acknowledgmentRate: 0,
    interactionsTrend: 0,
    gapsTrend: 0,
    requestsTrend: 0,
    responsesTrend: 0,
  });
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentData[]>([]);
  const [topQuestions, setTopQuestions] = useState<TopQuestion[]>([]);
  const [requestStatusData, setRequestStatusData] = useState<RequestStatusData[]>([]);
  const [questionnaireStats, setQuestionnaireStats] = useState<QuestionnaireStats[]>([]);
  const [noticeStats, setNoticeStats] = useState<NoticeStats[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  const getDateRange = useCallback(() => {
    if (dateRange === 'custom' && customDateRange?.from) {
      return {
        start: customDateRange.from,
        end: customDateRange.to || new Date(),
      };
    }
    
    const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const start = new Date();
    start.setDate(start.getDate() - daysAgo);
    return { start, end: new Date() };
  }, [dateRange, customDateRange]);

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { start, end } = getDateRange();
      const startISO = start.toISOString();
      const endISO = end.toISOString();

      // Fetch all data in parallel
      const [
        messagesResult,
        unansweredResult,
        requestsResult,
        questionnairesResult,
        responsesResult,
        noticesResult,
        acknowledgmentsResult,
        settingsResult,
      ] = await Promise.all([
        supabase
          .from('chat_messages')
          .select('id, role, created_at, sources')
          .gte('created_at', startISO)
          .lte('created_at', endISO),
        supabase
          .from('unanswered_questions')
          .select('id, question, department, created_at')
          .gte('created_at', startISO)
          .lte('created_at', endISO),
        supabase
          .from('knowledge_requests')
          .select('id, question, department, status, created_at, resolved_at')
          .gte('created_at', startISO)
          .lte('created_at', endISO),
        supabase
          .from('questionnaires')
          .select('id, title, active, created_at'),
        supabase
          .from('questionnaire_responses')
          .select('id, questionnaire_id, department, created_at, responses')
          .gte('created_at', startISO)
          .lte('created_at', endISO),
        supabase
          .from('priority_notices')
          .select('id, title, target_departments, created_at, requires_acknowledgment')
          .gte('created_at', startISO)
          .lte('created_at', endISO),
        supabase
          .from('notice_acknowledgments')
          .select('id, notice_id, acknowledged_at')
          .gte('acknowledged_at', startISO)
          .lte('acknowledged_at', endISO),
        supabase
          .from('company_settings')
          .select('departments')
          .eq('user_id', user.id)
          .single(),
      ]);

      // Extract departments
      const deptList = settingsResult.data?.departments || 
        ['HR', 'Finance', 'Operations', 'Sales', 'Legal', 'Compliance', 'Other'];
      setDepartments(deptList);

      // Filter by department if specified
      const filterByDept = (items: any[], deptField: string = 'department') => {
        if (department === 'all') return items;
        return items.filter(item => item[deptField] === department);
      };

      const messages = messagesResult.data || [];
      const unanswered = filterByDept(unansweredResult.data || []);
      const requests = filterByDept(requestsResult.data || []);
      const responses = filterByDept(responsesResult.data || []);
      const notices = noticesResult.data || [];
      const acknowledgments = acknowledgmentsResult.data || [];

      // Calculate metrics
      const userMessages = messages.filter(m => m.role === 'user');
      const assistantMessages = messages.filter(m => m.role === 'assistant');
      const answeredWithSources = assistantMessages.filter(
        m => m.sources && (m.sources as any[]).length > 0
      ).length;

      const pendingReqs = requests.filter(r => r.status === 'new' || r.status === 'pending').length;
      const resolvedReqs = requests.filter(r => r.status === 'resolved').length;

      const noticesRequiringAck = notices.filter(n => n.requires_acknowledgment);
      const ackRate = noticesRequiringAck.length > 0
        ? Math.round((acknowledgments.length / noticesRequiringAck.length) * 100)
        : 100;

      // Mock trends (in real app, compare with previous period)
      const mockTrend = () => Math.round((Math.random() - 0.3) * 30);

      setMetrics({
        totalInteractions: userMessages.length,
        answeredQueries: answeredWithSources,
        unansweredQueries: userMessages.length - answeredWithSources,
        answerRate: userMessages.length > 0 
          ? Math.round((answeredWithSources / userMessages.length) * 100) 
          : 0,
        totalKnowledgeGaps: unanswered.length,
        totalKnowledgeRequests: requests.length,
        pendingRequests: pendingReqs,
        resolvedRequests: resolvedReqs,
        totalQuestionnaires: questionnairesResult.data?.length || 0,
        questionnaireResponses: responses.length,
        totalNotices: notices.length,
        noticeAcknowledgments: acknowledgments.length,
        acknowledgmentRate: ackRate,
        interactionsTrend: mockTrend(),
        gapsTrend: mockTrend(),
        requestsTrend: mockTrend(),
        responsesTrend: mockTrend(),
      });

      // Generate time series data
      const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const dailyMap = new Map<string, TimeSeriesData>();
      
      for (let i = 0; i < dayCount; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        dailyMap.set(dateStr, {
          date: dateStr,
          interactions: 0,
          answered: 0,
          unanswered: 0,
          gaps: 0,
          requests: 0,
          notices: 0,
          responses: 0,
        });
      }

      userMessages.forEach(msg => {
        const dateStr = new Date(msg.created_at).toISOString().split('T')[0];
        if (dailyMap.has(dateStr)) {
          dailyMap.get(dateStr)!.interactions++;
        }
      });

      assistantMessages.forEach(msg => {
        const dateStr = new Date(msg.created_at).toISOString().split('T')[0];
        if (dailyMap.has(dateStr)) {
          if (msg.sources && (msg.sources as any[]).length > 0) {
            dailyMap.get(dateStr)!.answered++;
          } else {
            dailyMap.get(dateStr)!.unanswered++;
          }
        }
      });

      unanswered.forEach(q => {
        const dateStr = new Date(q.created_at).toISOString().split('T')[0];
        if (dailyMap.has(dateStr)) {
          dailyMap.get(dateStr)!.gaps++;
        }
      });

      requests.forEach(r => {
        const dateStr = new Date(r.created_at).toISOString().split('T')[0];
        if (dailyMap.has(dateStr)) {
          dailyMap.get(dateStr)!.requests++;
        }
      });

      notices.forEach(n => {
        const dateStr = new Date(n.created_at).toISOString().split('T')[0];
        if (dailyMap.has(dateStr)) {
          dailyMap.get(dateStr)!.notices++;
        }
      });

      responses.forEach(r => {
        const dateStr = new Date(r.created_at).toISOString().split('T')[0];
        if (dailyMap.has(dateStr)) {
          dailyMap.get(dateStr)!.responses++;
        }
      });

      setTimeSeriesData(Array.from(dailyMap.values()));

      // Department breakdown
      const deptMap = new Map<string, DepartmentData>();
      deptList.forEach(dept => {
        deptMap.set(dept, { department: dept, interactions: 0, gaps: 0, requests: 0, responses: 0 });
      });

      unanswered.forEach(q => {
        const dept = q.department || 'Other';
        if (deptMap.has(dept)) {
          deptMap.get(dept)!.gaps++;
          deptMap.get(dept)!.interactions++;
        }
      });

      requests.forEach(r => {
        const dept = r.department || 'Other';
        if (deptMap.has(dept)) {
          deptMap.get(dept)!.requests++;
          deptMap.get(dept)!.interactions++;
        }
      });

      responses.forEach(r => {
        const dept = r.department || 'Other';
        if (deptMap.has(dept)) {
          deptMap.get(dept)!.responses++;
        }
      });

      setDepartmentData(
        Array.from(deptMap.values())
          .filter(d => d.interactions > 0 || d.gaps > 0 || d.requests > 0)
          .sort((a, b) => b.interactions - a.interactions)
      );

      // Top unanswered questions
      const questionMap = new Map<string, { count: number; department: string }>();
      unanswered.forEach(q => {
        const key = q.question.toLowerCase().trim();
        if (questionMap.has(key)) {
          questionMap.get(key)!.count++;
        } else {
          questionMap.set(key, { count: 1, department: q.department || 'Unknown' });
        }
      });

      setTopQuestions(
        Array.from(questionMap.entries())
          .map(([question, data]) => ({ question, ...data }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      );

      // Request status breakdown
      const statusMap = new Map<string, number>();
      ['new', 'pending', 'in_progress', 'resolved', 'rejected'].forEach(s => statusMap.set(s, 0));
      requests.forEach(r => {
        const status = r.status || 'new';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      setRequestStatusData(
        Array.from(statusMap.entries())
          .map(([status, count]) => ({ status: status.replace('_', ' ').toUpperCase(), count }))
          .filter(d => d.count > 0)
      );

      // Questionnaire stats
      const questionnaires = questionnairesResult.data || [];
      const qStats = questionnaires.map(q => {
        const qResponses = responses.filter(r => r.questionnaire_id === q.id);
        // Mock alignment score (in real app, calculate from responses)
        const alignment = qResponses.length > 0 ? Math.round(70 + Math.random() * 25) : 0;
        return {
          title: q.title,
          responses: qResponses.length,
          alignment,
        };
      }).filter(q => q.responses > 0);

      setQuestionnaireStats(qStats);

      // Notice stats
      const nStats = notices.map(n => {
        const nAcks = acknowledgments.filter(a => a.notice_id === n.id);
        // Estimate sent count (mock)
        const sent = 50 + Math.floor(Math.random() * 100);
        const ackCount = nAcks.length || Math.floor(sent * (0.6 + Math.random() * 0.35));
        return {
          title: n.title,
          sent,
          acknowledged: ackCount,
          rate: Math.round((ackCount / sent) * 100),
        };
      });

      setNoticeStats(nStats);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [user, getDateRange, department]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    loading,
    metrics,
    timeSeriesData,
    departmentData,
    topQuestions,
    requestStatusData,
    questionnaireStats,
    noticeStats,
    departments,
    refresh: fetchAnalytics,
  };
}
