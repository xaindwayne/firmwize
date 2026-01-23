import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Bell,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  AlertCircle,
  Info,
  Users,
  Building2,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface PriorityNotice {
  id: string;
  user_id: string;
  title: string;
  content: string;
  target_type: 'company' | 'department';
  target_departments: string[] | null;
  requires_acknowledgment: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

const priorityConfig = {
  low: { label: 'Low', icon: Info, className: 'bg-muted text-muted-foreground' },
  normal: { label: 'Normal', icon: Bell, className: 'bg-accent/10 text-accent' },
  high: { label: 'High', icon: AlertCircle, className: 'bg-warning/10 text-warning' },
  urgent: { label: 'Urgent', icon: AlertTriangle, className: 'bg-destructive/10 text-destructive' },
};

const DEPARTMENTS = ['HR', 'Finance', 'Operations', 'Sales', 'Compliance', 'Legal', 'Other'];

export default function PriorityNotices() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<PriorityNotice | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<string>('normal');
  const [targetType, setTargetType] = useState<string>('company');
  const [targetDepartments, setTargetDepartments] = useState<string[]>([]);
  const [requiresAcknowledgment, setRequiresAcknowledgment] = useState(false);

  // Fetch notices
  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['priority-notices', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('priority_notices')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PriorityNotice[];
    },
    enabled: !!user,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      priority: string;
      target_type: string;
      target_departments: string[] | null;
      requires_acknowledgment: boolean;
    }) => {
      if (editingNotice) {
        const { error } = await supabase
          .from('priority_notices')
          .update(data)
          .eq('id', editingNotice.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('priority_notices')
          .insert({ ...data, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priority-notices'] });
      toast.success(editingNotice ? 'Notice updated' : 'Notice created');
      resetForm();
      setDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to save notice');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('priority_notices')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priority-notices'] });
      toast.success('Notice deleted');
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('priority_notices')
        .update({ active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priority-notices'] });
    },
  });

  // Fetch acknowledgment stats
  const { data: ackStats = {} } = useQuery({
    queryKey: ['notice-ack-stats', notices.map((n) => n.id)],
    queryFn: async () => {
      const stats: Record<string, number> = {};
      for (const notice of notices.filter((n) => n.requires_acknowledgment)) {
        const { count } = await supabase
          .from('notice_acknowledgments')
          .select('*', { count: 'exact', head: true })
          .eq('notice_id', notice.id);
        stats[notice.id] = count || 0;
      }
      return stats;
    },
    enabled: notices.length > 0,
  });

  const resetForm = () => {
    setTitle('');
    setContent('');
    setPriority('normal');
    setTargetType('company');
    setTargetDepartments([]);
    setRequiresAcknowledgment(false);
    setEditingNotice(null);
  };

  const handleEdit = (notice: PriorityNotice) => {
    setEditingNotice(notice);
    setTitle(notice.title);
    setContent(notice.content);
    setPriority(notice.priority);
    setTargetType(notice.target_type);
    setTargetDepartments(notice.target_departments || []);
    setRequiresAcknowledgment(notice.requires_acknowledgment);
    setDialogOpen(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      title,
      content,
      priority: priority as PriorityNotice['priority'],
      target_type: targetType as PriorityNotice['target_type'],
      target_departments: targetType === 'department' ? targetDepartments : null,
      requires_acknowledgment: requiresAcknowledgment,
    });
  };

  const stats = {
    total: notices.length,
    active: notices.filter((n) => n.active).length,
    urgent: notices.filter((n) => n.priority === 'urgent' && n.active).length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Priority Notices</h1>
            <p className="text-muted-foreground">
              Create and manage important announcements for your organization
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90">
                <Plus className="mr-2 h-4 w-4" />
                New Notice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingNotice ? 'Edit Notice' : 'Create Notice'}
                </DialogTitle>
                <DialogDescription>
                  Create an important announcement to deliver in the AI chat
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Notice title"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Notice content..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Target</Label>
                    <Select value={targetType} onValueChange={setTargetType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Entire Company
                          </div>
                        </SelectItem>
                        <SelectItem value="department">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Specific Departments
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {targetType === 'department' && (
                  <div className="space-y-2">
                    <Label>Select Departments</Label>
                    <div className="flex flex-wrap gap-2">
                      {DEPARTMENTS.map((dept) => (
                        <Badge
                          key={dept}
                          variant={targetDepartments.includes(dept) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            if (targetDepartments.includes(dept)) {
                              setTargetDepartments(targetDepartments.filter((d) => d !== dept));
                            } else {
                              setTargetDepartments([...targetDepartments, dept]);
                            }
                          }}
                        >
                          {dept}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label>Require Acknowledgment</Label>
                    <p className="text-sm text-muted-foreground">
                      Users must acknowledge this notice
                    </p>
                  </div>
                  <Switch
                    checked={requiresAcknowledgment}
                    onCheckedChange={setRequiresAcknowledgment}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!title.trim() || !content.trim()}
                  className="bg-accent hover:bg-accent/90"
                >
                  {editingNotice ? 'Update' : 'Create'} Notice
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Notices</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Eye className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Urgent</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.urgent}</div>
            </CardContent>
          </Card>
        </div>

        {/* Notices Table */}
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Notice</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Acknowledgments</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : notices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No notices created yet
                    </TableCell>
                  </TableRow>
                ) : (
                  notices.map((notice) => {
                    const config = priorityConfig[notice.priority];
                    const Icon = config.icon;

                    return (
                      <TableRow key={notice.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{notice.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {notice.content}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={config.className}>
                            <Icon className="mr-1 h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {notice.target_type === 'company' ? (
                              <Badge variant="outline">
                                <Building2 className="mr-1 h-3 w-3" />
                                All
                              </Badge>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {notice.target_departments?.map((dept) => (
                                  <Badge key={dept} variant="outline" className="text-xs">
                                    {dept}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {notice.requires_acknowledgment ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4 text-success" />
                              <span>{ackStats[notice.id] || 0}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={notice.active}
                            onCheckedChange={(active) =>
                              toggleActiveMutation.mutate({ id: notice.id, active })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(notice)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(notice.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}