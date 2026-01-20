import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface LogEntry { id: string; action: string; document_title: string | null; details: string | null; result: string; created_at: string; }

export default function ActivityLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('activity_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100).then(({ data }) => {
      setLogs(data || []);
      setLoading(false);
    });
  }, [user]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-foreground">Activity Log</h1><p className="text-muted-foreground">Track all actions in your knowledge base</p></div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Document</TableHead><TableHead>Details</TableHead><TableHead>Result</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading...</TableCell></TableRow> : logs.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No activity yet</TableCell></TableRow> : logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{format(new Date(log.created_at), 'MMM d, h:mm a')}</TableCell>
                    <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                    <TableCell>{log.document_title || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{log.details || '-'}</TableCell>
                    <TableCell><Badge className={log.result === 'Success' ? 'status-ready' : 'status-failed'}>{log.result}</Badge></TableCell>
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